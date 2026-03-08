"""
Integration tests for deployed SageMaker endpoints.

Run AFTER deployment:
    python -m pytest tests/integration/test_sagemaker_endpoints.py -v

These tests hit live AWS resources and require valid credentials.
"""
import json
import os
import time

import boto3
import pytest
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
STACK_NAME = os.environ.get("STACK_NAME", "BackendStack")

sm_client = boto3.client("sagemaker", region_name=REGION)
sm_runtime = boto3.client("sagemaker-runtime", region_name=REGION)
cf_client = boto3.client("cloudformation", region_name=REGION)

TEXT_ENDPOINT = "tractionpal-text-endpoint"
AUDIO_ENDPOINT = "tractionpal-audio-endpoint"


def _get_api_url():
    """Fetch the API Gateway URL from stack outputs."""
    resp = cf_client.describe_stacks(StackName=STACK_NAME)
    for output in resp["Stacks"][0].get("Outputs", []):
        if output["OutputKey"] == "ApiEndpoint":
            return output["OutputValue"].rstrip("/")
    pytest.skip("ApiEndpoint output not found in stack outputs")


# ==================================================================
# Endpoint Status Tests
# ==================================================================

class TestEndpointStatus:
    """Verify endpoints exist and are InService."""

    def test_text_endpoint_in_service(self):
        resp = sm_client.describe_endpoint(EndpointName=TEXT_ENDPOINT)
        assert resp["EndpointStatus"] == "InService", (
            f"Text endpoint status: {resp['EndpointStatus']}"
        )

    def test_audio_endpoint_in_service(self):
        resp = sm_client.describe_endpoint(EndpointName=AUDIO_ENDPOINT)
        assert resp["EndpointStatus"] == "InService", (
            f"Audio endpoint status: {resp['EndpointStatus']}"
        )


# ==================================================================
# Endpoint Configuration Tests
# ==================================================================

class TestEndpointConfiguration:
    """Verify endpoints use serverless configuration."""

    def _get_endpoint_config(self, endpoint_name):
        ep = sm_client.describe_endpoint(EndpointName=endpoint_name)
        config_name = ep["EndpointConfigName"]
        return sm_client.describe_endpoint_config(EndpointConfigName=config_name)

    def test_text_uses_serverless(self):
        config = self._get_endpoint_config(TEXT_ENDPOINT)
        variant = config["ProductionVariants"][0]
        assert "ServerlessConfig" in variant
        assert variant["ServerlessConfig"]["MemorySizeInMB"] == 3072

    def test_audio_uses_serverless(self):
        config = self._get_endpoint_config(AUDIO_ENDPOINT)
        variant = config["ProductionVariants"][0]
        assert "ServerlessConfig" in variant
        assert variant["ServerlessConfig"]["MemorySizeInMB"] == 3072


# ==================================================================
# API Invocation Tests
# ==================================================================

class TestAPIInvocation:
    """Test API Gateway → Lambda → SageMaker round-trip."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.api_url = _get_api_url()

    def test_text_generation(self):
        start = time.time()
        resp = requests.post(
            f"{self.api_url}api/bedrock",
            json={
                "prompt": "Write a brief social media caption about coffee",
                "taskType": "contentAnalysis",
                "systemPrompt": "You are a helpful assistant."
            },
            timeout=30
        )
        elapsed = time.time() - start

        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "result" in data
        assert len(data["result"]) > 0
        print(f"\n  Text generation: {elapsed:.1f}s")

    def test_text_health_check(self):
        resp = requests.get(f"{self.api_url}api/health", timeout=10)
        assert resp.status_code == 200


# ==================================================================
# CloudWatch Alarm Tests
# ==================================================================

class TestCloudWatchAlarms:
    """Verify CloudWatch alarms are configured."""

    def test_alarms_exist(self):
        cw = boto3.client("cloudwatch", region_name=REGION)
        resp = cw.describe_alarms(AlarmNamePrefix="TestStack")
        # If deployed with BackendStack, alarms won't have "TestStack" prefix
        # Try without prefix and filter by endpoint name
        resp = cw.describe_alarms()
        endpoint_alarms = [
            a for a in resp["MetricAlarms"]
            if any(
                d["Value"] in (TEXT_ENDPOINT, AUDIO_ENDPOINT)
                for d in a.get("Dimensions", [])
            )
        ]
        assert len(endpoint_alarms) >= 4, (
            f"Expected 4 alarms, found {len(endpoint_alarms)}"
        )


# ==================================================================
# Response Time Benchmarks
# ==================================================================

class TestResponseTimeBenchmarks:
    """Benchmark endpoint response times."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.api_url = _get_api_url()

    def test_text_response_time(self):
        start = time.time()
        resp = requests.post(
            f"{self.api_url}api/bedrock",
            json={
                "prompt": "List three tips for productivity",
                "taskType": "creativeDirections"
            },
            timeout=30
        )
        elapsed = time.time() - start
        assert resp.status_code == 200
        # Serverless cold start can be 10-15s, warm ~2-5s
        assert elapsed < 30, f"Text generation took {elapsed:.1f}s (too slow)"
        print(f"\n  Text benchmark: {elapsed:.1f}s")
