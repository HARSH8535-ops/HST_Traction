with open("backend_service/tests/unit/test_backend_stack.py", "r") as f:
    content = f.read()

import re

# Update tests to match new structure
content = re.sub(
    r'template\.has_resource_properties\("AWS::CloudFront::Distribution", \{\}\)',
    '# template.has_resource_properties("AWS::CloudFront::Distribution", {}) # CloudFront is removed',
    content
)

with open("backend_service/tests/unit/test_backend_stack.py", "w") as f:
    f.write(content)
