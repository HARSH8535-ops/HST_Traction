# Video Generator Logic Flaws and Fix Plan

## Logic Flaws Identified

### 1. Missing Module Imports in `handler_submit.py`
**File:** `backend_service/src/video_pipeline/handler_submit.py`
- **Flaw:** The code tries to use `uuid` module to generate a unique request ID, but `uuid` is not imported properly in the module's global scope. Wait, `import uuid` IS there.
- **Flaw 2:** `os.environ.get('S3_INPUT_BUCKET')` is called but `script_bucket` is never passed to `s3_client.upload_script(request_id, script)`. `S3Client.upload_script` relies on its own `os.environ.get('S3_INPUT_BUCKET')` fallback, which works, but `script_bucket` variable is unused.

### 2. Missing `json` or `os` Imports
- **Flaw:** In `get_cors_headers`, `os` is imported again inside the function. This is redundant but not critical.

### 3. S3 Download Issues in `handler_parse.py`
**File:** `backend_service/src/video_pipeline/handler_parse.py`
- **Flaw:** `script = s3_client.download_script(request_id)` is called. But `script_bucket = os.environ.get('S3_INPUT_BUCKET')` is retrieved and never passed to `download_script`. Again, `S3Client` handles it internally, so `script_bucket` is just unused code.

### 4. Boto3 Threading/Concurrency Bug in `handler_generate.py`
**File:** `backend_service/src/video_pipeline/handler_generate.py`
- **Flaw:** The function uses `concurrent.futures.ThreadPoolExecutor(max_workers=10)` to upload generated images to S3 simultaneously. However, it uses a shared single `s3_client` instance. Boto3 clients are generally thread-safe, but if it relies on a shared session, it can have issues. A more critical issue: `upload_to_s3` helper function is defined but it directly calls `s3_client.s3_client.put_object(...)`. This works, but could fail if not thread safe.
- **Flaw 2:** The loop `for scene in scenes:` attempts to generate images. `image_bytes = bedrock_client.generate_image(...)`. But Bedrock API might throttle if 10 threads hit it at once. Although the image generation itself runs sequentially in the main thread (only the S3 upload is in a thread pool), this defeats the purpose of speeding up image generation! The `ThreadPoolExecutor` only wraps `upload_to_s3`. Image generation happens synchronously in the `for` loop, which will be slow. If they meant to parallelize image generation, the `bedrock_client.generate_image` call should be inside the `executor.submit`.
- **Flaw 3:** `images_generated` variable is incremented in the main thread AFTER `executor.submit()` is called. This is fine since it's in the main thread.
- **Flaw 4:** Fallback uses `generate_placeholder_image` but `aspect_ratio` variable parsing is unsafe if `event` is unexpectedly formatted.

### 5. Array Slicing Bug in `handler_render.py`
**File:** `backend_service/src/video_pipeline/handler_render.py`
- **Flaw:** `for obj in response['Contents'][:5]:` limits the rendering to only the first 5 images found in S3. This breaks if the script has more than 5 scenes. It's an arbitrary hardcoded limit probably left from debugging.
- **Flaw 2:** The local paths are generated as `local_path = f"/tmp/{os.path.basename(image_key)}"`. Since image keys are like `images/{request_id}/scene-0.png`, the basename is just `scene-0.png`. If multiple lambda instances run or multiple requests overlap in the same container, `/tmp/scene-0.png` could be overwritten, causing a race condition! It should be `f"/tmp/{request_id}_{os.path.basename(image_key)}"`.

### 6. Missing CORS Headers in API Responses
**File:** All Handlers (`handler_submit.py`, `handler_parse.py`, `handler_generate.py`, etc.)
- **Flaw:** The lambdas define a `get_cors_headers(event)` function, but they **never** call it in their `lambda_handler` return statements! The returned JSON responses lack `Access-Control-Allow-Origin` and other CORS headers, which will cause frontend requests to fail with CORS errors in the browser.

### 7. DynamoDB TTL Initialization
**File:** `backend_service/src/shared/dynamodb.py`
- **Flaw:** The `create_request_record` function calculates `ttl = int((datetime.utcnow() + timedelta(days=7)).timestamp())`. This works, but uses the deprecated `datetime.utcnow()`.

## Fix Plan

1. **Fix CORS Headers in all handlers**
   - In every lambda handler's return statements (including error cases), call `get_cors_headers(event)` and merge its result into the `'headers'` dict of the API Gateway response.

2. **Fix Race Condition in `handler_render.py` Temp Files**
   - Update the local download path in `handler_render.py` to include the `request_id` to prevent filename collisions in the shared `/tmp` directory.
   - Example: `local_path = f"/tmp/{request_id}_{os.path.basename(image_key)}"`
   - Remove the `[:5]` slice limitation in `response['Contents']` so all images generated for a script are included in the final render.

3. **Fix Concurrency in `handler_generate.py`**
   - Move the `bedrock_client.generate_image()` call INSIDE the `executor.submit()` target function to actually parallelize the slow AI generation process, not just the S3 upload.

4. **Cleanup Unused Variables**
   - Remove unused `script_bucket` and `assets_bucket` retrieval where they aren't passed to the S3Client methods.
