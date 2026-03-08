#!/usr/bin/env python3
"""
Direct AWS deployment using boto3 - bypassing CDK bootstrap issues
"""
import boto3
import json
import time
from botocore.exceptions import ClientError

def deploy_backend():
    """Deploy backend using boto3 directly"""
    
    cf = boto3.client('cloudformation', region_name='us-east-1')
    
    # Read the synthesized template
    try:
        with open('cdk.out/BackendStack.template.json', 'r') as f:
            template = json.load(f)
        print("✓ Loaded CloudFormation template")
    except FileNotFoundError:
        print("Template file not found. Synthesizing...")
        from aws_cdk import App
        from backend_stack import BackendStack
        app = App()
        stack = BackendStack(app, "BackendStack")
        assembly = app.synth()
        template_file = assembly.get_stack_by_name("BackendStack").template_file
        with open(template_file, 'r') as f:
            template = json.load(f)
        print("✓ Synthesized and loaded template")
    
    stack_name = "BackendStack"
    
    try:
        # Check if stack exists
        try:
            response = cf.describe_stacks(StackName=stack_name)
            stack_status = response['Stacks'][0]['StackStatus']
            print(f"\nStack exists with status: {stack_status}")
            
             # Wait if it's in progress
            if 'IN_PROGRESS' in stack_status:
                print("Waiting for existing operation to complete...")
                waiter = cf.get_waiter('stack_create_complete')
                try:
                    waiter.wait(StackName=stack_name)
                except:
                    pass  # Ignore waiter errors
            
            # Update existing stack
            print(f"\nUpdating {stack_name}...")
            cf.update_stack(
                StackName=stack_name,
                TemplateBody=json.dumps(template),
                Capabilities=['CAPABILITY_NAMED_IAM', 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND']
            )
        except ClientError as e:
            if 'does not exist' in str(e):
                # Create new stack
                print(f"\nCreating {stack_name}...")
                cf.create_stack(
                    StackName=stack_name,
                    TemplateBody=json.dumps(template),
                    Capabilities=['CAPABILITY_NAMED_IAM', 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND']
                )
            else:
                raise
        
        # Wait for stack to be ready
        print("Waiting for stack deployment... (this may take 5-10 minutes)")
        
        max_wait = 600  # 10 minutes
        start_time = time.time()
        last_status = None
        
        while True:
            if time.time() - start_time > max_wait:
                print("⏱️  Timeout waiting for stack")
                break
            
            try:
                response = cf.describe_stacks(StackName=stack_name)
                stack = response['Stacks'][0]
                status = stack['StackStatus']
                
                if status != last_status:
                    print(f"  Status: {status}")
                    last_status = status
                
                if status in ['CREATE_COMPLETE', 'UPDATE_COMPLETE']:
                    print("\n✓ Stack deployment successful!")
                    
                    # Get outputs
                    outputs = stack.get('Outputs', [])
                    print("\n" + "="*70)
                    print("DEPLOYMENT OUTPUTS:")
                    print("="*70)
                    
                    api_endpoint = None
                    for output in outputs:
                        key = output['OutputKey']
                        value = output['OutputValue']
                        print(f"\n{key}:")
                        print(f"  {value}")
                        if key == 'ApiEndpoint':
                            api_endpoint = value
                    
                    if api_endpoint:
                        print("\n" + "="*70)
                        print("🎉 YOUR API GATEWAY URL:")
                        print(f"   {api_endpoint}")
                        print("="*70)
                    
                    return 0
                    
                elif 'FAILED' in status or 'ROLLBACK' in status:
                    print(f"\n❌ Stack deployment failed with status: {status}")
                    
                    # Get failure reasons
                    if 'StackStatusReason' in stack:
                        print(f"Reason: {stack['StackStatusReason']}")
                    
                    return 1
                
                time.sleep(10)  # Check every 10 seconds
                
            except ClientError as e:
                print(f"Error checking stack: {e}")
                time.sleep(10)
        
    except ClientError as e:
        print(f"❌ CloudFormation error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(deploy_backend())
