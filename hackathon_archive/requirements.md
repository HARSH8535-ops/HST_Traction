# Requirements Document: Bedrock to SageMaker Migration

## Introduction

TractionPal is an AI-powered content creation platform for social media creators. The current implementation uses AWS Bedrock for AI inference, but Bedrock is not accessible in the deployed AWS account due to permission restrictions.

**CURRENT STATE:**
- The Lambda handler (main.py) ALREADY has complete SageMaker integration code
- The Lambda expects three SageMaker endpoints via environment variables (text, image, audio)
- The Lambda IAM role already has SageMaker invoke permissions
- The API contract (/api/bedrock endpoints) is maintained for backward compatibility
- NO SageMaker endpoints are currently deployed

**WHAT THIS FEATURE DOES:**
This feature deploys the missing SageMaker infrastructure (endpoints with Hugging Face models) via CDK, enabling the existing Lambda handler to function. The Lambda code is already written and tested - we just need to deploy the endpoints it expects.

The deployment must minimize infrastructure costs while providing acceptable performance for MVP usage.

## Glossary

- **BackendStack**: The CDK stack (backend_stack.py) that defines the Lambda, API Gateway, DynamoDB tables, and will host SageMaker endpoints
- **SageMaker_Endpoint**: An Amazon SageMaker real-time inference endpoint hosting a Hugging Face model
- **Text_Endpoint**: SageMaker endpoint for text generation (environment variable: SAGEMAKER_TEXT_ENDPOINT_NAME)
- **Image_Endpoint**: SageMaker endpoint for image generation (environment variable: SAGEMAKER_IMAGE_ENDPOINT_NAME)
- **Audio_Endpoint**: SageMaker endpoint for audio transcription (environment variable: SAGEMAKER_AUDIO_ENDPOINT_NAME)
- **Lambda_Handler**: The existing AWS Lambda function (main.py) that already has SageMaker integration code
- **Endpoint_Health**: The operational status of a SageMaker endpoint (InService, Creating, Failed, etc.)
- **HuggingFace_Model**: A pre-trained model from Hugging Face Hub deployed to SageMaker
- **Instance_Type**: The EC2 instance type used for SageMaker endpoint hosting (e.g., ml.g5.xlarge)
- **CloudFormation_Output**: Stack output values that expose endpoint names for reference

## Requirements

### Requirement 1: Deploy Text Generation Endpoint

**User Story:** As a platform operator, I want a text generation SageMaker endpoint deployed, so that the Lambda handler can process text-based AI requests.

#### Acceptance Criteria

1. THE BackendStack SHALL create one Text_Endpoint using a HuggingFace_Model suitable for instruction-following
2. THE BackendStack SHALL configure the Text_Endpoint with an appropriate Instance_Type (ml.g5.xlarge or ml.g5.2xlarge)
3. THE BackendStack SHALL set the Lambda environment variable SAGEMAKER_TEXT_ENDPOINT_NAME to the deployed endpoint name
4. THE BackendStack SHALL output the Text_Endpoint name as a CloudFormation_Output
5. WHEN the BackendStack is deployed, THE Text_Endpoint SHALL reach InService state
6. THE Text_Endpoint SHALL support models compatible with Mistral-7B-Instruct, Mixtral-8x7B-Instruct, or Llama-2-13B prompt formats

### Requirement 2: Deploy Image Generation Endpoint

**User Story:** As a platform operator, I want an image generation SageMaker endpoint deployed, so that the Lambda handler can generate thumbnail images.

#### Acceptance Criteria

1. THE BackendStack SHALL create one Image_Endpoint using a HuggingFace_Model for image generation
2. THE BackendStack SHALL configure the Image_Endpoint with an appropriate Instance_Type (ml.g5.2xlarge or larger)
3. THE BackendStack SHALL set the Lambda environment variable SAGEMAKER_IMAGE_ENDPOINT_NAME to the deployed endpoint name
4. THE BackendStack SHALL output the Image_Endpoint name as a CloudFormation_Output
5. WHEN the BackendStack is deployed, THE Image_Endpoint SHALL reach InService state
6. THE Image_Endpoint SHALL return JPEG-formatted image data when invoked

### Requirement 3: Deploy Audio Transcription Endpoint

**User Story:** As a platform operator, I want an audio transcription SageMaker endpoint deployed, so that the Lambda handler can transcribe voice recordings.

#### Acceptance Criteria

1. THE BackendStack SHALL create one Audio_Endpoint using a HuggingFace_Model for speech-to-text
2. THE BackendStack SHALL configure the Audio_Endpoint with an appropriate Instance_Type
3. THE BackendStack SHALL set the Lambda environment variable SAGEMAKER_AUDIO_ENDPOINT_NAME to the deployed endpoint name
4. THE BackendStack SHALL output the Audio_Endpoint name as a CloudFormation_Output
5. WHEN the BackendStack is deployed, THE Audio_Endpoint SHALL reach InService state
6. THE Audio_Endpoint SHALL accept audio data in common formats (webm, mp3, wav) and return JSON with transcribed text

### Requirement 4: Model Selection and Configuration

**User Story:** As a platform operator, I want appropriate Hugging Face models selected for each endpoint, so that the system balances quality, cost, and performance.

#### Acceptance Criteria

1. THE BackendStack SHALL select a HuggingFace_Model compatible with instruction-following for the Text_Endpoint (e.g., Mistral-7B-Instruct, Mixtral-8x7B-Instruct, Llama-2-13B)
2. THE BackendStack SHALL select a HuggingFace_Model for image generation for the Image_Endpoint (e.g., Stable Diffusion XL, Stable Diffusion 2.1)
3. THE BackendStack SHALL select a HuggingFace_Model for speech-to-text for the Audio_Endpoint (e.g., Whisper-large-v3, Whisper-medium)
4. WHERE a model is not available via SageMaker JumpStart, THE BackendStack SHALL use a compatible alternative from Hugging Face Hub
5. THE BackendStack SHALL configure Instance_Type selections appropriate for model size and expected load
6. THE BackendStack SHALL document the selected models and rationale in CloudFormation_Output descriptions

### Requirement 5: Cost Optimization

**User Story:** As a platform operator, I want to minimize infrastructure costs, so that the MVP remains financially sustainable.

#### Acceptance Criteria

1. THE BackendStack SHALL configure all SageMaker_Endpoints with minimum instance count of 1
2. THE BackendStack SHALL use the smallest Instance_Type that provides acceptable performance for each model
3. THE BackendStack SHALL configure appropriate timeout values to prevent long-running inference costs
4. WHERE auto-scaling is configured, THE BackendStack SHALL set conservative scaling thresholds
5. THE BackendStack SHALL document estimated monthly costs for typical MVP usage in deployment documentation

### Requirement 6: Verify Existing Lambda Integration

**User Story:** As a developer, I want to verify the existing Lambda handler works with deployed endpoints, so that I can confirm no code changes are needed.

#### Acceptance Criteria

1. WHEN the Text_Endpoint is deployed, THE Lambda_Handler SHALL successfully invoke it for text generation requests
2. WHEN the Image_Endpoint is deployed, THE Lambda_Handler SHALL successfully invoke it for image generation requests
3. WHEN the Audio_Endpoint is deployed, THE Lambda_Handler SHALL successfully invoke it for audio transcription requests
4. THE Lambda_Handler SHALL correctly format prompts for the deployed HuggingFace_Model on each endpoint
5. THE Lambda_Handler SHALL correctly parse responses from each SageMaker_Endpoint
6. IF the Lambda_Handler fails to invoke an endpoint, THEN error messages SHALL indicate whether the issue is endpoint configuration or Lambda code

### Requirement 7: End-to-End Testing

**User Story:** As a developer, I want to test all AI features end-to-end, so that I can confirm the deployment is successful.

#### Acceptance Criteria

1. THE BackendStack deployment SHALL include a test script that invokes each AI feature via the API Gateway
2. THE test script SHALL verify text generation for content analysis returns valid results
3. THE test script SHALL verify text generation for script development returns formatted scripts
4. THE test script SHALL verify image generation returns valid base64-encoded JPEG images
5. THE test script SHALL verify audio transcription returns transcribed text from sample audio
6. THE test script SHALL measure and report response times for each feature
7. THE test script SHALL verify the /api/bedrock endpoint maintains backward compatibility
8. IF any test fails, THEN THE test script SHALL provide detailed error information including endpoint status

### Requirement 8: Deployment Documentation

**User Story:** As a developer, I want clear deployment instructions, so that I can deploy and troubleshoot the SageMaker endpoints.

#### Acceptance Criteria

1. THE BackendStack SHALL include a deployment guide with step-by-step CDK deployment instructions
2. THE deployment guide SHALL document all environment variables used for endpoint configuration
3. THE deployment guide SHALL document the selected models and their capabilities
4. THE deployment guide SHALL document estimated deployment time for SageMaker endpoints
5. THE deployment guide SHALL document estimated monthly costs for typical usage
6. THE deployment guide SHALL provide troubleshooting guidance for common deployment failures
7. THE deployment guide SHALL document how to verify endpoint health after deployment

### Requirement 9: Monitoring and Observability

**User Story:** As a platform operator, I want to monitor endpoint health and performance, so that I can detect and respond to issues.

#### Acceptance Criteria

1. THE BackendStack SHALL configure CloudWatch alarms for each SageMaker_Endpoint
2. THE BackendStack SHALL create alarms for endpoint invocation errors exceeding 5% error rate
3. THE BackendStack SHALL create alarms for endpoint invocation latency exceeding expected thresholds
4. THE BackendStack SHALL configure CloudWatch Logs for all SageMaker_Endpoint invocations
5. THE Lambda_Handler SHALL log all SageMaker invocation errors with request details to CloudWatch
6. THE BackendStack SHALL output CloudWatch dashboard URLs as CloudFormation_Output values
