"""
Lambda handler for video rendering.
"""

import json
import os

from video_pipeline.video_assembler import assemble_video, add_transitions, encode_video
from shared.s3_client import S3Client
from shared.dynamodb import DynamoDBClient


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
    Handle video rendering request.
    
    :param event: Lambda event
    :param context: Lambda context
    :return: Response dictionary
    """
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
        
        # Get aspect ratio from event
        aspect_ratio = event.get('aspect_ratio', '16:9')
        
        # List images in S3 assets bucket
        assets_bucket = os.environ.get('S3_ASSETS_BUCKET')
        images_prefix = f"images/{request_id}/"
        
        # Get list of images
        response = s3_client.s3_client.list_objects_v2(
            Bucket=assets_bucket,
            Prefix=images_prefix
        )
        
        if 'Contents' not in response:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(event),
                'body': json.dumps({'error': 'No images found'})
            }
        
        # Download images locally (simplified)
        image_files = []
        for obj in response['Contents']:  # Process all images
            image_key = obj['Key']
            local_path = f"/tmp/{request_id}_{os.path.basename(image_key)}"
            
            s3_client.s3_client.download_file(assets_bucket, image_key, local_path)
            image_files.append(local_path)
        
        if not image_files:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(event),
                'body': json.dumps({'error': 'No images found'})
            }
        
        # Assemble video
        video_path = assemble_video(image_files, aspect_ratio)
        
        # Add transitions
        video_path = add_transitions(video_path)
        
        # Encode video
        video_path = encode_video(video_path, aspect_ratio)
        
        # Upload final video to S3 output bucket
        output_bucket = os.environ.get('S3_OUTPUT_BUCKET')
        output_key = f"videos/{request_id}/preview.mp4"
        
        s3_client.s3_client.upload_file(
            video_path,
            output_bucket,
            output_key
        )
        
        # Generate presigned URL for video
        video_url = s3_client.generate_presigned_url(output_bucket, output_key)
        
        # Update DynamoDB status
        dynamodb_client.update_request_status(
            request_id=request_id,
            status='completed',
            progress_percent=100,
            video_url=video_url
        )
        
        # Return success response
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': json.dumps({
                'request_id': request_id,
                'video_url': video_url,
                'status': 'completed'
            })
        }
        
    except Exception as e:
        print(f"Error rendering video: {e}")
        
        # Update DynamoDB with error
        dynamodb_client = DynamoDBClient()
        dynamodb_client.update_request_status(
            request_id=event.get('request_id', 'unknown'),
            status='failed',
            error={'code': 'RENDER_ERROR', 'message': str(e)}
        )
        
        return {
            'statusCode': 500,
            'headers': get_cors_headers(event),
            'body': json.dumps({'error': 'Internal server error'})
        }
