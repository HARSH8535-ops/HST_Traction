// In development the Vite dev-server proxy handles /api/* routes, so we use
// an empty base URL.  In production we hit the deployed API Gateway directly.
const PROD_API_URL = "https://7ozdo34g0a.execute-api.us-east-1.amazonaws.com/v1";
export const VIDEO_API_URL = import.meta.env.DEV ? '' : PROD_API_URL;
const VIDEO_API_KEY = import.meta.env.VITE_VIDEO_API_KEY || '';

export interface ImageGenerationRequest {
  prompt: string;
  aspectRatio: "1:1" | "16:9" | "9:16";
  style?: string;
}

export interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  imageBase64?: string;
  duration?: number;
}

export async function generateImage(request: ImageGenerationRequest): Promise<string | undefined> {
  console.warn("Image generation direct endpoint not implemented in frontend. It's handled internally by backend video pipeline.");
  return undefined;
}

export async function submitVideoRequest(request: VideoGenerationRequest): Promise<string | undefined> {
  try {
    const response = await fetch(`${VIDEO_API_URL}/api/v1/preview/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VIDEO_API_KEY,
      },
      body: JSON.stringify({
        script: request.prompt,
        options: {
          aspect_ratio: request.aspectRatio,
          image: request.imageBase64
        }
      })
    });

    if (!response.ok) {
      console.error("Video submission failed:", await response.text());
      return undefined;
    }

    const result = await response.json();
    return result.request_id || result.operationId;
  } catch (err) {
    console.error("Video submission fetch failed:", err);
    return undefined;
  }
}

export async function checkMediaStatus(operationId: string): Promise<{ status: string; url?: string; progress_percent?: number }> {
  try {
    const response = await fetch(`${VIDEO_API_URL}/api/v1/preview/status/${operationId}`, {
      headers: {
        'x-api-key': VIDEO_API_KEY,
      }
    });
    if (!response.ok) {
      throw new Error(`Status fetch failed: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      status: result.status,
      url: result.video_url,
      progress_percent: result.progress_percent
    };
  } catch (err) {
    console.error("Status check failed:", err);
    return { status: 'failed' };
  }
}
