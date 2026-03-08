"""
Lambda handler for script submission.
"""

import json
import os
import uuid

from .validation import validate_request
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
    Handle script submission request.
    
    :param event: Lambda event
    :param context: Lambda context
    :return: Response dictionary
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate request
        is_valid, error_response = validate_request(body)
        if not is_valid:
            headers = {'Content-Type': 'application/json'}
            headers.update(get_cors_headers(event))
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps(error_response)
            }
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Extract script and options
        script = body['script']
        options = body.get('options', {})
        
        # Initialize clients
        s3_client = S3Client()
        dynamodb_client = DynamoDBClient()
        
        # Store script in S3
        script_bucket = os.environ.get('S3_INPUT_BUCKET')
        s3_client.upload_script(request_id, script)
        
        # Create DynamoDB record
        dynamodb_client.create_request_record(
            request_id=request_id,
            script_length=len(script),
            options=options
        )
        
        # Return 202 response
        status_url = f"/api/v1/preview/status/{request_id}"
        headers = {'Content-Type': 'application/json'}
        headers.update(get_cors_headers(event))
        return {
            'statusCode': 202,
            'headers': headers,
            'body': json.dumps({
                'request_id': request_id,
                'status': 'pending',
                'estimated_time_seconds': 120,
                'status_url': status_url
            })
        }
        
    except json.JSONDecodeError:
        headers = {'Content-Type': 'application/json'}
        headers.update(get_cors_headers(event))
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        print(f"Error processing request: {e}")
        headers = {'Content-Type': 'application/json'}
        headers.update(get_cors_headers(event))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
