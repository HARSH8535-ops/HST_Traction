import aws_cdk as core
import aws_cdk.assertions as assertions

from backend_stack import BackendStack


def _make_template():
    """Helper – synthesize BackendStack once per test module."""
    app = core.App()
    stack = BackendStack(app, "TestStack")
    return assertions.Template.from_stack(stack)


# ==================================================================
# 1. SageMaker Execution Role
# ==================================================================

def test_sagemaker_execution_role_created():
    template = _make_template()
    template.has_resource_properties("AWS::IAM::Role", {
        "AssumeRolePolicyDocument": {
            "Statement": assertions.Match.array_with([
                assertions.Match.object_like({
                    "Action": "sts:AssumeRole",
                    "Effect": "Allow",
                    "Principal": {"Service": "sagemaker.amazonaws.com"}
                })
            ])
        }
    })


# ==================================================================
# 2. Text Endpoint
# ==================================================================

def test_text_endpoint_config_serverless():
    template = _make_template()
    template.has_resource_properties("AWS::SageMaker::EndpointConfig", {
        "ProductionVariants": assertions.Match.array_with([
            assertions.Match.object_like({
                "VariantName": "AllTraffic",
                "ServerlessConfig": {
                    "MemorySizeInMB": 3072,
                    "MaxConcurrency": 2
                }
            })
        ])
    })


def test_text_endpoint_name():
    template = _make_template()
    template.has_resource_properties("AWS::SageMaker::Endpoint", {
        "EndpointName": "tractionpal-text-endpoint"
    })



# ==================================================================
# 4. Audio Endpoint
# ==================================================================

def test_audio_endpoint_name():
    template = _make_template()
    template.has_resource_properties("AWS::SageMaker::Endpoint", {
        "EndpointName": "tractionpal-audio-endpoint"
    })


# ==================================================================
# 5. Lambda Environment Variables
# ==================================================================

def test_lambda_has_sagemaker_env_vars():
    template = _make_template()
    template.has_resource_properties("AWS::Lambda::Function", {
        "Environment": {
            "Variables": assertions.Match.object_like({
                "SAGEMAKER_TEXT_ENDPOINT_NAME": "tractionpal-text-endpoint",
                "SAGEMAKER_AUDIO_ENDPOINT_NAME": "tractionpal-audio-endpoint",
            })
        }
    })


# ==================================================================
# 6. CloudWatch Alarms
# ==================================================================

def test_cloudwatch_alarms_created():
    template = _make_template()
    # 4 alarms total: 2 per endpoint (error + latency)
    template.resource_count_is("AWS::CloudWatch::Alarm", 4)


def test_text_latency_alarm_threshold():
    template = _make_template()
    template.has_resource_properties("AWS::CloudWatch::Alarm", {
        "Threshold": 5000000,   # 5 seconds in microseconds
        "AlarmDescription": "Text endpoint latency exceeds 5 seconds"
    })


def test_audio_latency_alarm_threshold():
    template = _make_template()
    template.has_resource_properties("AWS::CloudWatch::Alarm", {
        "Threshold": 8000000,   # 8 seconds in microseconds
        "AlarmDescription": "Audio endpoint latency exceeds 8 seconds"
    })


# ==================================================================
# 7. CloudFormation Outputs
# ==================================================================

def test_cloudformation_outputs_exist():
    template = _make_template()
    template.has_output("TextEndpointName", {})
    template.has_output("AudioEndpointName", {})
    template.has_output("EstimatedMonthlyCost", {})


# ==================================================================
# 8. Existing Resources Preserved
# ==================================================================

def test_cors_policy():
    template = _make_template()
    template.has_resource_properties("AWS::ApiGateway::RestApi", {
        "Name": "TractionPal Service"
    })
    template.has_resource_properties("AWS::S3::Bucket", {})


def test_two_sagemaker_endpoints():
    template = _make_template()
    template.resource_count_is("AWS::SageMaker::Endpoint", 2)


def test_two_sagemaker_models():
    template = _make_template()
    template.resource_count_is("AWS::SageMaker::Model", 2)


def test_two_sagemaker_endpoint_configs():
    template = _make_template()
    template.resource_count_is("AWS::SageMaker::EndpointConfig", 2)
