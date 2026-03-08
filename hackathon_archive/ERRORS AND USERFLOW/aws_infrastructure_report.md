# AWS Architecture Report

## Overview
The `backend_service` folder contains AWS CDK (Cloud Development Kit) configurations to provision the cloud infrastructure for the HST Traction project. The infrastructure is divided into two primary stacks: completely automated serverless AWS resources and AI endpoint integrations.

## 1. BackendStack
Responsible for the core API endpoints, database, and frontend hosting.

### Resources:
- **DynamoDB Tables**:
  - `UsageMetricsTable` (agentId, timestamp)
  - `AgentsTable` (userId, id)
  - `DeploymentsTable` (agentId, environment)
  - `TrainingJobsTable` (agentId, id)
- **S3 Bucket**:
  - `TractionPalSiteBucket`: Configured for static website hosting (frontend).
- **Lambda Function (`ApiHandler`)**: 
  - Written in Python 3.12 ([src/api_handlers/main.py](file:///c:/Users/calli/OneDrive/Desktop/CSE/HST_Traction/backend_service/src/api_handlers/main.py)).
  - Acts as a proxy for the primary API endpoints (handling `/api/bedrock`, `/api/metrics`, `/api/agents`, `/api/deployments`, etc.).
  - Invokes Hugging Face endpoints hosted on AWS SageMaker (`hf-text-endpoint`, `hf-image-endpoint`, `hf-audio-endpoint`).
  - Contains extensive prompt handling for different analysis tasks (e.g., content analysis, emotional alignment) using Mistral and Llama models.
- **API Gateway**:
  - `TractionPalApi` exposes the API Handler Lambda to the web with CORS configured.

---

## 2. VideoGeneratorStack
Responsible for an asynchronous video generation pipeline.

### Resources:
- **S3 Buckets**:
  - `InputBucket`: Receives video scripts.
  - `AssetsBucket`: Intermediate assets (scenes, images).
  - `OutputBucket`: Final rendered video outputs.
- **DynamoDB Table**:
  - `RequestTable`: Tracks the status of video generation requests.
- **Lambda Functions** (`src/video_pipeline/`):
  - `SubmitFunction`: Validates requests and starts the process.
  - `ParseFunction`: Triggered by S3 upload to `InputBucket`.
  - `GenerateFunction`: Triggered by [.json](file:///c:/Users/calli/OneDrive/Desktop/CSE/HST_Traction/logs.json) scene uploads. Uses Hugging Face API or Bedrock (Stable Diffusion XL) for image generation.
  - `RenderFunction`: Triggered by final image generations to compile the video.
  - `StatusFunction` & `DownloadFunction`: Check status and retrieve outputs.
- **API Gateway**:
  - `script-preview-api` with usage plans and API Keys for submission, status checking, and downloading.

## Summary of Functionality
The repo uses AWS API Gateway + Lambda + DynamoDB for a robust serverless architecture. Key AI processing is routed from the primary `ApiHandler` to custom SageMaker endpoints. The video generation features act via an event-driven architecture using S3 Triggers across 4 Lambda functions.

- Reviewing the [handler_submit.py](file:///c:/Users/calli/OneDrive/Desktop/CSE/HST_Traction/backend_service/src/video_pipeline/handler_submit.py), it imports a `validation` module (`from validation import validate_request`) which is currently missing from the codebase. The video generation pipeline is currently broken due to this missing import.
- The repository only contains a single infrastructure test [test_backend_stack.py](file:///c:/Users/calli/OneDrive/Desktop/CSE/HST_Traction/backend_service/tests/unit/test_backend_stack.py) for CDK configurations. There are no functional logic or unit tests for the Lambda endpoints.
- Therefore, while the deployment definition structure is solid, the logic for video generation ([handler_submit.py](file:///c:/Users/calli/OneDrive/Desktop/CSE/HST_Traction/backend_service/src/video_pipeline/handler_submit.py)) will definitely throw a `ModuleNotFoundError` during execution.
