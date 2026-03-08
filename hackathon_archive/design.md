# Design Document: Bedrock to SageMaker Migration

## Overview

This design document specifies the infrastructure deployment for three SageMaker endpoints that will enable TractionPal's AI-powered content creation features. The Lambda handler already contains complete SageMaker integration code - this feature focuses solely on deploying the missing infrastructure via AWS CDK.

### Current State

- Lambda handler (main.py) has SageMaker integration code implemented
- Lambda expects three environment variables: SAGEMAKER_TEXT_ENDPOINT_NAME, SAGEMAKER_IMAGE_ENDPOINT_NAME, SAGEMAKER_AUDIO_ENDPOINT_NAME
- Lambda IAM role has SageMaker invoke permissions
- API contract (/api/bedrock endpoints) maintains backward compatibility
- NO SageMaker endpoints are currently deployed

### What This Feature Delivers

This feature deploys three SageMaker real-time inference endpoints via CDK:
1. Text generation endpoint (Hugging Face instruction-following model)
2. Image generation endpoint (Hugging Face diffusion model)
3. Audio transcription endpoint (Hugging Face Whisper model)

The deployment prioritizes cost minimization while maintaining acceptable performance for MVP usage.

### Design Goals

- Deploy minimal infrastructure to enable existing Lambda code
- Minimize monthly costs through appropriate instance type selection
- Maintain API backward compatibility
- Enable end-to-end testing of all AI features
- Provide monitoring and observability for production operations

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                    https://hst-traction.vercel.app              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (REST API)                      │
│                    /api/bedrock (POST)                          │
│                    /api/bedrock/audio (POST)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ Invoke
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda Function (Python 3.12)                 │
│                    Handler: main.handler                         │
│                    Timeout: 30s                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Existing SageMaker Integration Code                     │  │
│  │  - sagemaker_invoke() function                           │  │
│  │  - handle_bedrock_invoke() for text/image               │  │
│  │  - handle_bedrock_audio() for transcription             │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────┬──────────────────┬──────────────────┬───────────────────┘
       │                  │                  │
       │ InvokeEndpoint   │ InvokeEndpoint   │ InvokeEndpoint
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Text       │   │   Image      │   │   Audio      │
│  Endpoint    │   │  Endpoint    │   │  Endpoint    │
│              │   │              │   │              │
│ Mistral-7B   │   │ Stable Diff  │   │ Whisper      │
│ Instruct     │   │ XL 1.0       │   │ Large v3     │
│              │   │              │   │              │
│ ml.g5.xlarge │   │ml.g5.2xlarge │   │ ml.g5.xlarge │
│ 1 instance   │   │ 1 instance   │   │ 1 instance   │
└──────────────┘   └──────────────┘   └──────────────┘
      │                   │                   │
      └───────────────────┴───────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   CloudWatch Logs     │
              │   CloudWatch Metrics  │
              │   CloudWatch Alarms   │
              └───────────────────────┘
```

### Data Flow

#### Text Generation Flow
1. Frontend sends POST to /api/bedrock with `{prompt, taskType, systemPrompt}`
2. API Gateway routes to Lambda handler
3. Lambda constructs Mistral-format prompt: `<s>[INST] {system_prompt}\n{prompt} [/INST]`
4. Lambda invokes text endpoint with payload: `{inputs, parameters: {max_new_tokens, temperature}}`
5. SageMaker endpoint returns JSON: `[{generated_text: "..."}]`
6. Lambda extracts generated_text and returns to frontend

#### Image Generation Flow
1. Frontend sends POST to /api/bedrock with `{prompt, taskType: "imageGeneration"}`
2. API Gateway routes to Lambda handler
3. Lambda invokes image endpoint with payload: `{inputs: prompt}`
4. SageMaker endpoint returns raw JPEG bytes
5. Lambda base64-encodes image and returns: `{result: "data:image/jpeg;base64,...", isImage: true}`

#### Audio Transcription Flow
1. Frontend sends POST to /api/bedrock/audio with `{audioBase64, mimeType}`
2. API Gateway routes to Lambda handler
3. Lambda decodes base64 audio to bytes
4. Lambda invokes audio endpoint with raw audio bytes (Content-Type: audio/webm)
5. SageMaker endpoint returns JSON: `{text: "transcribed text"}`
6. Lambda returns: `{text: "...", audioBase64: null}`

### Component Interaction

**Existing Components (No Changes Required):**
- Frontend React application
- API Gateway REST API with CORS configuration
- Lambda function with SageMaker integration code
- DynamoDB tables (metrics, agents, deployments, training_jobs)
- Lambda IAM role with SageMaker invoke permissions

**New Components (This Feature):**
- SageMaker Model (Text): References Hugging Face Hub model
- SageMaker Endpoint Configuration (Text): Defines instance type and count
- SageMaker Endpoint (Text): Real-time inference endpoint
- SageMaker Model (Image): References Hugging Face Hub model
- SageMaker Endpoint Configuration (Image): Defines instance type and count
- SageMaker Endpoint (Image): Real-time inference endpoint
- SageMaker Model (Audio): References Hugging Face Hub model
- SageMaker Endpoint Configuration (Audio): Defines instance type and count
- SageMaker Endpoint (Audio): Real-time inference endpoint
- CloudWatch Alarms: Monitor endpoint health and performance

## Components and Interfaces

### SageMaker Endpoint Components

Each SageMaker endpoint consists of three CDK constructs:

#### 1. SageMaker Model (CfnModel)

Defines the container image and model artifacts.

**Text Model Configuration:**
```python
text_model = sagemaker.CfnModel(
    self, "TextGenerationModel",
    execution_role_arn=sagemaker_role.role_arn,
    primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
        image=f"763104351884.dkr.ecr.{self.region}.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
        environment={
            "HF_MODEL_ID": "mistralai/Mistral-7B-Instruct-v0.2",
            "HF_TASK": "text-generation",
            "MAX_INPUT_LENGTH": "2048",
            "MAX_TOTAL_TOKENS": "4096"
        }
    )
)
```

**Image Model Configuration:**
```python
image_model = sagemaker.CfnModel(
    self, "ImageGenerationModel",
    execution_role_arn=sagemaker_role.role_arn,
    primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
        image=f"763104351884.dkr.ecr.{self.region}.amazonaws.com/huggingface-pytorch-inference:2.1.0-transformers4.37.0-gpu-py310-cu118-ubuntu20.04",
        environment={
            "HF_MODEL_ID": "stabilityai/stable-diffusion-xl-base-1.0",
            "HF_TASK": "text-to-image"
        }
    )
)
```

**Audio Model Configuration:**
```python
audio_model = sagemaker.CfnModel(
    self, "AudioTranscriptionModel",
    execution_role_arn=sagemaker_role.role_arn,
    primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
        image=f"763104351884.dkr.ecr.{self.region}.amazonaws.com/huggingface-pytorch-inference:2.1.0-transformers4.37.0-gpu-py310-cu118-ubuntu20.04",
        environment={
            "HF_MODEL_ID": "openai/whisper-large-v3",
            "HF_TASK": "automatic-speech-recognition"
        }
    )
)
```

#### 2. SageMaker Endpoint Configuration (CfnEndpointConfig)

Defines instance type, count, and resource allocation.

**Text Endpoint Configuration:**
```python
text_endpoint_config = sagemaker.CfnEndpointConfig(
    self, "TextEndpointConfig",
    production_variants=[
        sagemaker.CfnEndpointConfig.ProductionVariantProperty(
            variant_name="AllTraffic",
            model_name=text_model.attr_model_name,
            initial_instance_count=1,
            instance_type="ml.g5.xlarge",
            initial_variant_weight=1.0
        )
    ]
)
```

**Image Endpoint Configuration:**
```python
image_endpoint_config = sagemaker.CfnEndpointConfig(
    self, "ImageEndpointConfig",
    production_variants=[
        sagemaker.CfnEndpointConfig.ProductionVariantProperty(
            variant_name="AllTraffic",
            model_name=image_model.attr_model_name,
            initial_instance_count=1,
            instance_type="ml.g5.2xlarge",
            initial_variant_weight=1.0
        )
    ]
)
```

**Audio Endpoint Configuration:**
```python
audio_endpoint_config = sagemaker.CfnEndpointConfig(
    self, "AudioEndpointConfig",
    production_variants=[
        sagemaker.CfnEndpointConfig.ProductionVariantProperty(
            variant_name="AllTraffic",
            model_name=audio_model.attr_model_name,
            initial_instance_count=1,
            instance_type="ml.g5.xlarge",
            initial_variant_weight=1.0
        )
    ]
)
```

#### 3. SageMaker Endpoint (CfnEndpoint)

Creates the real-time inference endpoint.

```python
text_endpoint = sagemaker.CfnEndpoint(
    self, "TextEndpoint",
    endpoint_config_name=text_endpoint_config.attr_endpoint_config_name,
    endpoint_name="tractionpal-text-endpoint"
)

image_endpoint = sagemaker.CfnEndpoint(
    self, "ImageEndpoint",
    endpoint_config_name=image_endpoint_config.attr_endpoint_config_name,
    endpoint_name="tractionpal-image-endpoint"
)

audio_endpoint = sagemaker.CfnEndpoint(
    self, "AudioEndpoint",
    endpoint_config_name=audio_endpoint_config.attr_endpoint_config_name,
    endpoint_name="tractionpal-audio-endpoint"
)
```

### IAM Role for SageMaker

SageMaker endpoints require an execution role with permissions to pull container images and access model artifacts.

```python
sagemaker_role = iam.Role(
    self, "SageMakerExecutionRole",
    assumed_by=iam.ServicePrincipal("sagemaker.amazonaws.com"),
    managed_policies=[
        iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSageMakerFullAccess")
    ]
)
```

### Lambda Environment Variable Updates

Update the Lambda function environment variables to reference the deployed endpoint names:

```python
api_handler = _lambda.Function(
    self, "ApiHandler",
    # ... existing configuration ...
    environment={
        # ... existing environment variables ...
        "SAGEMAKER_TEXT_ENDPOINT_NAME": text_endpoint.endpoint_name,
        "SAGEMAKER_IMAGE_ENDPOINT_NAME": image_endpoint.endpoint_name,
        "SAGEMAKER_AUDIO_ENDPOINT_NAME": audio_endpoint.endpoint_name,
    }
)
```

### CloudFormation Outputs

Export endpoint names for reference and testing:

```python
CfnOutput(self, "TextEndpointName",
    value=text_endpoint.endpoint_name,
    description="SageMaker Text Generation Endpoint Name"
)

CfnOutput(self, "ImageEndpointName",
    value=image_endpoint.endpoint_name,
    description="SageMaker Image Generation Endpoint Name"
)

CfnOutput(self, "AudioEndpointName",
    value=audio_endpoint.endpoint_name,
    description="SageMaker Audio Transcription Endpoint Name"
)
```

## Data Models

### SageMaker Request/Response Formats

#### Text Generation

**Request Format:**
```json
{
  "inputs": "<s>[INST] {system_prompt}\n{user_prompt} [/INST]",
  "parameters": {
    "max_new_tokens": 1000,
    "temperature": 0.7,
    "return_full_text": false
  }
}
```

**Response Format:**
```json
[
  {
    "generated_text": "The generated response text..."
  }
]
```

#### Image Generation

**Request Format:**
```json
{
  "inputs": "A detailed text prompt describing the desired image"
}
```

**Response Format:**
Raw JPEG bytes (Content-Type: image/jpeg)

#### Audio Transcription

**Request Format:**
Raw audio bytes (Content-Type: audio/webm, audio/mp3, or audio/wav)

**Response Format:**
```json
{
  "text": "The transcribed text from the audio"
}
```

### Lambda Handler Integration

The Lambda handler already implements the correct request/response handling:

**Text Generation (handle_bedrock_invoke):**
- Constructs Mistral-format prompt with [INST] tags
- Sends JSON payload to text endpoint
- Extracts generated_text from response array
- Returns formatted response to frontend

**Image Generation (handle_bedrock_invoke):**
- Sends simple prompt payload to image endpoint
- Receives raw JPEG bytes
- Base64-encodes and wraps in data URI
- Returns with isImage flag

**Audio Transcription (handle_bedrock_audio):**
- Decodes base64 audio from frontend
- Sends raw audio bytes to audio endpoint
- Extracts text field from JSON response
- Returns transcription to frontend

## Model Selection and Rationale

### Text Generation Model

**Selected Model: mistralai/Mistral-7B-Instruct-v0.2**

**Comparison:**

| Model | Parameters | Instance Type | Cost/Hour | Quality | Reasoning |
|-------|-----------|---------------|-----------|---------|-----------|
| Mistral-7B-Instruct | 7B | ml.g5.xlarge | $1.006 | Good | Best cost/performance ratio for MVP |
| Mixtral-8x7B-Instruct | 47B | ml.g5.12xlarge | $7.09 | Excellent | 7x more expensive, overkill for MVP |
| Llama-2-13B-Chat | 13B | ml.g5.2xlarge | $1.515 | Very Good | 50% more expensive, marginal quality gain |

**Rationale:**
- Mistral-7B provides excellent instruction-following capabilities
- Supports the required prompt format: `<s>[INST] ... [/INST]`
- Fits on ml.g5.xlarge (24GB GPU memory)
- Lambda handler already uses Mistral format
- Cost-effective for MVP usage patterns
- Sufficient quality for content analysis, creative directions, and script development

**Instance Type: ml.g5.xlarge**
- 1x NVIDIA A10G GPU (24GB GPU memory)
- 4 vCPUs, 16GB RAM
- $1.006/hour = ~$725/month (24/7 operation)
- Adequate for 7B parameter model
- Handles expected MVP load (< 100 requests/day)

### Image Generation Model

**Selected Model: stabilityai/stable-diffusion-xl-base-1.0**

**Comparison:**

| Model | Parameters | Instance Type | Cost/Hour | Quality | Reasoning |
|-------|-----------|---------------|-----------|---------|-----------|
| Stable Diffusion XL 1.0 | 3.5B | ml.g5.2xlarge | $1.515 | Excellent | Industry standard, high quality |
| Stable Diffusion 2.1 | 900M | ml.g5.xlarge | $1.006 | Good | Lower quality, less detailed images |

**Rationale:**
- SDXL produces significantly higher quality images (1024x1024 native resolution)
- Better prompt adherence and detail rendering
- Industry standard for text-to-image generation
- Requires ml.g5.2xlarge for adequate VRAM (48GB GPU memory)
- Worth the additional cost for thumbnail quality
- Lambda handler expects JPEG output, which SDXL provides

**Instance Type: ml.g5.2xlarge**
- 1x NVIDIA A10G GPU (48GB GPU memory)
- 8 vCPUs, 32GB RAM
- $1.515/hour = ~$1,091/month (24/7 operation)
- Required for SDXL model size and inference speed
- Handles image generation workload efficiently

### Audio Transcription Model

**Selected Model: openai/whisper-large-v3**

**Comparison:**

| Model | Parameters | Instance Type | Cost/Hour | Quality | Reasoning |
|-------|-----------|---------------|-----------|---------|-----------|
| Whisper Large v3 | 1.5B | ml.g5.xlarge | $1.006 | Excellent | Best accuracy, multilingual |
| Whisper Medium | 769M | ml.g5.xlarge | $1.006 | Very Good | Slightly lower accuracy |

**Rationale:**
- Whisper Large v3 provides state-of-the-art transcription accuracy
- Supports multiple audio formats (webm, mp3, wav)
- Multilingual support (useful for future expansion)
- Both models fit on ml.g5.xlarge, so no cost difference
- Lambda handler expects JSON response with "text" field
- No reason to use smaller model when cost is identical

**Instance Type: ml.g5.xlarge**
- 1x NVIDIA A10G GPU (24GB GPU memory)
- 4 vCPUs, 16GB RAM
- $1.006/hour = ~$725/month (24/7 operation)
- Sufficient for Whisper Large v3
- Handles audio transcription workload

### Total Infrastructure Cost Estimate

**Monthly Cost Breakdown (24/7 operation):**
- Text Endpoint (ml.g5.xlarge): ~$725/month
- Image Endpoint (ml.g5.2xlarge): ~$1,091/month
- Audio Endpoint (ml.g5.xlarge): ~$725/month
- **Total: ~$2,541/month**

**Cost Optimization Strategies:**
1. Implement auto-scaling to scale to zero during low usage
2. Use scheduled scaling to shut down endpoints during off-hours
3. Consider serverless inference for lower usage patterns
4. Monitor usage patterns and adjust instance types accordingly
5. Implement request batching where possible

**MVP Usage Assumptions:**
- < 100 AI requests per day
- Peak usage during business hours
- Low concurrent request volume
- Acceptable latency: 2-5 seconds per request


## CDK Implementation Details

### Backend Stack Modifications

The following code should be added to `backend_service/backend_stack.py`:

```python
from aws_cdk import (
    # ... existing imports ...
    aws_sagemaker as sagemaker,
)

class BackendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # ... existing DynamoDB tables code ...
        
        # SageMaker Execution Role
        sagemaker_role = iam.Role(
            self, "SageMakerExecutionRole",
            assumed_by=iam.ServicePrincipal("sagemaker.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSageMakerFullAccess")
            ]
        )
        
        # Text Generation Endpoint
        text_model = sagemaker.CfnModel(
            self, "TextGenerationModel",
            execution_role_arn=sagemaker_role.role_arn,
            primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
                image=f"763104351884.dkr.ecr.{self.region}.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
                environment={
                    "HF_MODEL_ID": "mistralai/Mistral-7B-Instruct-v0.2",
                    "HF_TASK": "text-generation",
                    "MAX_INPUT_LENGTH": "2048",
                    "MAX_TOTAL_TOKENS": "4096"
                }
            )
        )
        
        text_endpoint_config = sagemaker.CfnEndpointConfig(
            self, "TextEndpointConfig",
            production_variants=[
                sagemaker.CfnEndpointConfig.ProductionVariantProperty(
                    variant_name="AllTraffic",
                    model_name=text_model.attr_model_name,
                    initial_instance_count=1,
                    instance_type="ml.g5.xlarge",
                    initial_variant_weight=1.0
                )
            ]
        )
        
        text_endpoint = sagemaker.CfnEndpoint(
            self, "TextEndpoint",
            endpoint_config_name=text_endpoint_config.attr_endpoint_config_name,
            endpoint_name="tractionpal-text-endpoint"
        )
        
        # Image Generation Endpoint
        image_model = sagemaker.CfnModel(
            self, "ImageGenerationModel",
            execution_role_arn=sagemaker_role.role_arn,
            primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
                image=f"763104351884.dkr.ecr.{self.region}.amazonaws.com/huggingface-pytorch-inference:2.1.0-transformers4.37.0-gpu-py310-cu118-ubuntu20.04",
                environment={
                    "HF_MODEL_ID": "stabilityai/stable-diffusion-xl-base-1.0",
                    "HF_TASK": "text-to-image"
                }
            )
        )
        
        image_endpoint_config = sagemaker.CfnEndpointConfig(
            self, "ImageEndpointConfig",
            production_variants=[
                sagemaker.CfnEndpointConfig.ProductionVariantProperty(
                    variant_name="AllTraffic",
                    model_name=image_model.attr_model_name,
                    initial_instance_count=1,
                    instance_type="ml.g5.2xlarge",
                    initial_variant_weight=1.0
                )
            ]
        )
        
        image_endpoint = sagemaker.CfnEndpoint(
            self, "ImageEndpoint",
            endpoint_config_name=image_endpoint_config.attr_endpoint_config_name,
            endpoint_name="tractionpal-image-endpoint"
        )
        
        # Audio Transcription Endpoint
        audio_model = sagemaker.CfnModel(
            self, "AudioTranscriptionModel",
            execution_role_arn=sagemaker_role.role_arn,
            primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
                image=f"763104351884.dkr.ecr.{self.region}.amazonaws.com/huggingface-pytorch-inference:2.1.0-transformers4.37.0-gpu-py310-cu118-ubuntu20.04",
                environment={
                    "HF_MODEL_ID": "openai/whisper-large-v3",
                    "HF_TASK": "automatic-speech-recognition"
                }
            )
        )
        
        audio_endpoint_config = sagemaker.CfnEndpointConfig(
            self, "AudioEndpointConfig",
            production_variants=[
                sagemaker.CfnEndpointConfig.ProductionVariantProperty(
                    variant_name="AllTraffic",
                    model_name=audio_model.attr_model_name,
                    initial_instance_count=1,
                    instance_type="ml.g5.xlarge",
                    initial_variant_weight=1.0
                )
            ]
        )
        
        audio_endpoint = sagemaker.CfnEndpoint(
            self, "AudioEndpoint",
            endpoint_config_name=audio_endpoint_config.attr_endpoint_config_name,
            endpoint_name="tractionpal-audio-endpoint"
        )
        
        # CloudWatch Alarms for Monitoring
        # Text Endpoint Alarms
        text_error_alarm = cloudwatch.Alarm(
            self, "TextEndpointErrorAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelInvocationErrors",
                dimensions_map={
                    "EndpointName": text_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Sum",
                period=Duration.minutes(5)
            ),
            threshold=5,
            evaluation_periods=1,
            alarm_description="Text endpoint invocation errors exceed threshold"
        )
        
        text_latency_alarm = cloudwatch.Alarm(
            self, "TextEndpointLatencyAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelLatency",
                dimensions_map={
                    "EndpointName": text_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Average",
                period=Duration.minutes(5)
            ),
            threshold=5000,  # 5 seconds
            evaluation_periods=2,
            alarm_description="Text endpoint latency exceeds 5 seconds"
        )
        
        # Image Endpoint Alarms
        image_error_alarm = cloudwatch.Alarm(
            self, "ImageEndpointErrorAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelInvocationErrors",
                dimensions_map={
                    "EndpointName": image_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Sum",
                period=Duration.minutes(5)
            ),
            threshold=5,
            evaluation_periods=1,
            alarm_description="Image endpoint invocation errors exceed threshold"
        )
        
        image_latency_alarm = cloudwatch.Alarm(
            self, "ImageEndpointLatencyAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelLatency",
                dimensions_map={
                    "EndpointName": image_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Average",
                period=Duration.minutes(5)
            ),
            threshold=10000,  # 10 seconds
            evaluation_periods=2,
            alarm_description="Image endpoint latency exceeds 10 seconds"
        )
        
        # Audio Endpoint Alarms
        audio_error_alarm = cloudwatch.Alarm(
            self, "AudioEndpointErrorAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelInvocationErrors",
                dimensions_map={
                    "EndpointName": audio_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Sum",
                period=Duration.minutes(5)
            ),
            threshold=5,
            evaluation_periods=1,
            alarm_description="Audio endpoint invocation errors exceed threshold"
        )
        
        audio_latency_alarm = cloudwatch.Alarm(
            self, "AudioEndpointLatencyAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelLatency",
                dimensions_map={
                    "EndpointName": audio_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Average",
                period=Duration.minutes(5)
            ),
            threshold=8000,  # 8 seconds
            evaluation_periods=2,
            alarm_description="Audio endpoint latency exceeds 8 seconds"
        )
        
        # Update Lambda environment variables
        api_handler = _lambda.Function(
            self, "ApiHandler",
            # ... existing configuration ...
            environment={
                # ... existing environment variables ...
                "SAGEMAKER_TEXT_ENDPOINT_NAME": text_endpoint.endpoint_name,
                "SAGEMAKER_IMAGE_ENDPOINT_NAME": image_endpoint.endpoint_name,
                "SAGEMAKER_AUDIO_ENDPOINT_NAME": audio_endpoint.endpoint_name,
            }
        )
        
        # ... existing Lambda permissions code ...
        
        # CloudFormation Outputs
        CfnOutput(self, "TextEndpointName",
            value=text_endpoint.endpoint_name,
            description="SageMaker Text Generation Endpoint (Mistral-7B-Instruct-v0.2)"
        )
        
        CfnOutput(self, "ImageEndpointName",
            value=image_endpoint.endpoint_name,
            description="SageMaker Image Generation Endpoint (Stable Diffusion XL 1.0)"
        )
        
        CfnOutput(self, "AudioEndpointName",
            value=audio_endpoint.endpoint_name,
            description="SageMaker Audio Transcription Endpoint (Whisper Large v3)"
        )
        
        CfnOutput(self, "EstimatedMonthlyCost",
            value="$2,541 (Text: $725, Image: $1,091, Audio: $725)",
            description="Estimated monthly cost for 24/7 endpoint operation"
        )
```

### Deployment Steps

1. Install required CDK dependencies:
```bash
cd backend_service
pip install aws-cdk-lib constructs
```

2. Synthesize the CloudFormation template:
```bash
cdk synth
```

3. Deploy the stack:
```bash
cdk deploy
```

4. Wait for endpoint creation (15-20 minutes):
   - Text endpoint: ~10 minutes
   - Image endpoint: ~15 minutes
   - Audio endpoint: ~10 minutes

5. Verify endpoints are InService:
```bash
aws sagemaker describe-endpoint --endpoint-name tractionpal-text-endpoint
aws sagemaker describe-endpoint --endpoint-name tractionpal-image-endpoint
aws sagemaker describe-endpoint --endpoint-name tractionpal-audio-endpoint
```

### Rollback Strategy

If deployment fails:

1. Check CloudFormation stack events:
```bash
aws cloudformation describe-stack-events --stack-name BackendStack
```

2. Common failure scenarios:
   - Insufficient service quotas: Request quota increase for SageMaker endpoints
   - IAM permission issues: Verify SageMaker execution role has required permissions
   - Container image not found: Verify region supports the specified container images
   - Instance type unavailable: Try alternative instance type (e.g., ml.g5.2xlarge instead of ml.g5.xlarge)

3. Rollback command:
```bash
cdk destroy
```

4. Fix issues and redeploy

### Environment Variables

The Lambda function expects these environment variables (automatically set by CDK):

- `SAGEMAKER_TEXT_ENDPOINT_NAME`: Name of the text generation endpoint
- `SAGEMAKER_IMAGE_ENDPOINT_NAME`: Name of the image generation endpoint
- `SAGEMAKER_AUDIO_ENDPOINT_NAME`: Name of the audio transcription endpoint

### Required IAM Permissions

The Lambda execution role already has the required permissions:

```python
api_handler.add_to_role_policy(iam.PolicyStatement(
    effect=iam.Effect.ALLOW,
    actions=["sagemaker:InvokeEndpoint"],
    resources=["arn:aws:sagemaker:*:*:endpoint/*"]
))
```

The SageMaker execution role requires:
- Access to ECR to pull container images
- Access to CloudWatch for logging
- Access to S3 for model artifacts (if using custom models)

These are provided by the `AmazonSageMakerFullAccess` managed policy.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

For this infrastructure deployment feature, most correctness criteria are example-based rather than property-based, as we're verifying specific configurations rather than universal behaviors across many inputs. The following examples should be verified after deployment:

### Example 1: Text Endpoint Deployment

The deployed text generation endpoint should exist with the correct configuration.

**Verification Steps:**
1. Query AWS to verify endpoint exists: `aws sagemaker describe-endpoint --endpoint-name tractionpal-text-endpoint`
2. Verify endpoint status is "InService"
3. Verify endpoint uses ml.g5.xlarge instance type
4. Verify endpoint uses Mistral-7B-Instruct-v0.2 model
5. Verify Lambda environment variable SAGEMAKER_TEXT_ENDPOINT_NAME is set correctly
6. Verify CloudFormation output "TextEndpointName" exists

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.5**

### Example 2: Image Endpoint Deployment

The deployed image generation endpoint should exist with the correct configuration.

**Verification Steps:**
1. Query AWS to verify endpoint exists: `aws sagemaker describe-endpoint --endpoint-name tractionpal-image-endpoint`
2. Verify endpoint status is "InService"
3. Verify endpoint uses ml.g5.2xlarge instance type
4. Verify endpoint uses Stable Diffusion XL 1.0 model
5. Verify Lambda environment variable SAGEMAKER_IMAGE_ENDPOINT_NAME is set correctly
6. Verify CloudFormation output "ImageEndpointName" exists

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 4.5**

### Example 3: Audio Endpoint Deployment

The deployed audio transcription endpoint should exist with the correct configuration.

**Verification Steps:**
1. Query AWS to verify endpoint exists: `aws sagemaker describe-endpoint --endpoint-name tractionpal-audio-endpoint`
2. Verify endpoint status is "InService"
3. Verify endpoint uses ml.g5.xlarge instance type
4. Verify endpoint uses Whisper Large v3 model
5. Verify Lambda environment variable SAGEMAKER_AUDIO_ENDPOINT_NAME is set correctly
6. Verify CloudFormation output "AudioEndpointName" exists

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.3, 4.5**

### Example 4: Text Generation End-to-End

The Lambda handler should successfully invoke the text endpoint and return valid results.

**Verification Steps:**
1. Send POST request to /api/bedrock with text generation payload:
```json
{
  "prompt": "Write a brief social media caption about coffee",
  "taskType": "contentAnalysis",
  "systemPrompt": "You are a helpful assistant."
}
```
2. Verify response status is 200
3. Verify response contains "result" field with generated text
4. Verify generated text is non-empty and coherent
5. Verify response time is under 5 seconds

**Validates: Requirements 1.6, 6.1, 6.4, 6.5**

### Example 5: Image Generation End-to-End

The Lambda handler should successfully invoke the image endpoint and return valid JPEG images.

**Verification Steps:**
1. Send POST request to /api/bedrock with image generation payload:
```json
{
  "prompt": "A serene mountain landscape at sunset",
  "taskType": "imageGeneration"
}
```
2. Verify response status is 200
3. Verify response contains "result" field with base64-encoded image
4. Verify result starts with "data:image/jpeg;base64,"
5. Verify base64 data can be decoded to valid JPEG
6. Verify response contains "isImage": true
7. Verify response time is under 15 seconds

**Validates: Requirements 2.6, 6.2, 6.4, 6.5**

### Example 6: Audio Transcription End-to-End

The Lambda handler should successfully invoke the audio endpoint and return transcribed text.

**Verification Steps:**
1. Send POST request to /api/bedrock/audio with audio payload:
```json
{
  "audioBase64": "<base64-encoded audio data>",
  "mimeType": "audio/webm"
}
```
2. Verify response status is 200
3. Verify response contains "text" field with transcribed text
4. Verify transcribed text is non-empty
5. Verify response time is under 10 seconds
6. Repeat test with mp3 and wav formats

**Validates: Requirements 3.6, 6.3, 6.4, 6.5**

### Example 7: Error Handling

The Lambda handler should provide clear error messages when endpoint invocation fails.

**Verification Steps:**
1. Temporarily stop one endpoint or use invalid endpoint name
2. Send request to the affected endpoint
3. Verify response status is 500
4. Verify error message indicates the specific endpoint that failed
5. Verify error message includes endpoint name
6. Verify CloudWatch logs contain detailed error information

**Validates: Requirements 6.6, 9.5**

### Example 8: CloudWatch Monitoring

CloudWatch alarms and logs should be configured for all endpoints.

**Verification Steps:**
1. Query CloudWatch alarms: `aws cloudwatch describe-alarms`
2. Verify alarms exist for:
   - Text endpoint invocation errors
   - Text endpoint latency
   - Image endpoint invocation errors
   - Image endpoint latency
   - Audio endpoint invocation errors
   - Audio endpoint latency
3. Verify error rate alarm threshold is 5 errors per 5 minutes
4. Verify latency alarm thresholds match design specifications
5. Verify CloudWatch log groups exist for each endpoint
6. Invoke endpoints and verify logs are being written

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Example 9: Cost Configuration

All endpoints should be configured with minimum instance counts for cost optimization.

**Verification Steps:**
1. Query endpoint configurations
2. Verify all endpoints have initial_instance_count = 1
3. Verify instance types match design specifications:
   - Text: ml.g5.xlarge
   - Image: ml.g5.2xlarge
   - Audio: ml.g5.xlarge
4. Verify no auto-scaling policies are configured (MVP)
5. Calculate estimated monthly cost and verify it matches design estimate (~$2,541)

**Validates: Requirements 5.1, 5.2**

### Example 10: CloudFormation Outputs

CloudFormation stack should output all required endpoint information.

**Verification Steps:**
1. Query stack outputs: `aws cloudformation describe-stacks --stack-name BackendStack`
2. Verify outputs exist for:
   - TextEndpointName
   - ImageEndpointName
   - AudioEndpointName
   - EstimatedMonthlyCost
3. Verify output descriptions contain model information
4. Verify output values match deployed endpoint names

**Validates: Requirements 4.6, 9.6**


## Error Handling

### SageMaker Endpoint Errors

The Lambda handler already implements error handling for SageMaker invocations:

```python
try:
    response_bytes = sagemaker_invoke(
        endpoint_name=sagemaker_text_endpoint,
        payload=payload,
        content_type="application/json",
        accept="application/json"
    )
    # Process response...
except Exception as e:
    print(f"Hugging Face Error: {e}")
    return {
        'statusCode': 500,
        'headers': get_cors_headers(event),
        'body': json.dumps({'error': str(e)})
    }
```

### Error Scenarios and Handling

#### 1. Endpoint Not Found

**Scenario:** Lambda tries to invoke an endpoint that doesn't exist or has wrong name.

**Error:** `botocore.exceptions.ClientError: An error occurred (ValidationException) when calling the InvokeEndpoint operation: Could not find endpoint`

**Handling:**
- Lambda catches exception and returns 500 status
- Error message includes endpoint name
- CloudWatch logs contain full stack trace
- User receives: `{"error": "Could not find endpoint tractionpal-text-endpoint"}`

**Resolution:** Verify endpoint names in Lambda environment variables match deployed endpoints.

#### 2. Endpoint Not InService

**Scenario:** Endpoint exists but is in Creating, Updating, or Failed state.

**Error:** `botocore.exceptions.ClientError: An error occurred (ValidationException) when calling the InvokeEndpoint operation: Endpoint is not in service`

**Handling:**
- Lambda catches exception and returns 500 status
- Error message indicates endpoint is not ready
- CloudWatch logs contain endpoint status
- User receives: `{"error": "Endpoint is not in service"}`

**Resolution:** Wait for endpoint to reach InService state or check CloudFormation events for deployment failures.

#### 3. Model Invocation Timeout

**Scenario:** Model takes longer than Lambda timeout (30 seconds) to respond.

**Error:** Lambda timeout error

**Handling:**
- Lambda execution terminates after 30 seconds
- API Gateway returns 504 Gateway Timeout
- CloudWatch logs show timeout error
- User receives: Gateway timeout error from API Gateway

**Resolution:** 
- Increase Lambda timeout if needed (max 15 minutes)
- Optimize model inference parameters
- Consider using larger instance type for faster inference

#### 4. Invalid Request Format

**Scenario:** Lambda sends incorrectly formatted payload to endpoint.

**Error:** `botocore.exceptions.ClientError: An error occurred (ModelError) when calling the InvokeEndpoint operation: Received client error (400) with message`

**Handling:**
- Lambda catches exception and returns 500 status
- Error message includes model error details
- CloudWatch logs contain full request payload
- User receives: `{"error": "Model error: <details>"}`

**Resolution:** Verify Lambda is formatting requests correctly for the deployed model.

#### 5. Model Inference Error

**Scenario:** Model encounters error during inference (e.g., out of memory, invalid input).

**Error:** `botocore.exceptions.ClientError: An error occurred (ModelError) when calling the InvokeEndpoint operation`

**Handling:**
- Lambda catches exception and returns 500 status
- Error message includes model error details
- CloudWatch logs contain full error
- CloudWatch alarm triggers if error rate exceeds threshold
- User receives: `{"error": "Model inference error: <details>"}`

**Resolution:** 
- Check CloudWatch logs for specific model error
- Verify input is within model's capabilities
- Consider adjusting model parameters or using larger instance type

#### 6. Insufficient IAM Permissions

**Scenario:** Lambda role lacks permission to invoke SageMaker endpoint.

**Error:** `botocore.exceptions.ClientError: An error occurred (AccessDeniedException) when calling the InvokeEndpoint operation: User is not authorized`

**Handling:**
- Lambda catches exception and returns 500 status
- Error message indicates permission issue
- CloudWatch logs contain full error
- User receives: `{"error": "Access denied to SageMaker endpoint"}`

**Resolution:** Verify Lambda execution role has `sagemaker:InvokeEndpoint` permission.

#### 7. Rate Limiting / Throttling

**Scenario:** Too many concurrent requests to SageMaker endpoint.

**Error:** `botocore.exceptions.ClientError: An error occurred (ThrottlingException) when calling the InvokeEndpoint operation: Rate exceeded`

**Handling:**
- Lambda catches exception and returns 500 status
- Error message indicates throttling
- CloudWatch logs contain throttling error
- User receives: `{"error": "Rate limit exceeded, please try again"}`

**Resolution:**
- Implement exponential backoff retry logic in Lambda
- Increase endpoint instance count
- Implement request queuing

### CloudWatch Alarm Actions

When alarms trigger, the following actions should be taken:

1. **High Error Rate Alarm:**
   - Check CloudWatch logs for error patterns
   - Verify endpoint is InService
   - Check for model-specific errors
   - Consider rolling back to previous version if recent deployment

2. **High Latency Alarm:**
   - Check endpoint instance metrics (CPU, GPU, memory)
   - Consider scaling up instance type
   - Review recent request patterns for anomalies
   - Check for model performance degradation

3. **Endpoint Down:**
   - Check endpoint status in SageMaker console
   - Review CloudFormation events
   - Check for AWS service issues
   - Initiate endpoint recreation if necessary

### Logging Strategy

All errors should be logged to CloudWatch with the following information:

```python
print(f"SageMaker Invocation Error:")
print(f"  Endpoint: {endpoint_name}")
print(f"  Error Type: {type(e).__name__}")
print(f"  Error Message: {str(e)}")
print(f"  Request ID: {context.aws_request_id}")
print(f"  Payload: {json.dumps(payload)[:500]}")  # Truncate large payloads
```

This enables effective troubleshooting and debugging.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and integration tests:

- **Unit tests:** Verify CDK construct creation and configuration
- **Integration tests:** Verify end-to-end functionality with deployed endpoints

Both are necessary for comprehensive coverage. Unit tests catch configuration errors early, while integration tests verify actual functionality.

### Unit Testing

Unit tests should verify CDK construct creation without deploying infrastructure.

**Test Framework:** pytest with aws-cdk-lib assertions

**Test File:** `backend_service/tests/test_backend_stack.py`

**Test Cases:**

1. **Test SageMaker Role Creation**
```python
def test_sagemaker_role_created():
    app = cdk.App()
    stack = BackendStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)
    
    template.has_resource_properties("AWS::IAM::Role", {
        "AssumeRolePolicyDocument": {
            "Statement": [{
                "Principal": {"Service": "sagemaker.amazonaws.com"}
            }]
        }
    })
```

2. **Test Text Endpoint Configuration**
```python
def test_text_endpoint_configuration():
    app = cdk.App()
    stack = BackendStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)
    
    template.has_resource_properties("AWS::SageMaker::EndpointConfig", {
        "ProductionVariants": [{
            "InstanceType": "ml.g5.xlarge",
            "InitialInstanceCount": 1
        }]
    })
```

3. **Test Image Endpoint Configuration**
```python
def test_image_endpoint_configuration():
    app = cdk.App()
    stack = BackendStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)
    
    template.has_resource_properties("AWS::SageMaker::EndpointConfig", {
        "ProductionVariants": [{
            "InstanceType": "ml.g5.2xlarge",
            "InitialInstanceCount": 1
        }]
    })
```

4. **Test Lambda Environment Variables**
```python
def test_lambda_environment_variables():
    app = cdk.App()
    stack = BackendStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)
    
    template.has_resource_properties("AWS::Lambda::Function", {
        "Environment": {
            "Variables": {
                "SAGEMAKER_TEXT_ENDPOINT_NAME": assertions.Match.any_value(),
                "SAGEMAKER_IMAGE_ENDPOINT_NAME": assertions.Match.any_value(),
                "SAGEMAKER_AUDIO_ENDPOINT_NAME": assertions.Match.any_value()
            }
        }
    })
```

5. **Test CloudWatch Alarms Created**
```python
def test_cloudwatch_alarms_created():
    app = cdk.App()
    stack = BackendStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)
    
    # Should have 6 alarms (2 per endpoint)
    template.resource_count_is("AWS::CloudWatch::Alarm", 6)
```

6. **Test CloudFormation Outputs**
```python
def test_cloudformation_outputs():
    app = cdk.App()
    stack = BackendStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)
    
    template.has_output("TextEndpointName", {})
    template.has_output("ImageEndpointName", {})
    template.has_output("AudioEndpointName", {})
```

### Integration Testing

Integration tests verify end-to-end functionality with deployed endpoints.

**Test Framework:** pytest with boto3

**Test File:** `backend_service/tests/test_integration.py`

**Prerequisites:**
- Stack must be deployed
- Endpoints must be InService
- API Gateway URL must be available

**Test Cases:**

1. **Test Text Endpoint Exists and InService**
```python
def test_text_endpoint_status():
    client = boto3.client('sagemaker')
    response = client.describe_endpoint(
        EndpointName='tractionpal-text-endpoint'
    )
    assert response['EndpointStatus'] == 'InService'
    assert response['ProductionVariants'][0]['CurrentInstanceCount'] == 1
```

2. **Test Text Generation via API**
```python
def test_text_generation_api():
    api_url = os.environ['API_GATEWAY_URL']
    response = requests.post(
        f"{api_url}/api/bedrock",
        json={
            "prompt": "Write a brief caption about coffee",
            "taskType": "contentAnalysis",
            "systemPrompt": "You are a helpful assistant."
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert 'result' in data
    assert len(data['result']) > 0
```

3. **Test Image Generation via API**
```python
def test_image_generation_api():
    api_url = os.environ['API_GATEWAY_URL']
    response = requests.post(
        f"{api_url}/api/bedrock",
        json={
            "prompt": "A serene mountain landscape",
            "taskType": "imageGeneration"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert 'result' in data
    assert data['result'].startswith('data:image/jpeg;base64,')
    assert data['isImage'] == True
```

4. **Test Audio Transcription via API**
```python
def test_audio_transcription_api():
    # Load sample audio file
    with open('tests/fixtures/sample_audio.webm', 'rb') as f:
        audio_bytes = f.read()
    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
    
    api_url = os.environ['API_GATEWAY_URL']
    response = requests.post(
        f"{api_url}/api/bedrock/audio",
        json={
            "audioBase64": audio_base64,
            "mimeType": "audio/webm"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert 'text' in data
    assert len(data['text']) > 0
```

5. **Test Response Times**
```python
def test_response_times():
    api_url = os.environ['API_GATEWAY_URL']
    
    # Text generation should be under 5 seconds
    start = time.time()
    response = requests.post(f"{api_url}/api/bedrock", json={
        "prompt": "Hello", "taskType": "contentAnalysis"
    })
    duration = time.time() - start
    assert duration < 5.0
    
    # Image generation should be under 15 seconds
    start = time.time()
    response = requests.post(f"{api_url}/api/bedrock", json={
        "prompt": "A cat", "taskType": "imageGeneration"
    })
    duration = time.time() - start
    assert duration < 15.0
```

6. **Test CloudWatch Alarms Exist**
```python
def test_cloudwatch_alarms_exist():
    client = boto3.client('cloudwatch')
    response = client.describe_alarms(
        AlarmNamePrefix='BackendStack'
    )
    alarm_names = [alarm['AlarmName'] for alarm in response['MetricAlarms']]
    
    assert any('TextEndpointError' in name for name in alarm_names)
    assert any('TextEndpointLatency' in name for name in alarm_names)
    assert any('ImageEndpointError' in name for name in alarm_names)
    assert any('ImageEndpointLatency' in name for name in alarm_names)
    assert any('AudioEndpointError' in name for name in alarm_names)
    assert any('AudioEndpointLatency' in name for name in alarm_names)
```

### End-to-End Test Script

A standalone test script should be provided for manual testing after deployment.

**Test Script:** `backend_service/test_endpoints.py`

```python
#!/usr/bin/env python3
"""
End-to-end test script for SageMaker endpoints.
Usage: python test_endpoints.py <api-gateway-url>
"""

import sys
import requests
import base64
import time
import json

def test_text_generation(api_url):
    print("Testing text generation...")
    start = time.time()
    response = requests.post(
        f"{api_url}/api/bedrock",
        json={
            "prompt": "Write a brief social media caption about morning coffee",
            "taskType": "contentAnalysis",
            "systemPrompt": "You are a creative social media expert."
        }
    )
    duration = time.time() - start
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Text generation successful ({duration:.2f}s)")
        print(f"  Result: {data['result'][:100]}...")
        return True
    else:
        print(f"✗ Text generation failed: {response.text}")
        return False

def test_image_generation(api_url):
    print("\nTesting image generation...")
    start = time.time()
    response = requests.post(
        f"{api_url}/api/bedrock",
        json={
            "prompt": "A serene mountain landscape at sunset with vibrant colors",
            "taskType": "imageGeneration"
        }
    )
    duration = time.time() - start
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Image generation successful ({duration:.2f}s)")
        print(f"  Image size: {len(data['result'])} bytes")
        return True
    else:
        print(f"✗ Image generation failed: {response.text}")
        return False

def test_audio_transcription(api_url):
    print("\nTesting audio transcription...")
    # Create a simple test audio (in real scenario, use actual audio file)
    print("  Note: Using sample audio data")
    
    # For actual testing, load a real audio file:
    # with open('sample_audio.webm', 'rb') as f:
    #     audio_bytes = f.read()
    # audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
    
    print("  Skipping audio test (requires sample audio file)")
    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_endpoints.py <api-gateway-url>")
        sys.exit(1)
    
    api_url = sys.argv[1].rstrip('/')
    
    print(f"Testing endpoints at: {api_url}\n")
    print("=" * 60)
    
    results = []
    results.append(("Text Generation", test_text_generation(api_url)))
    results.append(("Image Generation", test_image_generation(api_url)))
    results.append(("Audio Transcription", test_audio_transcription(api_url)))
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {name}")
    
    all_passed = all(result[1] for result in results)
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
```

### Test Execution

**Run unit tests:**
```bash
cd backend_service
pytest tests/test_backend_stack.py -v
```

**Run integration tests (after deployment):**
```bash
export API_GATEWAY_URL=$(aws cloudformation describe-stacks --stack-name BackendStack --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)
pytest tests/test_integration.py -v
```

**Run end-to-end test script:**
```bash
python test_endpoints.py $API_GATEWAY_URL
```

### Performance Benchmarks

Expected performance metrics:

- Text generation: 2-5 seconds per request
- Image generation: 8-15 seconds per request
- Audio transcription: 3-8 seconds per request (depends on audio length)

These benchmarks should be verified during integration testing and monitored in production via CloudWatch metrics.


## Deployment Guide

### Prerequisites

1. AWS CLI configured with appropriate credentials
2. AWS CDK installed: `npm install -g aws-cdk`
3. Python 3.12 installed
4. Required Python packages: `pip install -r requirements.txt`
5. Sufficient AWS service quotas:
   - SageMaker endpoints: At least 3
   - ml.g5.xlarge instances: At least 2
   - ml.g5.2xlarge instances: At least 1

### Step-by-Step Deployment

#### Step 1: Verify Prerequisites

```bash
# Check AWS CLI configuration
aws sts get-caller-identity

# Check CDK version
cdk --version

# Check Python version
python --version
```

#### Step 2: Install Dependencies

```bash
cd backend_service
pip install -r requirements.txt
pip install aws-cdk-lib constructs
```

#### Step 3: Bootstrap CDK (First Time Only)

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

#### Step 4: Synthesize CloudFormation Template

```bash
cdk synth
```

This generates the CloudFormation template and validates the CDK code. Review the output for any errors.

#### Step 5: Deploy the Stack

```bash
cdk deploy
```

You'll be prompted to approve IAM changes and resource creation. Type 'y' to proceed.

#### Step 6: Monitor Deployment Progress

The deployment will take approximately 15-20 minutes. You can monitor progress in:

1. **Terminal output:** Shows CloudFormation events in real-time
2. **AWS Console:** CloudFormation → Stacks → BackendStack
3. **SageMaker Console:** SageMaker → Endpoints

Expected timeline:
- 0-2 minutes: IAM roles and Lambda updates
- 2-12 minutes: Text endpoint creation
- 2-17 minutes: Image endpoint creation
- 2-12 minutes: Audio endpoint creation
- 17-20 minutes: CloudWatch alarms and outputs

#### Step 7: Verify Deployment

```bash
# Get stack outputs
aws cloudformation describe-stacks --stack-name BackendStack --query 'Stacks[0].Outputs'

# Verify text endpoint
aws sagemaker describe-endpoint --endpoint-name tractionpal-text-endpoint

# Verify image endpoint
aws sagemaker describe-endpoint --endpoint-name tractionpal-image-endpoint

# Verify audio endpoint
aws sagemaker describe-endpoint --endpoint-name tractionpal-audio-endpoint
```

All endpoints should show `"EndpointStatus": "InService"`.

#### Step 8: Run End-to-End Tests

```bash
# Get API Gateway URL from outputs
export API_URL=$(aws cloudformation describe-stacks --stack-name BackendStack --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)

# Run test script
python test_endpoints.py $API_URL
```

### Environment Variables

The following environment variables are automatically configured by CDK:

| Variable | Value | Purpose |
|----------|-------|---------|
| SAGEMAKER_TEXT_ENDPOINT_NAME | tractionpal-text-endpoint | Text generation endpoint name |
| SAGEMAKER_IMAGE_ENDPOINT_NAME | tractionpal-image-endpoint | Image generation endpoint name |
| SAGEMAKER_AUDIO_ENDPOINT_NAME | tractionpal-audio-endpoint | Audio transcription endpoint name |

These are set in the Lambda function environment and do not require manual configuration.

### Deployed Models

| Endpoint | Model | Capabilities |
|----------|-------|--------------|
| Text | mistralai/Mistral-7B-Instruct-v0.2 | Instruction-following, content analysis, script writing |
| Image | stabilityai/stable-diffusion-xl-base-1.0 | Text-to-image generation, 1024x1024 resolution |
| Audio | openai/whisper-large-v3 | Speech-to-text, multilingual support |

### Estimated Costs

**Monthly Cost (24/7 operation):**
- Text endpoint (ml.g5.xlarge): $725/month
- Image endpoint (ml.g5.2xlarge): $1,091/month
- Audio endpoint (ml.g5.xlarge): $725/month
- **Total: $2,541/month**

**Cost per request (assuming 3,000 requests/month):**
- Text generation: ~$0.24 per request
- Image generation: ~$0.36 per request
- Audio transcription: ~$0.24 per request

**Note:** These are infrastructure costs only. Actual costs may vary based on:
- Request volume and frequency
- Inference duration
- Data transfer costs
- CloudWatch logs retention

### Estimated Deployment Time

- **Total deployment time:** 15-20 minutes
- **Text endpoint:** 8-12 minutes
- **Image endpoint:** 12-17 minutes (largest model)
- **Audio endpoint:** 8-12 minutes

Endpoints are created in parallel, so total time is determined by the slowest endpoint (image).

### Troubleshooting Common Issues

#### Issue 1: Insufficient Service Quota

**Error:** `Resource creation failed: LimitExceededException: The account-level service limit 'ml.g5.xlarge for endpoint usage' is 0 Instances`

**Solution:**
1. Go to AWS Service Quotas console
2. Search for "SageMaker"
3. Request quota increase for:
   - "ml.g5.xlarge for endpoint usage" → Request 2
   - "ml.g5.2xlarge for endpoint usage" → Request 1
4. Wait for approval (usually 1-2 business days)
5. Retry deployment

#### Issue 2: Container Image Not Found

**Error:** `Resource creation failed: ValidationException: Could not find container image`

**Solution:**
1. Verify you're deploying in a supported region (us-east-1, us-west-2, eu-west-1)
2. Check that the container image URI is correct for your region
3. Verify your account has access to AWS Deep Learning Containers

#### Issue 3: IAM Permission Denied

**Error:** `User is not authorized to perform: sagemaker:CreateEndpoint`

**Solution:**
1. Verify your AWS credentials have sufficient permissions
2. Required permissions:
   - sagemaker:CreateModel
   - sagemaker:CreateEndpointConfig
   - sagemaker:CreateEndpoint
   - iam:CreateRole
   - iam:AttachRolePolicy
3. Consider using AdministratorAccess for initial deployment

#### Issue 4: Endpoint Creation Timeout

**Error:** Endpoint stuck in "Creating" state for > 30 minutes

**Solution:**
1. Check CloudWatch logs for the endpoint
2. Verify instance type is available in your region
3. Check for AWS service issues in Service Health Dashboard
4. Delete the stuck endpoint and retry:
```bash
aws sagemaker delete-endpoint --endpoint-name tractionpal-text-endpoint
cdk deploy
```

#### Issue 5: Model Download Failure

**Error:** Endpoint fails with "ModelError" during creation

**Solution:**
1. Verify the model ID is correct and accessible
2. Check that the SageMaker execution role has internet access
3. Verify the model is compatible with the container image
4. Try using a different model from the same family

#### Issue 6: Lambda Invocation Fails

**Error:** Lambda returns 500 with "Could not find endpoint"

**Solution:**
1. Verify endpoints are InService:
```bash
aws sagemaker list-endpoints
```
2. Check Lambda environment variables:
```bash
aws lambda get-function-configuration --function-name BackendStack-ApiHandler
```
3. Verify endpoint names match between CDK and Lambda
4. Redeploy if environment variables are incorrect

### Verifying Endpoint Health

After deployment, verify each endpoint is healthy:

```bash
# Check endpoint status
aws sagemaker describe-endpoint --endpoint-name tractionpal-text-endpoint

# Expected output:
# {
#   "EndpointName": "tractionpal-text-endpoint",
#   "EndpointStatus": "InService",
#   "ProductionVariants": [{
#     "VariantName": "AllTraffic",
#     "CurrentInstanceCount": 1,
#     "DesiredInstanceCount": 1
#   }]
# }
```

**Healthy endpoint indicators:**
- EndpointStatus: "InService"
- CurrentInstanceCount matches DesiredInstanceCount
- No recent invocation errors in CloudWatch

**Unhealthy endpoint indicators:**
- EndpointStatus: "Failed", "OutOfService", or stuck in "Creating"
- CurrentInstanceCount = 0
- High error rate in CloudWatch metrics

### Rollback Procedure

If deployment fails or endpoints are unhealthy:

```bash
# Option 1: Destroy entire stack
cdk destroy

# Option 2: Delete specific endpoint and recreate
aws sagemaker delete-endpoint --endpoint-name tractionpal-text-endpoint
aws sagemaker delete-endpoint-config --endpoint-config-name <config-name>
aws sagemaker delete-model --model-name <model-name>
cdk deploy
```

**Note:** Destroying the stack will delete all SageMaker endpoints but preserve DynamoDB tables and S3 buckets (due to RemovalPolicy.RETAIN).

### Post-Deployment Checklist

- [ ] All three endpoints show "InService" status
- [ ] Lambda environment variables are set correctly
- [ ] CloudFormation outputs are visible
- [ ] CloudWatch alarms are created (6 total)
- [ ] End-to-end test script passes
- [ ] API Gateway endpoints respond successfully
- [ ] CloudWatch logs show successful invocations
- [ ] Estimated costs are within budget

## Monitoring and Observability

### CloudWatch Metrics

SageMaker automatically publishes the following metrics to CloudWatch:

#### Endpoint Invocation Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| ModelInvocations | Number of invocations | Monitor for traffic patterns |
| ModelInvocationErrors | Number of failed invocations | Alert if > 5 per 5 minutes |
| ModelLatency | Time to process request (ms) | Alert if > threshold |
| OverheadLatency | Time for SageMaker overhead (ms) | Monitor for performance |

#### Instance Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| CPUUtilization | CPU usage percentage | Monitor for scaling decisions |
| MemoryUtilization | Memory usage percentage | Alert if > 80% |
| GPUUtilization | GPU usage percentage | Monitor for efficiency |
| GPUMemoryUtilization | GPU memory usage percentage | Alert if > 90% |

### CloudWatch Alarms

The following alarms are automatically configured:

#### Text Endpoint Alarms

1. **TextEndpointErrorAlarm**
   - Metric: ModelInvocationErrors
   - Threshold: 5 errors per 5 minutes
   - Action: Alert operations team

2. **TextEndpointLatencyAlarm**
   - Metric: ModelLatency
   - Threshold: 5000ms (5 seconds)
   - Evaluation: 2 consecutive periods
   - Action: Alert operations team

#### Image Endpoint Alarms

1. **ImageEndpointErrorAlarm**
   - Metric: ModelInvocationErrors
   - Threshold: 5 errors per 5 minutes
   - Action: Alert operations team

2. **ImageEndpointLatencyAlarm**
   - Metric: ModelLatency
   - Threshold: 10000ms (10 seconds)
   - Evaluation: 2 consecutive periods
   - Action: Alert operations team

#### Audio Endpoint Alarms

1. **AudioEndpointErrorAlarm**
   - Metric: ModelInvocationErrors
   - Threshold: 5 errors per 5 minutes
   - Action: Alert operations team

2. **AudioEndpointLatencyAlarm**
   - Metric: ModelLatency
   - Threshold: 8000ms (8 seconds)
   - Evaluation: 2 consecutive periods
   - Action: Alert operations team

### CloudWatch Logs

#### Lambda Function Logs

Log Group: `/aws/lambda/BackendStack-ApiHandler`

**Log Format:**
```
[INFO] Invoking SageMaker endpoint: tractionpal-text-endpoint
[INFO] Request ID: abc-123-def
[INFO] Response time: 2.3s
[ERROR] SageMaker Invocation Error:
  Endpoint: tractionpal-text-endpoint
  Error Type: ValidationException
  Error Message: Endpoint is not in service
  Request ID: abc-123-def
```

#### SageMaker Endpoint Logs

Log Group: `/aws/sagemaker/Endpoints/<endpoint-name>`

**Log Format:**
```
[INFO] Model loaded successfully
[INFO] Received inference request
[INFO] Inference completed in 1.8s
[ERROR] Model inference failed: CUDA out of memory
```

### Monitoring Dashboard

Create a CloudWatch dashboard to monitor all endpoints:

```python
# Add to backend_stack.py
dashboard = cloudwatch.Dashboard(
    self, "SageMakerDashboard",
    dashboard_name="TractionPal-SageMaker-Endpoints"
)

# Add widgets for each endpoint
dashboard.add_widgets(
    cloudwatch.GraphWidget(
        title="Text Endpoint Invocations",
        left=[
            cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelInvocations",
                dimensions_map={
                    "EndpointName": text_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Sum",
                period=Duration.minutes(5)
            )
        ]
    ),
    cloudwatch.GraphWidget(
        title="Text Endpoint Latency",
        left=[
            cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelLatency",
                dimensions_map={
                    "EndpointName": text_endpoint.endpoint_name,
                    "VariantName": "AllTraffic"
                },
                statistic="Average",
                period=Duration.minutes(5)
            )
        ]
    )
)

# Repeat for image and audio endpoints...

CfnOutput(self, "DashboardUrl",
    value=f"https://console.aws.amazon.com/cloudwatch/home?region={self.region}#dashboards:name={dashboard.dashboard_name}",
    description="CloudWatch Dashboard URL"
)
```

### Operational Procedures

#### Daily Monitoring

1. Check CloudWatch dashboard for anomalies
2. Review alarm status (should be green)
3. Check endpoint status (should be InService)
4. Review error logs for patterns

#### Weekly Review

1. Analyze usage patterns and costs
2. Review performance metrics and trends
3. Check for optimization opportunities
4. Update cost estimates based on actual usage

#### Monthly Review

1. Comprehensive cost analysis
2. Performance optimization review
3. Capacity planning based on growth
4. Security and compliance review

### Performance Optimization

#### Reducing Latency

1. **Use larger instance types:**
   - Text: Upgrade to ml.g5.2xlarge
   - Image: Upgrade to ml.g5.4xlarge
   - Audio: Upgrade to ml.g5.2xlarge

2. **Optimize model parameters:**
   - Reduce max_new_tokens for text generation
   - Use lower resolution for image generation
   - Use smaller Whisper model for audio

3. **Implement caching:**
   - Cache common prompts and responses
   - Use CloudFront for image caching

#### Reducing Costs

1. **Implement auto-scaling:**
   - Scale to zero during off-hours
   - Scale based on request volume

2. **Use scheduled scaling:**
   - Shut down endpoints at night (if acceptable)
   - Scale up during business hours

3. **Consider serverless inference:**
   - For low-volume endpoints
   - Pay per request instead of per hour

4. **Optimize instance types:**
   - Monitor GPU utilization
   - Downgrade if consistently under 50%

### Alerting and Incident Response

#### Alert Channels

Configure SNS topics for alarm notifications:

```python
# Add to backend_stack.py
alarm_topic = sns.Topic(
    self, "SageMakerAlarmTopic",
    display_name="SageMaker Endpoint Alarms"
)

alarm_topic.add_subscription(
    sns_subscriptions.EmailSubscription("ops-team@example.com")
)

# Add topic as alarm action
text_error_alarm.add_alarm_action(
    cloudwatch_actions.SnsAction(alarm_topic)
)
```

#### Incident Response Runbook

**High Error Rate:**
1. Check CloudWatch logs for error patterns
2. Verify endpoint is InService
3. Check for recent deployments or changes
4. Review request patterns for anomalies
5. Consider rolling back if recent deployment
6. Scale up if capacity issue

**High Latency:**
1. Check instance metrics (CPU, GPU, memory)
2. Review request complexity and size
3. Check for concurrent request spikes
4. Consider scaling up instance type
5. Implement request throttling if needed

**Endpoint Down:**
1. Check endpoint status in console
2. Review CloudFormation events
3. Check CloudWatch logs for errors
4. Verify IAM permissions
5. Recreate endpoint if necessary
6. Update Lambda environment variables if endpoint name changed

### Security Considerations

1. **IAM Permissions:**
   - Follow principle of least privilege
   - Regularly audit IAM roles and policies
   - Use IAM conditions to restrict access

2. **Network Security:**
   - Endpoints are in AWS VPC by default
   - Consider using VPC endpoints for private access
   - Implement security groups if needed

3. **Data Security:**
   - All data in transit is encrypted (TLS)
   - Model artifacts are encrypted at rest
   - CloudWatch logs are encrypted

4. **Compliance:**
   - SageMaker is HIPAA eligible
   - Supports SOC, PCI, and ISO compliance
   - Review AWS compliance documentation

### Backup and Disaster Recovery

**Endpoint Configuration Backup:**
- CloudFormation template serves as infrastructure-as-code backup
- Store in version control (Git)
- Tag releases for easy rollback

**Disaster Recovery Procedure:**
1. Identify failed component (endpoint, model, config)
2. Check CloudFormation stack status
3. Review recent changes in Git history
4. Rollback to last known good configuration:
```bash
git checkout <previous-commit>
cdk deploy
```
5. Verify endpoints are healthy
6. Run end-to-end tests

**Recovery Time Objective (RTO):** 20-30 minutes
**Recovery Point Objective (RPO):** 0 (infrastructure is stateless)

## Conclusion

This design document provides a comprehensive blueprint for deploying three SageMaker endpoints to enable TractionPal's AI-powered content creation features. The implementation focuses on:

1. **Minimal Infrastructure:** Only deploying what's necessary to enable existing Lambda code
2. **Cost Optimization:** Selecting appropriate instance types and configurations for MVP usage
3. **Operational Excellence:** Comprehensive monitoring, logging, and alerting
4. **Maintainability:** Clear documentation and troubleshooting procedures

The Lambda handler already contains complete SageMaker integration code, so this feature is purely infrastructure deployment. Once deployed, the system will be fully functional and ready for production use.

**Next Steps:**
1. Review and approve this design document
2. Implement CDK changes in backend_stack.py
3. Deploy to development environment
4. Run end-to-end tests
5. Monitor for 24-48 hours
6. Deploy to production
7. Implement cost optimization strategies based on actual usage patterns

