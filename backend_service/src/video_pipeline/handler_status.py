"""
Lambda handler for status checks.
"""

import json
import os

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
    Handle status check request.
    
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
        
        # Initialize DynamoDB client
        dynamodb_client = DynamoDBClient()
        
        # Get request record
        request_record = dynamodb_client.get_request(request_id)
        
        if not request_record:
            headers = {'Content-Type': 'application/json'}
            headers.update(get_cors_headers(event))
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Request not found'})
            }
        
        # Build response
        response = {
            'request_id': request_record.get('request_id'),
            'status': request_record.get('status'),
            'progress_percent': request_record.get('progress_percent', 0)
        }
        
        # Add video_url if completed
        if request_record.get('status') == 'completed':
            response['video_url'] = request_record.get('video_url')
        
        # Add error details if failed
        if request_record.get('status') == 'failed':
            error = request_record.get('error')
            if error:
                response['error'] = error
        
        # Return 200 response
        headers = {'Content-Type': 'application/json'}
        headers.update(get_cors_headers(event))
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response)
        }
        
    except Exception as e:
        print(f"Error checking status: {e}")
        headers = {'Content-Type': 'application/json'}
        headers.update(get_cors_headers(event))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
