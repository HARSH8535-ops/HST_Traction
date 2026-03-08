import json
import os
import pytest
from unittest.mock import patch, MagicMock
from src.video_pipeline.handler_status import lambda_handler

@pytest.fixture
def status_event():
    return {
        'pathParameters': {
            'request_id': '12345-abcde'
        }
    }

@patch('src.video_pipeline.handler_status.DynamoDBClient')
def test_status_success(mock_ddb, status_event):
    mock_ddb_instance = mock_ddb.return_value

    mock_ddb_instance.get_request.return_value = {
        'request_id': '12345-abcde',
        'status': 'processing',
        'progress_percent': 50
    }

    response = lambda_handler(status_event, {})

    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['request_id'] == '12345-abcde'
    assert body['status'] == 'processing'
    assert body['progress_percent'] == 50

def test_status_missing_request_id():
    response = lambda_handler({'pathParameters': {}}, {})

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error'] == 'request_id is required'

@patch('src.video_pipeline.handler_status.DynamoDBClient')
def test_status_not_found(mock_ddb, status_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.get_request.return_value = None

    response = lambda_handler(status_event, {})

    assert response['statusCode'] == 404
    body = json.loads(response['body'])
    assert body['error'] == 'Request not found'

@patch('src.video_pipeline.handler_status.DynamoDBClient')
def test_status_completed_with_video(mock_ddb, status_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.get_request.return_value = {
        'request_id': '12345-abcde',
        'status': 'completed',
        'progress_percent': 100,
        'video_url': 'http://video.url'
    }

    response = lambda_handler(status_event, {})

    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['status'] == 'completed'
    assert body['video_url'] == 'http://video.url'

@patch('src.video_pipeline.handler_status.DynamoDBClient')
def test_status_failed_with_error(mock_ddb, status_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.get_request.return_value = {
        'request_id': '12345-abcde',
        'status': 'failed',
        'progress_percent': 50,
        'error': {'code': 'TEST_ERR', 'message': 'Failed'}
    }

    response = lambda_handler(status_event, {})

    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['status'] == 'failed'
    assert body['error'] == {'code': 'TEST_ERR', 'message': 'Failed'}

@patch('src.video_pipeline.handler_status.DynamoDBClient')
def test_status_internal_error(mock_ddb, status_event):
    mock_ddb_instance = mock_ddb.return_value
    mock_ddb_instance.get_request.side_effect = Exception("DB error")

    response = lambda_handler(status_event, {})

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error'] == 'Internal server error'
