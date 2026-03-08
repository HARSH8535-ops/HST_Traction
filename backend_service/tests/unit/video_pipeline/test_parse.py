import json
import os
import pytest
from unittest.mock import patch, MagicMock
from src.video_pipeline.handler_parse import lambda_handler

@pytest.fixture
def parse_event():
    return {
        'request_id': '12345-abcde'
    }

@patch('src.video_pipeline.handler_parse.S3Client')
@patch('src.video_pipeline.handler_parse.DynamoDBClient')
@patch('src.video_pipeline.handler_parse.parse_script')
@patch('src.video_pipeline.handler_parse.select_top_scenes')
@patch('src.video_pipeline.handler_parse.generate_image_prompt')
@patch.dict(os.environ, {'S3_INPUT_BUCKET': 'input-bucket', 'S3_ASSETS_BUCKET': 'assets-bucket'})
def test_parse_success(mock_gen_prompt, mock_select_scenes, mock_parse_script, mock_ddb, mock_s3, parse_event):
    mock_s3_instance = mock_s3.return_value
    mock_ddb_instance = mock_ddb.return_value

    mock_s3_instance.download_script.return_value = "Scene 1: Hello World"
    mock_parse_script.return_value = [{'text': 'Hello World'}]
    mock_select_scenes.return_value = [{'text': 'Hello World'}]
    mock_gen_prompt.return_value = "A man saying Hello World"

    response = lambda_handler(parse_event, {})

    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['request_id'] == '12345-abcde'
    assert body['scenes_extracted'] == 1
    assert body['status'] == 'processing'

    mock_s3_instance.upload_json.assert_called_once_with(
        'assets-bucket',
        'scenes/12345-abcde/scenes.json',
        {'scenes': [{'text': 'Hello World', 'image_prompt': 'A man saying Hello World'}]}
    )
    mock_ddb_instance.update_request_status.assert_called_once_with(
        request_id='12345-abcde',
        status='processing',
        progress_percent=25
    )

def test_parse_missing_request_id():
    response = lambda_handler({}, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'request_id is required'

@patch('src.video_pipeline.handler_parse.S3Client')
@patch('src.video_pipeline.handler_parse.DynamoDBClient')
def test_parse_script_not_found(mock_ddb, mock_s3, parse_event):
    mock_s3_instance = mock_s3.return_value
    mock_s3_instance.download_script.return_value = None

    response = lambda_handler(parse_event, {})

    assert response['statusCode'] == 404
    body = json.loads(response['body'])
    assert body['error'] == 'Script not found'

@patch('src.video_pipeline.handler_parse.S3Client')
@patch('src.video_pipeline.handler_parse.DynamoDBClient')
@patch('src.video_pipeline.handler_parse.parse_script')
def test_parse_internal_error(mock_parse_script, mock_ddb, mock_s3, parse_event):
    mock_s3_instance = mock_s3.return_value
    mock_s3_instance.download_script.return_value = "Scene 1: Hello"

    # Simulate an error during parsing
    mock_parse_script.side_effect = Exception("Parsing failed")

    response = lambda_handler(parse_event, {})

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error'] == 'Internal server error'

    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.update_request_status.assert_called_with(
        request_id='12345-abcde',
        status='failed',
        error={'code': 'PARSE_ERROR', 'message': 'Parsing failed'}
    )
