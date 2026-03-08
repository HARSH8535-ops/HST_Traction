import os
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_dynamodb as dynamodb,
    aws_secretsmanager as secretsmanager,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_logs as logs,
    aws_kms as kms,
    aws_cloudwatch as cloudwatch,
    aws_s3_notifications as s3n,
    RemovalPolicy,
    Duration,
)
from constructs import Construct

class VideoGeneratorStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ----------------------------------------------------------------------
        # KMS Key for Log Encryption
        # ----------------------------------------------------------------------
        log_kms_key = kms.Key(
            self, "LogKmsKey",
            description="KMS key for encrypting Lambda and API Gateway logs",
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.RETAIN,
            policy=iam.PolicyDocument(
                statements=[
                    iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        principals=[iam.AccountRootPrincipal()],
                        actions=["kms:*"],
                        resources=["*"]
                    ),
                    iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        principals=[iam.ServicePrincipal("logs.amazonaws.com")],
                        actions=["kms:Decrypt", "kms:GenerateDataKey"],
                        resources=["*"]
                    )
                ]
            )
        )

        # ----------------------------------------------------------------------
        # S3 Buckets
        # ----------------------------------------------------------------------
        input_bucket = s3.Bucket(
            self, "InputBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=True,
            lifecycle_rules=[s3.LifecycleRule(id="7DayCleanup", expiration=Duration.days(7))],
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        assets_bucket = s3.Bucket(
            self, "AssetsBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=True,
            lifecycle_rules=[s3.LifecycleRule(id="7DayCleanup", expiration=Duration.days(7))],
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        output_bucket = s3.Bucket(
            self, "OutputBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=True,
            lifecycle_rules=[s3.LifecycleRule(id="7DayCleanup", expiration=Duration.days(7))],
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # ----------------------------------------------------------------------
        # DynamoDB Table
        # ----------------------------------------------------------------------
        request_table = dynamodb.Table(
            self, "RequestTable",
            partition_key=dynamodb.Attribute(name="request_id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
            time_to_live_attribute="ttl",
            removal_policy=RemovalPolicy.DESTROY
        )
        request_table.add_global_secondary_index(
            index_name="status-index",
            partition_key=dynamodb.Attribute(name="status", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # ----------------------------------------------------------------------
        # Secrets Manager
        # ----------------------------------------------------------------------
        api_keys_secret = secretsmanager.Secret(
            self, "ApiKeysSecret",
            description="API authentication key for Script-to-Video-Preview-Generator service",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template='{"api_key": "placeholder"}',
                generate_string_key="api_key",
                exclude_punctuation=True,
                include_space=False,
                password_length=32
            )
        )

        # ----------------------------------------------------------------------
        # CloudWatch Log Groups
        # ----------------------------------------------------------------------
        lambda_log_group = logs.LogGroup(
            self, "LambdaLogGroup",
            retention=logs.RetentionDays.TWO_WEEKS,
            removal_policy=RemovalPolicy.DESTROY
        )

        api_gateway_log_group = logs.LogGroup(
            self, "ApiGatewayLogGroup",
            retention=logs.RetentionDays.TWO_WEEKS,
            removal_policy=RemovalPolicy.DESTROY
        )

        # ----------------------------------------------------------------------
        # Common Lambda Configuration
        # ----------------------------------------------------------------------
        lambda_env = {
            "S3_INPUT_BUCKET": input_bucket.bucket_name,
            "S3_ASSETS_BUCKET": assets_bucket.bucket_name,
            "S3_OUTPUT_BUCKET": output_bucket.bucket_name,
            "DYNAMODB_TABLE": request_table.table_name,
            "BEDROCK_MODEL_ID": "stability.stable-diffusion-xl-v1",
            "API_KEYS_SECRET": api_keys_secret.secret_name,
            "ENVIRONMENT": "prod",
            "LOG_LEVEL": "INFO",
            "HUGGINGFACE_API_KEY": os.environ.get("HUGGINGFACE_API_KEY", ""),
            "ALLOWED_ORIGINS": "http://localhost:3000,http://localhost:5173"
        }

        # ----------------------------------------------------------------------
        # FFmpeg Layer removed due to access denied
        # ----------------------------------------------------------------------

        # ----------------------------------------------------------------------
        # Lambda Functions
        # ----------------------------------------------------------------------
        submit_function = _lambda.Function(
            self, "SubmitFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "src")),
            handler="video_pipeline.handler_submit.lambda_handler",
            memory_size=512,
            timeout=Duration.seconds(30),
            environment=lambda_env
        )

        parse_function = _lambda.Function(
            self, "ParseFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "src")),
            handler="video_pipeline.handler_parse.lambda_handler",
            memory_size=1024,
            timeout=Duration.seconds(60),
            environment=lambda_env
        )

        generate_function = _lambda.Function(
            self, "GenerateFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "src")),
            handler="video_pipeline.handler_generate.lambda_handler",
            memory_size=2048,
            timeout=Duration.seconds(120),
            environment=lambda_env
        )

        render_function = _lambda.Function(
            self, "RenderFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "src")),
            handler="video_pipeline.handler_render.lambda_handler",
            memory_size=2048,
            timeout=Duration.seconds(180),
            environment=lambda_env
        )

        status_function = _lambda.Function(
            self, "StatusFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "src")),
            handler="video_pipeline.handler_status.lambda_handler",
            memory_size=256,
            timeout=Duration.seconds(10),
            environment=lambda_env
        )

        download_function = _lambda.Function(
            self, "DownloadFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "src")),
            handler="video_pipeline.handler_download.lambda_handler",
            memory_size=256,
            timeout=Duration.seconds(10),
            environment=lambda_env
        )

        # Permissions
        functions = [submit_function, parse_function, generate_function, render_function, status_function, download_function]
        for fn in functions:
            input_bucket.grant_read_write(fn)
            assets_bucket.grant_read_write(fn)
            output_bucket.grant_read_write(fn)
            request_table.grant_read_write_data(fn)
            api_keys_secret.grant_read(fn)
            fn.add_to_role_policy(iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:InvokeModel"],
                resources=["*"]
            ))

        # ----------------------------------------------------------------------
        # S3 Events Triggers
        # ----------------------------------------------------------------------
        input_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(parse_function)
        )

        # In SAM it was: Generate function triggers on assets bucket, and Render function triggers on assets bucket too? Wait...
        assets_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(generate_function),
            s3.NotificationKeyFilter(prefix="scenes/", suffix=".json")
        )

        assets_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(render_function),
            s3.NotificationKeyFilter(prefix="images/", suffix=".png")
        )

        # ----------------------------------------------------------------------
        # API Gateway
        # ----------------------------------------------------------------------
        api_log_group = logs.LogGroup(self, "ApiGwAccessLogs")

        api = apigw.RestApi(
            self, "ApiGateway",
            rest_api_name="script-preview-api",
            endpoint_types=[apigw.EndpointType.REGIONAL],
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=["http://localhost:3000", "http://localhost:5173"],
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key", "X-Amz-Security-Token"],
                allow_credentials=True,
            ),
            deploy_options=apigw.StageOptions(
                stage_name="v1",
                tracing_enabled=True,
                variables={"Environment": "prod"}
            )
        )

        # Add Gateway Responses for 4XX and 5XX errors to ensure CORS headers are returned
        api.add_gateway_response(
            "Default5XX",
            type=apigw.ResponseType.DEFAULT_5XX,
            response_headers={
                "Access-Control-Allow-Origin": "'*'"
            }
        )
        api.add_gateway_response(
            "Default4XX",
            type=apigw.ResponseType.DEFAULT_4XX,
            response_headers={
                "Access-Control-Allow-Origin": "'*'"
            }
        )

        usage_plan = api.add_usage_plan(
            "ScriptPreviewUsagePlan",
            name="script-preview-plan",
            description="Usage plan for Script-to-Video-Preview-Generator",
            api_stages=[apigw.UsagePlanPerApiStage(api=api, stage=api.deployment_stage)],
            quota=apigw.QuotaSettings(limit=10, period=apigw.Period.DAY)
        )

        api_key = api.add_api_key("ApiKey")
        usage_plan.add_api_key(api_key)

        # /api/v1/preview/generate -> POST (Submit)
        # The RestApi automatically adds a '/' root.
        api_resource = api.root.add_resource("api")
        v1_resource = api_resource.add_resource("v1")
        preview_resource = v1_resource.add_resource("preview")

        generate_resource = preview_resource.add_resource("generate")
        generate_resource.add_method("POST", apigw.LambdaIntegration(submit_function), api_key_required=True)

        # /api/v1/preview/status/{request_id} -> GET (Status)
        status_resource = preview_resource.add_resource("status")
        status_request_id_resource = status_resource.add_resource("{request_id}")
        status_request_id_resource.add_method("GET", apigw.LambdaIntegration(status_function), api_key_required=True)

        # /api/v1/preview/download/{request_id} -> GET (Download)
        download_resource = preview_resource.add_resource("download")
        download_request_id_resource = download_resource.add_resource("{request_id}")
        download_request_id_resource.add_method("GET", apigw.LambdaIntegration(download_function), api_key_required=True)

        # ----------------------------------------------------------------------
        # CloudWatch Alarms
        # ----------------------------------------------------------------------
        cloudwatch.Alarm(
            self, "SubmitFunctionErrorAlarm",
            alarm_name="script-preview-submit-errors",
            alarm_description="Alarm for SubmitLambda function errors",
            metric=submit_function.metric_errors(period=Duration.seconds(300), statistic="Sum"),
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
        )

        cloudwatch.Alarm(
            self, "ParseFunctionErrorAlarm",
            alarm_name="script-preview-parse-errors",
            alarm_description="Alarm for ParseLambda function errors",
            metric=parse_function.metric_errors(period=Duration.seconds(300), statistic="Sum"),
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
        )

        cloudwatch.Alarm(
            self, "GenerateFunctionErrorAlarm",
            alarm_name="script-preview-generate-errors",
            alarm_description="Alarm for GenerateLambda function errors",
            metric=generate_function.metric_errors(period=Duration.seconds(300), statistic="Sum"),
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
        )

        cloudwatch.Alarm(
            self, "RenderFunctionErrorAlarm",
            alarm_name="script-preview-render-errors",
            alarm_description="Alarm for RenderLambda function errors",
            metric=render_function.metric_errors(period=Duration.seconds(300), statistic="Sum"),
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
        )

        # Wait to implement ApiGateway 5xx Alarm properly
        # metric=api.metric_server_error()
        cloudwatch.Alarm(
            self, "ApiGateway5xxAlarm",
            alarm_name="script-preview-api-5xx-errors",
            alarm_description="Alarm for API Gateway 5xx errors",
            metric=api.metric_server_error(period=Duration.seconds(300), statistic="Sum"),
            evaluation_periods=1,
            threshold=5,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
        )
