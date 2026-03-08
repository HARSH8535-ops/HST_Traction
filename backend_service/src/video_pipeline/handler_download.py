"""
Lambda handler for video download.
"""

import json
import os

from shared.dynamodb import DynamoDBClient
from shared.s3_client import S3Client


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
    Handle video download request.
    
    :param event: Lambda event
    :param context: Lambda context
    :return: Response dictionary
    """
    try:
        # Extract request_id from path parameters
        path_params = event.get('pathParameters', {})
        request_id = path_params.get('request_id')
        
        if not request_id:
            headers = {'Content-Type': 'application/json'}
            headers.update(get_cors_headers(event))
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'request_id is required'})
            }
        
        # Initialize clients
        dynamodb_client = DynamoDBClient()
        s3_client = S3Client()
        
        # Verify request exists
        request_record = dynamodb_client.get_request(request_id)
        
        if not request_record:
            headers = {'Content-Type': 'application/json'}
            headers.update(get_cors_headers(event))
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Request not found'})
            }
        
        # Check if video is ready
        if request_record.get('status') != 'completed':
            headers = {'Content-Type': 'application/json'}
            headers.update(get_cors_headers(event))
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Video not ready yet'})
            }
        
        # Generate presigned URL for video
        output_bucket = os.environ.get('S3_OUTPUT_BUCKET')
        video_key = f"videos/{request_id}/preview.mp4"
        
        presigned_url = s3_client.generate_presigned_url(output_bucket, video_key, expiry=900)  # 15 minutes
        
        if not presigned_url:
            headers = {'Content-Type': 'application/json'}
            headers.update(get_cors_headers(event))
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'Failed to generate download URL'})
            }
        
        # Return 302 redirect to presigned URL
        headers = {'Location': presigned_url}
        headers.update(get_cors_headers(event))
        return {
            'statusCode': 302,
            'headers': headers,
            'body': ''
        }
        
    except Exception as e:
        print(f"Error generating download URL: {e}")
        headers = {'Content-Type': 'application/json'}
        headers.update(get_cors_headers(event))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
