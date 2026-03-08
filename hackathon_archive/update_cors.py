import glob
import re

files = [
    "backend_service/src/api_handlers/main.py",
    "backend_service/src/video_pipeline/handler_submit.py",
    "backend_service/src/video_pipeline/handler_generate.py",
    "backend_service/src/video_pipeline/handler_render.py",
    "backend_service/src/video_pipeline/handler_parse.py",
    "backend_service/src/video_pipeline/handler_status.py",
    "backend_service/src/video_pipeline/handler_download.py"
]

def update_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Define the new get_cors_headers function
    new_func = """def get_cors_headers(event):
    origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin', '')
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')
    allowed_origins = [o.strip().rstrip('/') for o in allowed_origins if o.strip()]

    clean_origin = origin.rstrip('/')

    if clean_origin in allowed_origins:
        return {"Access-Control-Allow-Origin": origin}
    return {"Access-Control-Allow-Origin": allowed_origins[0] if allowed_origins else '*'}"""

    # We need to replace the existing get_cors_headers function.
    # Because of indentation or slight variations, we'll use regex.
    pattern = r"def get_cors_headers\(event\):.*?(?=\n\S)"

    # We'll do a simpler replacement if they are all identical
    # Let's check first by just doing a string match or writing a small parser.
    pass

if __name__ == '__main__':
    for file in files:
        with open(file, 'r') as f:
            lines = f.readlines()

        out_lines = []
        in_func = False
        func_lines = []
        for line in lines:
            if line.startswith('def get_cors_headers(event):'):
                in_func = True
                func_lines.append(line)
                continue
            if in_func:
                if line.startswith('    ') or line.strip() == '' or line.startswith('\t'):
                    func_lines.append(line)
                else:
                    in_func = False

                    # We have captured the whole function, now replace it.
                    # Some files might have `import os` inside the function, let's keep that in mind.
                    has_import_os = any("import os" in l for l in func_lines)

                    new_lines = [
                        "def get_cors_headers(event):\n",
                    ]
                    if has_import_os:
                        new_lines.append("    import os\n")

                    new_lines.extend([
                        "    origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin', '')\n",
                        "    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')\n",
                        "    allowed_origins = [o.strip().rstrip('/') for o in allowed_origins if o.strip()]\n",
                        "\n",
                        "    clean_origin = origin.rstrip('/')\n",
                        "\n",
                        "    if clean_origin in allowed_origins:\n",
                        "        return {\"Access-Control-Allow-Origin\": origin}\n",
                        "    return {\"Access-Control-Allow-Origin\": allowed_origins[0] if allowed_origins else '*'}\n"
                    ])
                    out_lines.extend(new_lines)
                    out_lines.append(line)
            else:
                out_lines.append(line)

        # Handle case where function is at the end of the file
        if in_func:
            has_import_os = any("import os" in l for l in func_lines)
            new_lines = [
                "def get_cors_headers(event):\n",
            ]
            if has_import_os:
                new_lines.append("    import os\n")

            new_lines.extend([
                "    origin = event.get('headers', {}).get('origin') or event.get('headers', {}).get('Origin', '')\n",
                "    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')\n",
                "    allowed_origins = [o.strip().rstrip('/') for o in allowed_origins if o.strip()]\n",
                "\n",
                "    clean_origin = origin.rstrip('/')\n",
                "\n",
                "    if clean_origin in allowed_origins:\n",
                "        return {\"Access-Control-Allow-Origin\": origin}\n",
                "    return {\"Access-Control-Allow-Origin\": allowed_origins[0] if allowed_origins else '*'}\n"
            ])
            out_lines.extend(new_lines)

        with open(file, 'w') as f:
            f.writelines(out_lines)
