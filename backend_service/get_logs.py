import boto3
import json
import sys

# Windows console encoding hack
sys.stdout.reconfigure(encoding='utf-8')

logs = boto3.client('logs', region_name='us-east-1')
log_group = '/aws/sagemaker/Endpoints/tractionpal-audio-endpoint'

resp = logs.filter_log_events(
    logGroupName=log_group,
    limit=100
)

for event in resp.get('events', []):
    print(event['message'].strip())
