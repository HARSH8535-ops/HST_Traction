import re

with open('frontend/src/services/config.ts', 'r') as f:
    content = f.read()

new_content = """/// <reference types="vite/client" />
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
"""

with open('frontend/src/services/config.ts', 'w') as f:
    f.write(new_content)
