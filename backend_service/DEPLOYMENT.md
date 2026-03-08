# SageMaker Endpoint Deployment Guide

## Prerequisites

1. **AWS CLI** configured with credentials (`aws configure`)
2. **AWS CDK CLI** installed (`npm install -g aws-cdk`)
3. **Python 3.12+** with pip
4. **Service Quotas** — your account needs:
   - ≥ 5 serverless SageMaker endpoints
   - ≥ 10 total serverless concurrency
   - Check: `aws service-quotas list-service-quotas --service-code sagemaker --query "Quotas[?contains(QuotaName, 'serverless')].[QuotaName, Value]" --output table`

## Quick Deploy

```bash
# 1. Install dependencies
cd backend_service
pip install -r requirements.txt

# 2. Synthesize CloudFormation template
npx cdk synth BackendStack

# 3. Deploy (will create 2 SageMaker endpoints)
npx cdk deploy BackendStack --require-approval never

# 4. Wait ~2-5 minutes for endpoints to reach InService

# 5. Verify endpoints
aws sagemaker describe-endpoint --endpoint-name tractionpal-text-endpoint --query EndpointStatus
aws sagemaker describe-endpoint --endpoint-name tractionpal-audio-endpoint --query EndpointStatus
```

## Deployed Models

| Endpoint | Model | Task | Memory | Max Concurrency |
|----------|-------|------|--------|-----------------|
| `tractionpal-text-endpoint` | google/flan-t5-base | text2text-generation | 3 GB | 2 |
| `tractionpal-audio-endpoint` | openai/whisper-base | automatic-speech-recognition | 3 GB | 2 |

## Environment Variables

Set automatically by CDK on the Lambda function:

| Variable | Description |
|----------|-------------|
| `SAGEMAKER_TEXT_ENDPOINT_NAME` | Text generation endpoint name |
| `SAGEMAKER_AUDIO_ENDPOINT_NAME` | Audio transcription endpoint name |

## Frontend Environment Variables

If you are deploying the frontend, you may need to set these in your hosting provider (Vercel, Amplify, etc.) or a `.env` file:

| Variable | Description | Default (Hardcoded) |
|----------|-------------|---------|
| `VITE_API_URL` | The API Gateway URL | `https://u5e0gqiwnj.execute-api.us-east-1.amazonaws.com/prod` |
| `VITE_VIDEO_API_KEY` | API Key for video generation | (None) |

> [!TIP]
> The frontend already has a hardcoded fallback for `VITE_API_URL` that matches the current deployment. No manual update is required unless you rotate the API Gateway.

## Cost Estimates

**Serverless inference** — pay only when invoked, no idle cost.

| Component | Cost Basis |
|-----------|-----------|
| Text endpoint | ~$0.0001/second of compute |
| Audio endpoint | ~$0.0001/second of compute |
| Total idle cost | **$0/month** (serverless scales to zero) |

Typical MVP usage (< 100 requests/day): **< $5/month**

> **Note**: For GPU-backed endpoints (Mistral-7B, SDXL, Whisper-large-v3), request a quota increase for `ml.g5.xlarge` and `ml.g5.2xlarge` endpoint usage. GPU endpoints cost ~$2,541/month but offer significantly better performance and model quality.

## Running Tests

```bash
# Unit tests (no AWS credentials needed)
python -m pytest tests/unit/test_backend_stack.py -v

# Integration tests (requires deployed stack)
python -m pytest tests/integration/test_sagemaker_endpoints.py -v

# E2E test (requires API Gateway URL)
python test_endpoints.py https://YOUR_API_URL.execute-api.us-east-1.amazonaws.com/prod/
```

## Troubleshooting

### Endpoint stuck in "Creating" status
- Serverless endpoints typically become InService within 2-5 minutes
- Check CloudFormation events: `aws cloudformation describe-stack-events --stack-name BackendStack --query "StackEvents[?ResourceStatus=='CREATE_FAILED']"`

### Model download fails
- Hugging Face Hub might be rate-limited. Wait and retry.
- Verify the model ID exists: `pip install huggingface_hub && huggingface-cli model-info google/flan-t5-base`

### Lambda timeout (30s exceeded)
- The stack sets Lambda timeout to 60s. If serverless cold starts exceed this, increase via `timeout=Duration.seconds(90)` in `backend_stack.py`

### Service quota errors
- Request increases at: https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas
- Key quotas: "Maximum number of serverless endpoints" and "Maximum total concurrency"

### Image generation returns error
- CPU-based image generation is memory-intensive. If the 6 GB serverless config fails, the model may be too large.
- Consider requesting GPU quota (ml.g5.xlarge) for production image generation.

### IAM permission errors
- Lambda needs `sagemaker:InvokeEndpoint` — already configured in CDK
- SageMaker needs `AmazonSageMakerFullAccess` — already configured in CDK

## Rollback

```bash
# Destroy all resources (endpoints, alarms, etc.)
npx cdk destroy BackendStack

# Or delete specific endpoints manually:
aws sagemaker delete-endpoint --endpoint-name tractionpal-text-endpoint
aws sagemaker delete-endpoint --endpoint-name tractionpal-image-endpoint
aws sagemaker delete-endpoint --endpoint-name tractionpal-audio-endpoint
```

## Post-Deployment Checklist

- [ ] All 2 endpoints show "InService" status
- [ ] Lambda environment variables point to correct endpoint names
- [ ] `/api/health` returns 200
- [ ] Text generation returns results via `/api/bedrock`
- [ ] Audio transcription returns text via `/api/bedrock/audio`
- [ ] CloudWatch alarms visible in console (4 alarms)
- [ ] Clean up old manual endpoints (`hf-text-endpoint`, `hf-audio-endpoint`) if present
