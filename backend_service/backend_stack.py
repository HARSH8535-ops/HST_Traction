import os
import sys
from aws_cdk import (
    Duration,
    Stack,
    aws_apigateway as apigateway,
    aws_lambda as _lambda,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_sagemaker as sagemaker,
    aws_cloudwatch as cloudwatch,
    RemovalPolicy,
    CfnOutput
)
from constructs import Construct

# ---------------------------------------------------------------------------
# Container image URI for HuggingFace CPU inference (us-east-1)
# ---------------------------------------------------------------------------
HF_CPU_IMAGE = (
    "763104351884.dkr.ecr.{region}.amazonaws.com/"
    "huggingface-pytorch-inference:2.1.0-transformers4.37.0-cpu-py310-ubuntu22.04"
)

# Serverless inference configuration defaults
SERVERLESS_MEMORY_MB = 3072        # 3 GB – fits flan-t5-base & whisper-base
SERVERLESS_MAX_CONCURRENCY = 2     # Per-endpoint concurrency cap


class BackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ==================================================================
        # 1. DynamoDB Tables
        # ==================================================================
        metrics_table = dynamodb.Table(self, "UsageMetricsTable",
            partition_key=dynamodb.Attribute(name="agentId", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="timestamp", type=dynamodb.AttributeType.NUMBER),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        agents_table = dynamodb.Table(self, "AgentsTable",
            partition_key=dynamodb.Attribute(name="userId", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        deployments_table = dynamodb.Table(self, "DeploymentsTable",
            partition_key=dynamodb.Attribute(name="agentId", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="environment", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        training_jobs_table = dynamodb.Table(self, "TrainingJobsTable",
            partition_key=dynamodb.Attribute(name="agentId", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        # ==================================================================
        # 2. SageMaker Execution Role
        # ==================================================================
        sagemaker_role = iam.Role(
            self, "SageMakerExecutionRole",
            assumed_by=iam.ServicePrincipal("sagemaker.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSageMakerFullAccess")
            ]
        )

        container_image = HF_CPU_IMAGE.format(region=self.region)

        # ==================================================================
        # 3. Text Generation Endpoint  (google/flan-t5-base – serverless)
        # ==================================================================
        text_model = sagemaker.CfnModel(
            self, "TextGenerationModel",
            execution_role_arn=sagemaker_role.role_arn,
            primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
                image=container_image,
                environment={
                    "HF_MODEL_ID": "google/flan-t5-base",
                    "HF_TASK": "text2text-generation",
                    "SAGEMAKER_CONTAINER_LOG_LEVEL": "20"
                }
            )
        )

        text_endpoint_config = sagemaker.CfnEndpointConfig(
            self, "TextEndpointConfig",
            production_variants=[
                sagemaker.CfnEndpointConfig.ProductionVariantProperty(
                    variant_name="AllTraffic",
                    model_name=text_model.attr_model_name,
                    initial_variant_weight=1.0,
                    serverless_config=sagemaker.CfnEndpointConfig.ServerlessConfigProperty(
                        memory_size_in_mb=SERVERLESS_MEMORY_MB,
                        max_concurrency=SERVERLESS_MAX_CONCURRENCY
                    )
                )
            ]
        )

        text_endpoint = sagemaker.CfnEndpoint(
            self, "TextEndpoint",
            endpoint_config_name=text_endpoint_config.attr_endpoint_config_name,
            endpoint_name="tractionpal-text-endpoint"
        )


        # ==================================================================
        # 5. Audio Transcription Endpoint  (openai/whisper-base – serverless)
        # ==================================================================
        audio_model = sagemaker.CfnModel(
            self, "AudioTranscriptionModel",
            execution_role_arn=sagemaker_role.role_arn,
            primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
                image=container_image,
                environment={
                    "HF_MODEL_ID": "openai/whisper-base",
                    "HF_TASK": "automatic-speech-recognition",
                    "SAGEMAKER_CONTAINER_LOG_LEVEL": "20"
                }
            )
        )

        audio_endpoint_config = sagemaker.CfnEndpointConfig(
            self, "AudioEndpointConfig",
            production_variants=[
                sagemaker.CfnEndpointConfig.ProductionVariantProperty(
                    variant_name="AllTraffic",
                    model_name=audio_model.attr_model_name,
                    initial_variant_weight=1.0,
                    serverless_config=sagemaker.CfnEndpointConfig.ServerlessConfigProperty(
                        memory_size_in_mb=SERVERLESS_MEMORY_MB,
                        max_concurrency=SERVERLESS_MAX_CONCURRENCY
                    )
                )
            ]
        )

        audio_endpoint = sagemaker.CfnEndpoint(
            self, "AudioEndpoint",
            endpoint_config_name=audio_endpoint_config.attr_endpoint_config_name,
            endpoint_name="tractionpal-audio-endpoint"
        )

        # ==================================================================
        # 6. CloudWatch Alarms — error + latency per endpoint
        # ==================================================================

        # --- Text Endpoint Alarms ---
        cloudwatch.Alarm(
            self, "TextEndpointErrorAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelSetupTime",
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

        cloudwatch.Alarm(
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
            threshold=5000000,  # 5 seconds in microseconds (SageMaker reports µs)
            evaluation_periods=2,
            alarm_description="Text endpoint latency exceeds 5 seconds"
        )


        # --- Audio Endpoint Alarms ---
        cloudwatch.Alarm(
            self, "AudioEndpointErrorAlarm",
            metric=cloudwatch.Metric(
                namespace="AWS/SageMaker",
                metric_name="ModelSetupTime",
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

        cloudwatch.Alarm(
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
            threshold=8000000,  # 8 seconds in microseconds
            evaluation_periods=2,
            alarm_description="Audio endpoint latency exceeds 8 seconds"
        )

        # ==================================================================
        # 7. Allowed Origins
        # ==================================================================
        allowed_origins = ["https://hst-traction.vercel.app"]
        env_origins = os.environ.get("ALLOWED_ORIGINS")
        if env_origins:
            allowed_origins.extend([
                origin.strip().rstrip('/')
                for origin in env_origins.split(",")
                if origin.strip()
            ])
        allowed_origins = [origin.rstrip('/') for origin in allowed_origins]
        allowed_origins_str = ",".join(allowed_origins)

        # ==================================================================
        # 8. Lambda Function
        # ==================================================================
        api_handler = _lambda.Function(self, "ApiHandler",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="main.handler",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "src", "api_handlers")),
            timeout=Duration.seconds(60),   # Raised to 60s – image gen on serverless is slower
            memory_size=256,
            environment={
                "METRICS_TABLE_NAME": metrics_table.table_name,
                "AGENTS_TABLE_NAME": agents_table.table_name,
                "DEPLOYMENTS_TABLE_NAME": deployments_table.table_name,
                "TRAINING_JOBS_TABLE_NAME": training_jobs_table.table_name,
                "ALLOWED_ORIGINS": allowed_origins_str,
                "SAGEMAKER_TEXT_ENDPOINT_NAME": text_endpoint.endpoint_name,
                "SAGEMAKER_AUDIO_ENDPOINT_NAME": audio_endpoint.endpoint_name,
            }
        )

        # Grant Lambda permissions to read/write DynamoDB
        metrics_table.grant_read_write_data(api_handler)
        agents_table.grant_read_write_data(api_handler)
        deployments_table.grant_read_write_data(api_handler)
        training_jobs_table.grant_read_write_data(api_handler)

        # Grant Lambda permissions to invoke SageMaker endpoints
        api_handler.add_to_role_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=["sagemaker:InvokeEndpoint"],
            resources=["arn:aws:sagemaker:*:*:endpoint/*"]
        ))

        # ==================================================================
        # 9. S3 Bucket for Frontend Hosting
        # ==================================================================
        site_bucket = s3.Bucket(self, "TractionPalSiteBucket",
            versioned=False,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False
            ),
            website_index_document="index.html",
            website_error_document="index.html",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        site_bucket.add_to_resource_policy(iam.PolicyStatement(
            sid="PublicReadGetObject",
            effect=iam.Effect.ALLOW,
            principals=[iam.AnyPrincipal()],
            actions=["s3:GetObject"],
            resources=[site_bucket.arn_for_objects("*")]
        ))

        # ==================================================================
        # 10. API Gateway
        # ==================================================================
        api = apigateway.RestApi(self, "TractionPalApi",
            rest_api_name="TractionPal Service",
            description="Backend API for TractionPal MVP.",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=allowed_origins,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type", "X-Amz-Date", "Authorization",
                    "X-Api-Key", "X-Amz-Security-Token", "X-Amz-User-Agent"
                ]
            )
        )

        integration = apigateway.LambdaIntegration(api_handler)
        api.root.add_proxy(default_integration=integration, any_method=True)

        # ==================================================================
        # 11. CloudFormation Outputs
        # ==================================================================
        CfnOutput(self, "ApiEndpoint",
            value=api.url,
            description="API Gateway Endpoint URL"
        )

        CfnOutput(self, "CloudFrontUrl",
            value=site_bucket.bucket_website_url,
            description="CloudFront Distribution URL for the Frontend"
        )

        CfnOutput(self, "SiteBucketName",
            value=site_bucket.bucket_name,
            description="S3 Bucket Name for Frontend Deployment"
        )

        CfnOutput(self, "TextEndpointName",
            value=text_endpoint.endpoint_name,
            description="SageMaker Text Generation Endpoint (google/flan-t5-base – serverless)"
        )


        CfnOutput(self, "AudioEndpointName",
            value=audio_endpoint.endpoint_name,
            description="SageMaker Audio Transcription Endpoint (openai/whisper-base – serverless)"
        )

        CfnOutput(self, "EstimatedMonthlyCost",
            value="Serverless: Pay-per-use (~$0.0001/sec text, ~$0.0003/sec image, ~$0.0001/sec audio)",
            description="Estimated cost for serverless endpoint usage (no idle cost)"
        )
