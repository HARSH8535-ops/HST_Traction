import re

with open('frontend/src/services/config.ts', 'r') as f:
    content = f.read()

# For jest compat with ts-jest, we need slightly different syntax or simply @ts-ignore
new_content = """/// <reference types="vite/client" />
// @ts-ignore
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
"""

with open('frontend/src/services/config.ts', 'w') as f:
    f.write(new_content)
