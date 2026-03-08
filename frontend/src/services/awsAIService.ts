import { invokeBedrock, getModelForTask } from "./bedrockService";
import { uploadToS3, getSignedDownloadUrl, generateMediaKey } from "./s3StorageService";
import { submitVideoRequest, checkMediaStatus } from "./lambdaMediaService";
import { getCachedResult, setCachedResult, generateCacheKey } from "./cacheService";
import { trackRequest } from "./usageMetricsService";
import {
  ProjectConfig,
  CreatorProfile,
  ContentAnalysis,
  EmotionalAlignment,
  CreativeDirection,
  VideoAnalysisResult,
  DualReviewResponse,
  PublishingRecommendation,
  PerformanceMetrics,
  PublishedContent,
  EmotionType,
  DecisionType
} from "../types";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Raw = result.split(',')[1] || result;
      resolve(base64Raw);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analyzeContent(
  text: string,
  config: ProjectConfig,
  creatorProfile?: CreatorProfile | null,
  suggestion?: string
): Promise<ContentAnalysis> {
  const cacheKey = generateCacheKey('analyzeContent', [text, config, creatorProfile, suggestion]);
  const cached = getCachedResult<ContentAnalysis>(cacheKey);
  if (cached) {
    trackRequest('nova-lite', crypto.randomUUID(), 0, undefined, 'contentAnalysis', undefined, true);
    return cached;
  }

  let prompt = `Analyze this content: "${text.slice(0, 1000)}"\n\n`;
  if (suggestion) {
    prompt += `Incorporate this user suggestion/direction for the output: "${suggestion}"\n\n`;
  }
  prompt += `Provide the analysis in the following JSON schema:
{
  "tractionScore": number,
  "hookStrength": number,
  "retentionEstimate": number,
  "critique": string,
  "recommendations": string[],
  "patternsDetected": string[],
  "viewerIntent": string,
  "searchQueries": string[],
  "directions": [{
    "id": string,
    "coreIdea": string,
    "emotionalAngle": string,
    "potentialUpside": string,
    "creativeTradeOffs": string,
    "reasoning": string,
    "creatorAdvice": string
  }]
}`;

  const result = await invokeBedrock(prompt, {
    taskType: "contentAnalysis"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  trackRequest('nova-lite', crypto.randomUUID(), 100, undefined, 'contentAnalysis', undefined, true);
  return parsed;
}

export async function evaluateEmotionalAlignment(
  script: string,
  targetEmotion: EmotionType,
  config: ProjectConfig
): Promise<EmotionalAlignment> {
  const cacheKey = generateCacheKey('evaluateEmotionalAlignment', [script, targetEmotion, config]);
  const cached = getCachedResult<EmotionalAlignment>(cacheKey);
  if (cached) return cached;

  const prompt = `Evaluate alignment. Target: ${targetEmotion}. Script: "${script}"\n\nReturn JSON: { "score": number, "perceivedEmotion": string, "isAligned": boolean, "misalignedSections": [{ "text": string, "issue": string, "suggestion": string }], "overallFeedback": string }`;

  const result = await invokeBedrock(prompt, {
    taskType: "emotionalAlignment"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}

export async function generateCreativeDirections(
  topic: string,
  config: ProjectConfig,
  suggestion?: string
): Promise<CreativeDirection[]> {
  const cacheKey = generateCacheKey('generateCreativeDirections', [topic, config, suggestion]);
  const cached = getCachedResult<CreativeDirection[]>(cacheKey);
  if (cached) return cached;

  const purposeOrGoal = config.purposes ? config.purposes.join(',') : (config.purpose || '');
  let prompt = `Generate 3 directions for ${topic}. Platform: ${config.platform}. Genre: ${config.genre}. Goal: ${purposeOrGoal}.\n\n`;
  if (suggestion) {
    prompt += `The user provided this suggestion to regenerate the directions: "${suggestion}". Make sure to heavily incorporate it.\n\n`;
  }
  prompt += `Return a JSON array of objects: [{ "title": string, "hook": string, "angle": string, "targetAudience": string }]`;

  const result = await invokeBedrock(prompt, {
    taskType: "creativeDirections"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}

export async function developScript(
  direction: CreativeDirection,
  config: ProjectConfig,
  draft: string
): Promise<string> {
  const cacheKey = generateCacheKey('developScript', [direction, config, draft]);
  const cached = getCachedResult<string>(cacheKey);
  if (cached) return cached;

  const prompt = `Develop a script based on this direction.
Platform: ${config.platform}
Direction: ${JSON.stringify(direction)}
Draft/Context: ${draft || "None"}

Write a complete, engaging script.`;

  const result = await invokeBedrock(prompt, {
    taskType: "scriptDevelopment"
  });

  setCachedResult(cacheKey, result);
  return result;
}

export async function analyzeVideoContent(
  videoBase64: string,
  mimeType: string
): Promise<VideoAnalysisResult> {
  const cacheKey = generateCacheKey('analyzeVideoContent', [videoBase64, mimeType]);
  const cached = getCachedResult<VideoAnalysisResult>(cacheKey);
  if (cached) return cached;

  const prompt = `Act as an Expert Video Intelligence Analyst. Conduct a deep understanding audit of this video.
Identify the main subject, detect key editing points, analyze pacing, and assess hook strength for social media traction.

Return JSON with: hookScore, pacingScore, visualStyle, emotionalImpact, overallFeedback, suggestions (array with: timestamp, type, description, reasoning, impact).`;

  // Note: There is currently no multimodal backend yet for AWS video processing,
  // so this relies on the backend either simulating it or extracting frames if implemented.
  const result = await invokeBedrock(prompt, {
    taskType: "videoAnalysis"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}

export async function generateImageWithLambda(
  prompt: string,
  aspectRatio: "1:1" | "16:9" | "9:16" = "16:9"
): Promise<string | undefined> {
  try {
    const result = await invokeBedrock(
      `Generate a thumbnail image for: ${prompt}`,
      { taskType: 'imageGeneration' }
    );
    // If the backend returns a URL or base64 image data, use it
    if (result && (result.startsWith('http') || result.startsWith('data:'))) {
      return result;
    }
    // If it returns JSON with a url field
    try {
      const parsed = JSON.parse(result);
      return parsed.url || parsed.imageUrl || undefined;
    } catch {
      return undefined;
    }
  } catch (error) {
    console.warn('Image generation not available:', error);
    return undefined;
  }
}

export async function submitVideoRequestWithLambda(
  prompt: string,
  aspectRatio: "16:9" | "9:16",
  imageBase64?: string
): Promise<string | undefined> {
  const requestId = await submitVideoRequest({ prompt, aspectRatio, imageBase64 });
  return requestId;
}

export async function checkMediaStatusFromLambda(
  operationId: string
): Promise<{ status: string; url?: string; progress_percent?: number }> {
  return await checkMediaStatus(operationId);
}

export async function generateDualReview(
  content: string,
  inputType: "text" | "video",
  mimeType: string,
  config: ProjectConfig
): Promise<DualReviewResponse> {
  const cacheKey = generateCacheKey('generateDualReview', [content, inputType, mimeType, config]);
  const cached = getCachedResult<DualReviewResponse>(cacheKey);
  if (cached) return cached;

  let prompt = `Dual-Perspective Review. Positive and Critical. Context: ${config.platform}. \n\nReturn JSON: { "positive": { "summary": string, "points": [{ "timestamp": string, "item": string, "details": string, "actionable": string }] }, "critical": { "summary": string, "points": [{ "timestamp": string, "item": string, "details": string, "actionable": string }] } }`;

  if (inputType === 'text') {
    prompt += `\n\nContent:\n${content}`;
  }

  // Note: For video input, backend processing is expected to handle the media.

  const result = await invokeBedrock(prompt, {
    taskType: "dualReview"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}

export async function generatePublishingDecision(
  review: DualReviewResponse,
  config: ProjectConfig
): Promise<PublishingRecommendation> {
  const cacheKey = generateCacheKey('generatePublishingDecision', [review, config]);
  const cached = getCachedResult<PublishingRecommendation>(cacheKey);
  if (cached) return cached;

  const prompt = `Executive Decision based on review: ${JSON.stringify(review)}\n\nReturn JSON: { "decision": "PUBLISH_NOW" | "MINOR_TWEAKS" | "MAJOR_REVISION", "confidenceScore": number, "optimalPostingTime": string, "topPriorities": string[], "reasoning": string }`;

  const result = await invokeBedrock(prompt, {
    taskType: "publishingDecision"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}

export async function analyzePerformance(
  content: PublishedContent,
  metrics: PerformanceMetrics
): Promise<string> {
  const cacheKey = generateCacheKey('analyzePerformance', [content, metrics]);
  const cached = getCachedResult<string>(cacheKey);
  if (cached) return cached;

  const prompt = `Analyze the performance gap for this content.
Actual Metrics: ${JSON.stringify(metrics)}
Content: ${content.title}`;

  const result = await invokeBedrock(prompt, {
    taskType: "performanceAnalysis"
  });

  setCachedResult(cacheKey, result);
  return result;
}

export async function generateCreatorProfile(
  history: PublishedContent[]
): Promise<CreatorProfile> {
  const cacheKey = generateCacheKey('generateCreatorProfile', [history]);
  const cached = getCachedResult<CreatorProfile>(cacheKey);
  if (cached) return cached;

  const prompt = `Generate profile from history: ${JSON.stringify(history)}\n\nReturn JSON: { "topStrengths": string[], "growthAreas": string[], "bestPerformingGenres": string[], "audiencePatterns": string[], "strategicAdvice": string }`;

  const result = await invokeBedrock(prompt, {
    taskType: "creatorProfile"
  });

  const parsed = JSON.parse(result);
  const profile: CreatorProfile = { ...parsed, lastUpdated: Date.now() };
  setCachedResult(cacheKey, profile);
  return profile;
}

export async function generateBrandAudit(
  config: ProjectConfig,
  profile: CreatorProfile | null
): Promise<string> {
  const cacheKey = generateCacheKey('generateBrandAudit', [config, profile]);
  const cached = getCachedResult<string>(cacheKey);
  if (cached) return cached;

  const prompt = `Conduct a brand audit.
Platform: ${config.platform}
Profile: ${JSON.stringify(profile || {})}`;

  const result = await invokeBedrock(prompt, {
    taskType: "brandAudit"
  });

  setCachedResult(cacheKey, result);
  return result;
}

export async function generateGrowthTactics(
  config: ProjectConfig
): Promise<string[]> {
  const cacheKey = generateCacheKey('generateGrowthTactics', [config]);
  const cached = getCachedResult<string[]>(cacheKey);
  if (cached) return cached;

  const prompt = `Generate growth tactics for ${config.platform}.
Return JSON array of tactics.`;

  const result = await invokeBedrock(prompt, {
    taskType: "growthTactics"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}

export async function generateCalendarPlan(
  config: ProjectConfig
): Promise<any[]> {
  const cacheKey = generateCacheKey('generateCalendarPlan', [config]);
  const cached = getCachedResult<any[]>(cacheKey);
  if (cached) return cached;

  const prompt = `Generate a content calendar for ${config.platform}.
Return JSON array of objects with: date, type, topic, duration.`;

  const result = await invokeBedrock(prompt, {
    taskType: "calendarPlan"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}

export async function generateThumbnailIdeas(
  config: ProjectConfig,
  script: string
): Promise<string[]> {
  const cacheKey = generateCacheKey('generateThumbnailIdeas', [config, script]);
  const cached = getCachedResult<string[]>(cacheKey);
  if (cached) return cached;

  const prompt = `Generate 5 thumbnail concepts for this script on ${config.platform}.
Script: "${script.slice(0, 300)}"

Return JSON array of concepts.`;

  const result = await invokeBedrock(prompt, {
    taskType: "thumbnailIdeas"
  });

  const parsed = JSON.parse(result);
  setCachedResult(cacheKey, parsed);
  return parsed;
}