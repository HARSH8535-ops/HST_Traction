import json
import os
import pytest
from unittest.mock import patch, MagicMock
from src.video_pipeline.handler_submit import lambda_handler

@pytest.fixture
def submit_event():
    return {
        'body': json.dumps({
            'script': 'This is a test script.',
            'options': {'aspect_ratio': '16:9'}
        }),
        'headers': {'origin': 'http://localhost:3000'}
    }

@patch('src.video_pipeline.handler_submit.S3Client')
@patch('src.video_pipeline.handler_submit.DynamoDBClient')
@patch('src.video_pipeline.handler_submit.validate_request')
@patch.dict(os.environ, {'S3_INPUT_BUCKET': 'test-input-bucket'})
def test_submit_success(mock_validate, mock_ddb, mock_s3, submit_event):
    mock_validate.return_value = (True, None)

    mock_s3_instance = mock_s3.return_value
    mock_ddb_instance = mock_ddb.return_value

    response = lambda_handler(submit_event, {})

    assert response['statusCode'] == 202
    body = json.loads(response['body'])
    assert 'request_id' in body
    assert body['status'] == 'pending'

    request_id = body['request_id']
    mock_s3_instance.upload_script.assert_called_once_with(request_id, 'This is a test script.')
    mock_ddb_instance.create_request_record.assert_called_once_with(
        request_id=request_id,
        script_length=len('This is a test script.'),
        options={'aspect_ratio': '16:9'}
    )

@patch('src.video_pipeline.handler_submit.validate_request')
def test_submit_validation_failure(mock_validate, submit_event):
    mock_validate.return_value = (False, {'error': 'Invalid script'})

    response = lambda_handler(submit_event, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'Invalid script'

def test_submit_invalid_json():
    event = {'body': 'invalid-json'}
    response = lambda_handler(event, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'Invalid JSON in request body'

@patch('src.video_pipeline.handler_submit.validate_request')
def test_submit_internal_error(mock_validate, submit_event):
    mock_validate.side_effect = Exception("Some unknown error")

    response = lambda_handler(submit_event, {})

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error'] == 'Internal server error'
