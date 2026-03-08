import boto3
import json

client = boto3.client('logs', region_name='us-east-1')

response = client.filter_log_events(
    logGroupName='/aws/sagemaker/Endpoints/hf-text-endpoint',
    limit=50
)

with open('logs.txt', 'w', encoding='utf-8') as f:
    for event in response.get('events', []):
        f.write(event['message'] + '\n')
