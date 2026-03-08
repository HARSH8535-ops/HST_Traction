import json
import os
import pytest
from unittest.mock import patch, MagicMock
from src.video_pipeline.handler_generate import lambda_handler

@pytest.fixture
def generate_event():
    return {
        'request_id': '12345-abcde',
        'aspect_ratio': '16:9'
    }

@patch('src.video_pipeline.handler_generate.S3Client')
@patch('src.video_pipeline.handler_generate.DynamoDBClient')
@patch('src.video_pipeline.handler_generate.HuggingFaceClient')
@patch.dict(os.environ, {'S3_ASSETS_BUCKET': 'assets-bucket'})
def test_generate_success(mock_hf, mock_ddb, mock_s3, generate_event):
    mock_s3_instance = mock_s3.return_value
    mock_ddb_instance = mock_ddb.return_value
    mock_hf_instance = mock_hf.return_value

    mock_s3_instance.download_json.return_value = {
        'scenes': [
            {'image_prompt': 'Prompt 1'},
            {'image_prompt': 'Prompt 2'}
        ]
    }

    mock_hf_instance.generate_image.return_value = b'fake_image_bytes'

    response = lambda_handler(generate_event, {})

    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['request_id'] == '12345-abcde'
    assert body['images_generated'] == 2
    assert body['status'] == 'processing'

    # 2 uploads expected
    assert mock_s3_instance.s3_client.put_object.call_count == 2

    # DynamoDB should be updated
    mock_ddb_instance.update_request_status.assert_called_once_with(
        request_id='12345-abcde',
        status='processing',
        progress_percent=100  # 50 + (2*50 // 2)
    )

def test_generate_missing_request_id():
    response = lambda_handler({}, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'request_id is required'

@patch('src.video_pipeline.handler_generate.S3Client')
@patch('src.video_pipeline.handler_generate.DynamoDBClient')
@patch('src.video_pipeline.handler_generate.HuggingFaceClient')
def test_generate_scenes_not_found(mock_hf, mock_ddb, mock_s3, generate_event):
    mock_s3_instance = mock_s3.return_value
    mock_s3_instance.download_json.return_value = None

    response = lambda_handler(generate_event, {})

    assert response['statusCode'] == 404
    body = json.loads(response['body'])
    assert body['error'] == 'Scene data not found'

@patch('src.video_pipeline.handler_generate.S3Client')
@patch('src.video_pipeline.handler_generate.DynamoDBClient')
@patch('src.video_pipeline.handler_generate.HuggingFaceClient')
def test_generate_internal_error(mock_hf, mock_ddb, mock_s3, generate_event):
    mock_s3_instance = mock_s3.return_value
    mock_ddb_instance = mock_ddb.return_value

    mock_s3_instance.download_json.side_effect = Exception("S3 failed")

    response = lambda_handler(generate_event, {})

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error'] == 'Internal server error'

    mock_ddb_instance.update_request_status.assert_called_with(
        request_id='12345-abcde',
        status='failed',
        error={'code': 'GENERATE_ERROR', 'message': 'S3 failed'}
    )
