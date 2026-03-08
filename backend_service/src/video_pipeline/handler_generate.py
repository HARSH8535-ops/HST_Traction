"""
Lambda handler for image generation.
"""

import json
import os
import concurrent.futures

from video_pipeline.hf_client import HuggingFaceClient
from shared.s3_client import S3Client
from shared.dynamodb import DynamoDBClient


def generate_and_upload(hf_client, s3_client, bucket, key, aspect_ratio, image_prompt):
    # Try to generate image with HuggingFace
    image_bytes = hf_client.generate_image(image_prompt, aspect_ratio)

    if image_bytes is None:
        # Fallback to placeholder image
        image_bytes = hf_client.generate_placeholder_image(
            text=image_prompt[:50],
            width=1920 if aspect_ratio == '16:9' else 1080,
            height=1080 if aspect_ratio == '16:9' else 1920
        )

    if image_bytes:
        s3_client.s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=image_bytes,
            ContentType='image/png'
        )
        return True
    return False

def get_cors_headers(event):
    import os
    origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin', '')
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')
    allowed_origins = [o.strip().rstrip('/') for o in allowed_origins if o.strip()]

    clean_origin = origin.rstrip('/')

    if clean_origin in allowed_origins:
        return {"Access-Control-Allow-Origin": origin}
    return {"Access-Control-Allow-Origin": allowed_origins[0] if allowed_origins else '*'}
def lambda_handler(event: dict, context: dict) -> dict:
    """
    Handle image generation request.
    
    :param event: Lambda event
    :param context: Lambda context
    :return: Response dictionary
    """
    # Initialize dynamodb_client here so it's available in the except block if needed
    dynamodb_client = None

    try:
        # Extract request_id from event
        request_id = event.get('request_id')
        if not request_id:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(event),
                'body': json.dumps({'error': 'request_id is required'})
            }
        
        # Initialize clients
        s3_client = S3Client()
        dynamodb_client = DynamoDBClient()
        hf_client = HuggingFaceClient()
        
        # Download scene data from S3
        assets_bucket = os.environ.get('S3_ASSETS_BUCKET')
        scenes_key = f"scenes/{request_id}/scenes.json"
        scenes_data = s3_client.download_json(assets_bucket, scenes_key)
        
        if not scenes_data or 'scenes' not in scenes_data:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(event),
                'body': json.dumps({'error': 'Scene data not found'})
            }
        
        scenes = scenes_data['scenes']
        images_generated = 0
        
        upload_futures = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            # Generate image for each scene
            for scene in scenes:
                image_prompt = scene.get('image_prompt', '')
                aspect_ratio = event.get('aspect_ratio', '16:9')

                # Prepare image key
                image_key = f"images/{request_id}/scene-{images_generated}.png"

                # Submit task to generate and upload
                future = executor.submit(
                    generate_and_upload,
                    hf_client,
                    s3_client,
                    assets_bucket,
                    image_key,
                    aspect_ratio,
                    image_prompt
                )
                upload_futures.append(future)
                images_generated += 1
            
            # Wait for all uploads to complete
            concurrent.futures.wait(upload_futures)
            
            # Check for exceptions
            for future in upload_futures:
                future.result()  # This will raise any exception caught during execution
        
        # Update DynamoDB progress
        progress_percent = 50 + (images_generated * 50 // len(scenes)) if scenes else 50
        dynamodb_client.update_request_status(
            request_id=request_id,
            status='processing',
            progress_percent=progress_percent
        )
        
        # Return success response
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': json.dumps({
                'request_id': request_id,
                'images_generated': images_generated,
                'status': 'processing'
            })
        }
        
    except Exception as e:
        print(f"Error generating images: {e}")
        
        # Update DynamoDB with error
        if dynamodb_client is None:
            dynamodb_client = DynamoDBClient()

        dynamodb_client.update_request_status(
            request_id=event.get('request_id', 'unknown'),
            status='failed',
            error={'code': 'GENERATE_ERROR', 'message': str(e)}
        )
        
        return {
            'statusCode': 500,
            'headers': get_cors_headers(event),
            'body': json.dumps({'error': 'Internal server error'})
        }
