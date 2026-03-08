import json
import os
import pytest
from unittest.mock import patch, MagicMock
from src.video_pipeline.handler_render import lambda_handler

@pytest.fixture
def render_event():
    return {
        'request_id': '12345-abcde',
        'aspect_ratio': '16:9'
    }

@patch('src.video_pipeline.handler_render.S3Client')
@patch('src.video_pipeline.handler_render.DynamoDBClient')
@patch('src.video_pipeline.handler_render.assemble_video')
@patch('src.video_pipeline.handler_render.add_transitions')
@patch('src.video_pipeline.handler_render.encode_video')
@patch.dict(os.environ, {'S3_ASSETS_BUCKET': 'assets-bucket', 'S3_OUTPUT_BUCKET': 'output-bucket'})
def test_render_success(mock_encode, mock_transitions, mock_assemble, mock_ddb, mock_s3, render_event):
    mock_s3_instance = mock_s3.return_value
    mock_ddb_instance = mock_ddb.return_value

    mock_s3_instance.s3_client.list_objects_v2.return_value = {
        'Contents': [
            {'Key': 'images/12345-abcde/scene-0.png'},
            {'Key': 'images/12345-abcde/scene-1.png'}
        ]
    }

    mock_assemble.return_value = '/tmp/assembled.mp4'
    mock_transitions.return_value = '/tmp/with_transitions.mp4'
    mock_encode.return_value = '/tmp/final.mp4'

    mock_s3_instance.generate_presigned_url.return_value = 'http://presigned.url/video.mp4'

    response = lambda_handler(render_event, {})

    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['request_id'] == '12345-abcde'
    assert body['video_url'] == 'http://presigned.url/video.mp4'
    assert body['status'] == 'completed'

    # 2 downloads
    assert mock_s3_instance.s3_client.download_file.call_count == 2

    # 1 upload
    mock_s3_instance.s3_client.upload_file.assert_called_once_with(
        '/tmp/final.mp4',
        'output-bucket',
        'videos/12345-abcde/preview.mp4'
    )

    mock_ddb_instance.update_request_status.assert_called_once_with(
        request_id='12345-abcde',
        status='completed',
        progress_percent=100,
        video_url='http://presigned.url/video.mp4'
    )

def test_render_missing_request_id():
    response = lambda_handler({}, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'request_id is required'

@patch('src.video_pipeline.handler_render.S3Client')
@patch('src.video_pipeline.handler_render.DynamoDBClient')
def test_render_no_images_found(mock_ddb, mock_s3, render_event):
    mock_s3_instance = mock_s3.return_value
    mock_s3_instance.s3_client.list_objects_v2.return_value = {} # Missing 'Contents'

    response = lambda_handler(render_event, {})

    assert response['statusCode'] == 404
    body = json.loads(response['body'])
    assert body['error'] == 'No images found'

@patch('src.video_pipeline.handler_render.S3Client')
@patch('src.video_pipeline.handler_render.DynamoDBClient')
def test_render_internal_error(mock_ddb, mock_s3, render_event):
    mock_s3_instance = mock_s3.return_value
    mock_s3_instance.s3_client.list_objects_v2.side_effect = Exception("S3 list failed")

    response = lambda_handler(render_event, {})

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error'] == 'Internal server error'

    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.update_request_status.assert_called_with(
        request_id='12345-abcde',
        status='failed',
        error={'code': 'RENDER_ERROR', 'message': 'S3 list failed'}
    )
