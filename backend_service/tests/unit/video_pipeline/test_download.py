import json
import os
import pytest
from unittest.mock import patch, MagicMock
from src.video_pipeline.handler_download import lambda_handler

@pytest.fixture
def download_event():
    return {
        'pathParameters': {
            'request_id': '12345-abcde'
        }
    }

@patch('src.video_pipeline.handler_download.S3Client')
@patch('src.video_pipeline.handler_download.DynamoDBClient')
@patch.dict(os.environ, {'S3_OUTPUT_BUCKET': 'output-bucket'})
def test_download_success(mock_ddb, mock_s3, download_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_s3_instance = mock_s3.return_value

    mock_ddb_instance.get_request.return_value = {
        'request_id': '12345-abcde',
        'status': 'completed'
    }

    mock_s3_instance.generate_presigned_url.return_value = 'http://presigned.url/dl.mp4'

    response = lambda_handler(download_event, {})

    assert response['statusCode'] == 302
    assert response['headers']['Location'] == 'http://presigned.url/dl.mp4'

def test_download_missing_request_id():
    response = lambda_handler({'pathParameters': {}}, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'request_id is required'

@patch('src.video_pipeline.handler_download.S3Client')
@patch('src.video_pipeline.handler_download.DynamoDBClient')
def test_download_request_not_found(mock_ddb, mock_s3, download_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.get_request.return_value = None

    response = lambda_handler(download_event, {})

    assert response['statusCode'] == 404
    body = json.loads(response['body'])
    assert body['error'] == 'Request not found'

@patch('src.video_pipeline.handler_download.S3Client')
@patch('src.video_pipeline.handler_download.DynamoDBClient')
def test_download_video_not_ready(mock_ddb, mock_s3, download_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.get_request.return_value = {
        'request_id': '12345-abcde',
        'status': 'processing'
    }

    response = lambda_handler(download_event, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'Video not ready yet'

@patch('src.video_pipeline.handler_download.S3Client')
@patch('src.video_pipeline.handler_download.DynamoDBClient')
def test_download_presigned_url_failed(mock_ddb, mock_s3, download_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_s3_instance = mock_s3.return_value

    mock_ddb_instance.get_request.return_value = {
        'request_id': '12345-abcde',
        'status': 'completed'
    }

    mock_s3_instance.generate_presigned_url.return_value = None

    response = lambda_handler(download_event, {})

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error'] == 'Failed to generate download URL'

@patch('src.video_pipeline.handler_download.DynamoDBClient')
def test_download_internal_error(mock_ddb, download_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.get_request.side_effect = Exception("DB error")

    response = lambda_handler(download_event, {})

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error'] == 'Internal server error'
