# Implementation Plan: Bedrock to SageMaker Migration

## Overview

This implementation plan deploys three SageMaker endpoints (text, image, audio) via AWS CDK to enable TractionPal's AI-powered content creation features. The Lambda handler already contains complete SageMaker integration code - this plan focuses solely on deploying the missing infrastructure.

**Key Implementation Areas:**
- CDK infrastructure changes in backend_stack.py
- SageMaker endpoint deployment (3 endpoints with Hugging Face models)
- CloudWatch monitoring and alarms
- Testing infrastructure (unit, integration, end-to-end)
- Deployment documentation

**Estimated Deployment Time:** 15-20 minutes for SageMaker endpoints to reach InService
**Estimated Monthly Cost:** ~$2,541 (Text: $725, Image: $1,091, Audio: $725)

## Tasks

- [ ] 1. Set up CDK infrastructure for SageMaker endpoints
  - [ ] 1.1 Add SageMaker imports and create execution role
    - Add `aws_sagemaker` import to backend_stack.py
    - Create SageMaker execution role with AmazonSageMakerFullAccess policy
    - Add `aws_cloudwatch` import for monitoring
    - _Requirements: 1.1, 2.1, 3.1_

  - [ ] 1.2 Create text generation endpoint infrastructure
    - Create CfnModel for Mistral-7B-Instruct-v0.2 with TGI container
    - Create CfnEndpointConfig with ml.g5.xlarge instance type
    - Create CfnEndpoint with name "tractionpal-text-endpoint"
    - Configure environment variables: HF_MODEL_ID, HF_TASK, MAX_INPUT_LENGTH, MAX_TOTAL_TOKENS
    - _Requirements: 1.1, 1.2, 4.1, 4.5, 5.2_

  - [ ] 1.3 Create image generation endpoint infrastructure
    - Create CfnModel for Stable Diffusion XL 1.0 with HuggingFace container
    - Create CfnEndpointConfig with ml.g5.2xlarge instance type
    - Create CfnEndpoint with name "tractionpal-image-endpoint"
    - Configure environment variables: HF_MODEL_ID, HF_TASK
    - _Requirements: 2.1, 2.2, 4.2, 4.5, 5.2_

  - [ ] 1.4 Create audio transcription endpoint infrastructure
    - Create CfnModel for Whisper Large v3 with HuggingFace container
    - Create CfnEndpointConfig with ml.g5.xlarge instance type
    - Create CfnEndpoint with name "tractionpal-audio-endpoint"
    - Configure environment variables: HF_MODEL_ID, HF_TASK
    - _Requirements: 3.1, 3.2, 4.3, 4.5, 5.2_

- [ ] 2. Configure Lambda environment variables and outputs
  - [ ] 2.1 Update Lambda function environment variables
    - Add SAGEMAKER_TEXT_ENDPOINT_NAME pointing to text endpoint
    - Add SAGEMAKER_IMAGE_ENDPOINT_NAME pointing to image endpoint
    - Add SAGEMAKER_AUDIO_ENDPOINT_NAME pointing to audio endpoint
    - _Requirements: 1.3, 2.3, 3.3_

  - [ ] 2.2 Add CloudFormation outputs
    - Create output for TextEndpointName with model description
    - Create output for ImageEndpointName with model description
    - Create output for AudioEndpointName with model description
    - Create output for EstimatedMonthlyCost with breakdown
    - _Requirements: 1.4, 2.4, 3.4, 4.6, 5.5_

- [ ] 3. Implement CloudWatch monitoring and alarms
  - [ ] 3.1 Create CloudWatch alarms for text endpoint
    - Create ModelInvocationErrors alarm (threshold: 5 errors per 5 minutes)
    - Create ModelLatency alarm (threshold: 5000ms, 2 evaluation periods)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 3.2 Create CloudWatch alarms for image endpoint
    - Create ModelInvocationErrors alarm (threshold: 5 errors per 5 minutes)
    - Create ModelLatency alarm (threshold: 10000ms, 2 evaluation periods)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 3.3 Create CloudWatch alarms for audio endpoint
    - Create ModelInvocationErrors alarm (threshold: 5 errors per 5 minutes)
    - Create ModelLatency alarm (threshold: 8000ms, 2 evaluation periods)
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 4. Checkpoint - Verify CDK synthesis
  - Ensure CDK code synthesizes without errors: `cdk synth`
  - Review generated CloudFormation template for correctness
  - Ensure all tests pass, ask the user if questions arise

- [ ] 5. Create unit tests for CDK constructs
  - [ ]* 5.1 Write unit test for SageMaker role creation
    - Test IAM role has correct assume role policy for sagemaker.amazonaws.com
    - Test role has AmazonSageMakerFullAccess managed policy attached
    - _Requirements: 1.1, 2.1, 3.1_

  - [ ]* 5.2 Write unit test for text endpoint configuration
    - Test CfnEndpointConfig has ml.g5.xlarge instance type
    - Test initial instance count is 1
    - Test endpoint name is "tractionpal-text-endpoint"
    - _Requirements: 1.1, 1.2, 5.1, 5.2_

  - [ ]* 5.3 Write unit test for image endpoint configuration
    - Test CfnEndpointConfig has ml.g5.2xlarge instance type
    - Test initial instance count is 1
    - Test endpoint name is "tractionpal-image-endpoint"
    - _Requirements: 2.1, 2.2, 5.1, 5.2_

  - [ ]* 5.4 Write unit test for audio endpoint configuration
    - Test CfnEndpointConfig has ml.g5.xlarge instance type
    - Test initial instance count is 1
    - Test endpoint name is "tractionpal-audio-endpoint"
    - _Requirements: 3.1, 3.2, 5.1, 5.2_

  - [ ]* 5.5 Write unit test for Lambda environment variables
    - Test Lambda function has SAGEMAKER_TEXT_ENDPOINT_NAME variable
    - Test Lambda function has SAGEMAKER_IMAGE_ENDPOINT_NAME variable
    - Test Lambda function has SAGEMAKER_AUDIO_ENDPOINT_NAME variable
    - _Requirements: 1.3, 2.3, 3.3_

  - [ ]* 5.6 Write unit test for CloudWatch alarms
    - Test 6 CloudWatch alarms are created (2 per endpoint)
    - Test error alarms have correct threshold (5 errors per 5 minutes)
    - Test latency alarms have correct thresholds (5s, 10s, 8s)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 5.7 Write unit test for CloudFormation outputs
    - Test TextEndpointName output exists
    - Test ImageEndpointName output exists
    - Test AudioEndpointName output exists
    - Test EstimatedMonthlyCost output exists
    - _Requirements: 1.4, 2.4, 3.4, 4.6_

- [ ] 6. Create integration tests for deployed endpoints
  - [ ]* 6.1 Write integration test for text endpoint status
    - Test endpoint exists and status is "InService"
    - Test endpoint uses ml.g5.xlarge instance type
    - Test current instance count is 1
    - _Requirements: 1.5, 1.6_

  - [ ]* 6.2 Write integration test for text generation via API
    - Send POST request to /api/bedrock with text generation payload
    - Verify response status is 200
    - Verify response contains "result" field with non-empty text
    - Verify response time is under 5 seconds
    - _Requirements: 6.1, 6.4, 6.5, 7.2_

  - [ ]* 6.3 Write integration test for image endpoint status
    - Test endpoint exists and status is "InService"
    - Test endpoint uses ml.g5.2xlarge instance type
    - Test current instance count is 1
    - _Requirements: 2.5, 2.6_

  - [ ]* 6.4 Write integration test for image generation via API
    - Send POST request to /api/bedrock with image generation payload
    - Verify response status is 200
    - Verify response contains base64-encoded JPEG image
    - Verify response has "isImage": true flag
    - Verify response time is under 15 seconds
    - _Requirements: 6.2, 6.4, 6.5, 7.4_

  - [ ]* 6.5 Write integration test for audio endpoint status
    - Test endpoint exists and status is "InService"
    - Test endpoint uses ml.g5.xlarge instance type
    - Test current instance count is 1
    - _Requirements: 3.5, 3.6_

  - [ ]* 6.6 Write integration test for audio transcription via API
    - Send POST request to /api/bedrock/audio with audio payload
    - Verify response status is 200
    - Verify response contains "text" field with transcribed text
    - Verify response time is under 10 seconds
    - _Requirements: 6.3, 6.4, 6.5, 7.5_

  - [ ]* 6.7 Write integration test for CloudWatch alarms
    - Query CloudWatch alarms and verify 6 alarms exist
    - Verify alarms for text, image, and audio endpoints (error + latency)
    - Verify alarm thresholds match design specifications
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 6.8 Write integration test for response time benchmarks
    - Test text generation completes in 2-5 seconds
    - Test image generation completes in 8-15 seconds
    - Test audio transcription completes in 3-8 seconds
    - _Requirements: 7.6_

- [ ] 7. Create end-to-end test script
  - [ ] 7.1 Create test_endpoints.py script
    - Implement test_text_generation() function with timing
    - Implement test_image_generation() function with timing
    - Implement test_audio_transcription() function (with note about sample audio)
    - Add main() function with command-line argument parsing
    - Add test summary reporting with pass/fail status
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 8. Create deployment documentation
  - [ ] 8.1 Create DEPLOYMENT.md with prerequisites and steps
    - Document prerequisites (AWS CLI, CDK, Python 3.12, service quotas)
    - Document step-by-step deployment instructions (8 steps)
    - Document environment variables and their purposes
    - Document deployed models and their capabilities
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 8.2 Add cost estimates and deployment timing to documentation
    - Document estimated monthly costs ($2,541 breakdown)
    - Document cost per request estimates
    - Document estimated deployment time (15-20 minutes)
    - Document timeline for each endpoint creation
    - _Requirements: 5.5, 8.5_

  - [ ] 8.3 Add troubleshooting guide to documentation
    - Document 6 common issues with solutions (quota, image, IAM, timeout, model, Lambda)
    - Document endpoint health verification procedures
    - Document rollback procedures
    - Add post-deployment checklist
    - _Requirements: 8.6, 8.7_

- [ ] 9. Checkpoint - Review documentation
  - Ensure all documentation is complete and accurate
  - Verify deployment steps are clear and actionable
  - Ensure all tests pass, ask the user if questions arise

- [ ] 10. Deploy stack to AWS
  - [ ] 10.1 Synthesize and validate CloudFormation template
    - Run `cdk synth` to generate CloudFormation template
    - Review template for correctness
    - Verify all resources are defined correctly
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

  - [ ] 10.2 Deploy CDK stack to AWS
    - Run `cdk deploy` to deploy infrastructure
    - Monitor deployment progress (15-20 minutes expected)
    - Verify CloudFormation stack completes successfully
    - _Requirements: 1.5, 2.5, 3.5_

  - [ ] 10.3 Verify endpoints reach InService status
    - Check text endpoint status with `aws sagemaker describe-endpoint`
    - Check image endpoint status with `aws sagemaker describe-endpoint`
    - Check audio endpoint status with `aws sagemaker describe-endpoint`
    - Verify all endpoints show "EndpointStatus": "InService"
    - _Requirements: 1.5, 2.5, 3.5_

  - [ ] 10.4 Verify CloudFormation outputs
    - Query stack outputs with `aws cloudformation describe-stacks`
    - Verify TextEndpointName, ImageEndpointName, AudioEndpointName outputs exist
    - Verify EstimatedMonthlyCost output exists
    - _Requirements: 1.4, 2.4, 3.4, 4.6_

- [ ] 11. Run end-to-end verification tests
  - [ ] 11.1 Run end-to-end test script
    - Get API Gateway URL from CloudFormation outputs
    - Run `python test_endpoints.py $API_URL`
    - Verify all tests pass (text, image, audio)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.8_

  - [ ] 11.2 Verify monitoring is operational
    - Check CloudWatch logs for Lambda invocations
    - Verify SageMaker endpoint logs are being written
    - Verify CloudWatch alarms are in OK state
    - Check CloudWatch metrics for endpoint invocations
    - _Requirements: 9.4, 9.5, 9.6_

  - [ ] 11.3 Verify error handling
    - Test Lambda error handling with invalid requests
    - Verify error messages are clear and actionable
    - Verify CloudWatch logs contain detailed error information
    - _Requirements: 6.6, 9.5_

- [ ] 12. Final checkpoint - Production readiness
  - Ensure all endpoints are healthy and responding
  - Verify monitoring and alerting is configured correctly
  - Confirm estimated costs match expectations
  - Document any deviations from design specifications
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP deployment
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- The Lambda handler already has SageMaker integration code - no Lambda code changes needed
- Deployment requires AWS service quotas for SageMaker endpoints and GPU instances
- Total estimated deployment time: 15-20 minutes for endpoints to reach InService
- Integration tests (tasks 6.x) require deployed infrastructure and cannot run until task 10 is complete
- End-to-end test script (task 7.1) can be created before deployment but only executed after deployment
