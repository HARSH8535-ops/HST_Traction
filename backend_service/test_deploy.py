#!/usr/bin/env python3
import json
import os
import subprocess
import sys

print("Testing CDK setup...")

# Test 1: Import and synthesize
try:
    from aws_cdk import App
    from backend_stack import BackendStack
    print("✓ Imports successful")
    
    # Create and synthesize
    app = App()
    stack = BackendStack(app, "BackendStack")
    cloud_assembly = app.synth()
    
    # Get template
    stack_artifact = cloud_assembly.get_stack_by_name("BackendStack")
    template_file = stack_artifact.template_file
    
    print(f"✓ Synthesis successful")
    print(f"  Template file: {template_file}")
    
    # Check if template file exists
    if os.path.exists(template_file):
        with open(template_file, 'r') as f:
            template = json.load(f)
        print(f"✓ Template file readable")
        print(f"  Template size: {len(json.dumps(template))} bytes")
        print(f"  Resources: {len(template.get('Resources', {}))}")
    else:
        print(f"✗ Template file not found: {template_file}")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Check AWS CLI
try:
    result = subprocess.run(['aws', 'sts', 'get-caller-identity'], 
                          capture_output=True, text=True, check=True)
    identity = json.loads(result.stdout)
    print(f"✓ AWS CLI configured")
    print(f"  Account: {identity['Account']}")
    print(f"  User: {identity['Arn']}")
except Exception as e:
    print(f"✗ AWS CLI error: {e}")
    sys.exit(1)

print("\n✓ All checks passed!")

# Now deploy
print("\nProceeding with deployment...")

try:
    result = subprocess.run([sys.executable, '/app/deploy_direct.py'], 
                          cwd=os.getcwd())
    sys.exit(result.returncode)
except Exception as e:
    print(f"Error running deployment: {e}")
    sys.exit(1)
