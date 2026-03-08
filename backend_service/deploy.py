#!/usr/bin/env python3
import subprocess
import sys
import json

def run_deployment():
    """Deploy the CDK stacks"""
    try:
        print("Starting CDK deployment...")
        
        # Synthesize the stack
        print("\n1. Synthesizing CloudFormation template...")
        synth_result = subprocess.run(
            [sys.executable, "-m", "aws_cdk.cli", "synth"],
            cwd=".",
            capture_output=True,
            text=True,
            check=True
        )
        print("✓ Synthesis successful")
        
        # Deploy the stack
        print("\n2. Deploying to AWS...")
        deploy_result = subprocess.run(
            [sys.executable, "-m", "aws_cdk.cli", "deploy", 
             "BackendStack", "--require-approval=never"],
            cwd="."
        )
        
        if deploy_result.returncode == 0:
            print("\n✓ Deployment successful!")
            print("\nFetching stack outputs...")
            
            # Get stack outputs
            describe_result = subprocess.run(
                ["aws", "cloudformation", "describe-stacks", 
                 "--stack-name", "BackendStack",
                 "--query", "Stacks[0].Outputs"],
                capture_output=True,
                text=True
            )
            
            if describe_result.returncode == 0:
                outputs = json.loads(describe_result.stdout)
                print("\n" + "="*60)
                print("DEPLOYMENT OUTPUTS")
                print("="*60)
                for output in outputs:
                    print(f"\n{output['OutputKey']}:")
                    print(f"  Value: {output['OutputValue']}")
                    if 'Description' in output:
                        print(f"  Description: {output['Description']}")
                print("\n" + "="*60)
                
                # Extract API endpoint
                api_endpoint = next(
                    (o['OutputValue'] for o in outputs if o['OutputKey'] == 'ApiEndpoint'),
                    None
                )
                if api_endpoint:
                    print(f"\n🎉 Your API Gateway URL: {api_endpoint}")
                return 0
        else:
            print("✗ Deployment failed")
            return 1
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(run_deployment())
