#!/usr/bin/env python3
"""
Direct CDK deployment using Python
"""
import os
import sys
import json
import boto3
from aws_cdk import App
from backend_stack import BackendStack

def deploy_backend():
    """Deploy backend stack directly using AWS CDK"""
    try:
        print("🚀 Starting Backend Deployment")
        print("="*60)
        
        # Create CDK app
        print("\n1. Creating CDK App...")
        app = App()
        
        # Create backend stack
        print("2. Creating Backend Stack...")
        stack = BackendStack(app, "BackendStack")
        
        # Synthesize
        print("3. Synthesizing CloudFormation template...")
        cloud_assembly = app.synth()
        template_file = cloud_assembly.get_stack_by_name("BackendStack").template_file
        print(f"   ✓ Template synthesized to: {template_file}")
        
        # Read template
        with open(template_file, 'r') as f:
            template = json.load(f)
        
        # Deploy using CloudFormation
        print("\n4. Deploying stack via CloudFormation...")
        cf_client = boto3.client('cloudformation')
        
        # Get AWS Account ID and Region
        sts_client = boto3.client('sts')
        account_id = sts_client.get_caller_identity()['Account']
        region = boto3.Session().region_name or 'us-east-1'
        
        print(f"   Account ID: {account_id}")
        print(f"   Region: {region}")
        
        # Create or update stack
        stack_name = "BackendStack"
        
        try:
            # Check if stack exists
            cf_client.describe_stacks(StackName=stack_name)
            print(f"   Stack '{stack_name}' exists, updating...")
            cf_client.update_stack(
                StackName=stack_name,
                TemplateBody=json.dumps(template),
                Capabilities=['CAPABILITY_NAMED_IAM', 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND']
            )
        except cf_client.exceptions.ClientError as e:
            if 'does not exist' in str(e):
                print(f"   Creating stack '{stack_name}'...")
                cf_client.create_stack(
                    StackName=stack_name,
                    TemplateBody=json.dumps(template),
                    Capabilities=['CAPABILITY_NAMED_IAM', 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND']
                )
            else:
                raise
        
        # Wait for stack
        print("\n5. Waiting for stack deployment...")
        waiter = cf_client.get_waiter('stack_create_complete')
        try:
            waiter.wait(StackName=stack_name)
        except:
            # Try update waiter
            waiter = cf_client.get_waiter('stack_update_complete')
            waiter.wait(StackName=stack_name)
        
        print("   ✓ Stack deployed successfully!")
        
        # Get outputs
        print("\n6. Retrieving stack outputs...")
        response = cf_client.describe_stacks(StackName=stack_name)
        outputs = response['Stacks'][0].get('Outputs', [])
        
        print("\n" + "="*60)
        print("DEPLOYMENT COMPLETED SUCCESSFULLY!")
        print("="*60)
        
        for output in outputs:
            print(f"\n{output['OutputKey']}:")
            print(f"  Value: {output['OutputValue']}")
            if 'Description' in output:
                print(f"  ({output['Description']})")
        
        # Find and highlight API endpoint
        api_endpoint = next(
            (o['OutputValue'] for o in outputs if o['OutputKey'] == 'ApiEndpoint'),
            None
        )
        
        if api_endpoint:
            print("\n" + "="*60)
            print("🎉 YOUR API GATEWAY URL:")
            print(f"   {api_endpoint}")
            print("="*60)
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(deploy_backend())
