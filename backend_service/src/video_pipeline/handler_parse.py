"""
Lambda handler for script parsing.
"""

import json
import os

from video_pipeline.scene_parser import parse_script, select_top_scenes, generate_image_prompt
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
    Handle script parsing request.
    
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
        
        # Download script from S3
        script_bucket = os.environ.get('S3_INPUT_BUCKET')
        script = s3_client.download_script(request_id)
        
        if not script:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(event),
                'body': json.dumps({'error': 'Script not found'})
            }
        
        # Parse script
        scenes = parse_script(script)
        
        # Select top scenes for 15-second preview
        selected_scenes = select_top_scenes(scenes, target_duration=15)
        
        # Generate image prompts for each scene
        for scene in selected_scenes:
            scene['image_prompt'] = generate_image_prompt(scene)
        
        # Store scene data in S3 assets bucket
        assets_bucket = os.environ.get('S3_ASSETS_BUCKET')
        scenes_key = f"scenes/{request_id}/scenes.json"
        s3_client.upload_json(assets_bucket, scenes_key, {'scenes': selected_scenes})
        
        # Update DynamoDB status
        dynamodb_client.update_request_status(
            request_id=request_id,
            status='processing',
            progress_percent=25
        )
        
        # Return success response
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': json.dumps({
                'request_id': request_id,
                'scenes_extracted': len(selected_scenes),
                'status': 'processing'
            })
        }
        
    except Exception as e:
        print(f"Error parsing script: {e}")
        
        # Update DynamoDB with error
        dynamodb_client = DynamoDBClient()
        dynamodb_client.update_request_status(
            request_id=event.get('request_id', 'unknown'),
            status='failed',
            error={'code': 'PARSE_ERROR', 'message': str(e)}
        )
        
        return {
            'statusCode': 500,
            'headers': get_cors_headers(event),
            'body': json.dumps({'error': 'Internal server error'})
        }
