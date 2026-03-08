
export type PlatformType = 'Instagram' | 'YouTube' | 'LinkedIn' | 'TikTok' | 'Twitter';
export type PurposeType = 'Educate' | 'Inspire' | 'Convert' | 'Build Trust' | 'Entertain';
export type EmotionType = 'Excitement' | 'Trust' | 'Curiosity' | 'Empathy' | 'Motivation';
export type FormType = 'Short Form' | 'Long Form' | 'Blog' | 'Vlog';
export type GenreType = 'Academic' | 'Lifestyle' | 'Relaxation' | 'Creative';

export interface ContentDirection {
  id: string;
  coreIdea: string;
  emotionalAngle: string;
  potentialUpside: string;
  creativeTradeOffs: string;
  reasoning: string;
  creatorAdvice: string;
}

export interface EmotionalAlignment {
  score: number;
  perceivedEmotion: string;
  isAligned: boolean;
  misalignedSections: { text: string; issue: string; suggestion: string }[];
  overallFeedback: string;
}

export interface ProjectConfig {
  platform: PlatformType;
  purposes: PurposeType[];
  customPurpose?: string;
  intendedImpacts: EmotionType[];
  customImpact?: string;
  form: FormType;
  genre: GenreType;
  // Legacy support for older components
  purpose?: PurposeType;
  emotion?: EmotionType;
}

export interface ContentAnalysis {
  tractionScore: number;
  hookStrength: number;
  retentionEstimate: number;
  critique: string;
  recommendations: string[];
  patternsDetected: string[];
  viewerIntent: string;
  searchQueries: string[];
  directions: ContentDirection[];
}

export interface CreativeDirection {
  title: string;
  hook: string;
  angle: string;
  targetAudience: string;
}

export interface AnalysisHistory {
  id: string;
  timestamp: number;
  title: string;
  analysis: ContentAnalysis;
}

export interface ReviewPoint {
  timestamp?: string;
  item: string;
  details: string;
  actionable?: string;
}

export interface DualReviewResponse {
  positive: {
    summary: string;
    points: ReviewPoint[];
  };
  critical: {
    summary: string;
    points: ReviewPoint[];
  };
}

export type DecisionType = 'PUBLISH_NOW' | 'MINOR_TWEAKS' | 'MAJOR_REVISION';

export interface PublishingRecommendation {
  decision: DecisionType;
  confidenceScore: number;
  optimalPostingTime: string;
  topPriorities: string[];
  reasoning: string;
}

// Agent Profile Types
export enum TaskType {
  Script_Analysis = "Script_Analysis",
  Emotional_Alignment = "Emotional_Alignment",
  Content_Generation = "Content_Generation",
  Performance_Analysis = "Performance_Analysis",
  Growth_Tactics = "Growth_Tactics",
  Thumbnail_Creation = "Thumbnail_Creation"
}

export enum AgentStatus {
  Draft = "Draft",
  Training = "Training",
  Ready = "Ready",
  Failed = "Failed",
  Retraining = "Retraining"
}

export enum DataSource {
  Public_Dataset = "Public_Dataset",
  Creator_History = "Creator_History",
  Custom_Upload = "Custom_Upload",
  Hybrid_Mode = "Hybrid_Mode"
}

export enum TrainingStatus {
  Queued = "Queued",
  Running = "Running",
  Completed = "Completed",
  Failed = "Failed",
  Cancelled = "Cancelled"
}

export interface TrainingJob {
  id: string;
  agentId: string;
  status: TrainingStatus;
  progress: number;
  estimatedCompletionTime?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
  modelArtifactPath?: string;
  dataSources?: string[];
  createdAt?: string;
}

export interface TrainingDataSummary {
  source: DataSource;
  count: number;
  qualityScore: number;
  sizeBytes: number;
}

export interface PersonaConfig {
  tone: string;
  style: string;
  responseLength: "short" | "medium" | "long";
  domainKnowledge: string[];
}

export interface TrainingConfig {
  dataSources: DataSource[];
  weighting: number[];
  minConfidenceThreshold: number;
  maxTokens: number;
}

export interface AgentProfile {
  id: string;
  userId: string;
  name: string;
  description?: string;
  taskType: TaskType;
  persona: PersonaConfig;
  trainingConfig: TrainingConfig;
  status: AgentStatus;
  version: number;
  trainedModelId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Learning System Types
export interface PerformanceMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  notes?: string;
}

export interface PublishedContent {
  id: string;
  timestamp: number;
  config: ProjectConfig;
  title: string;
  contentSnippet: string;
  predictedScore: number;
  recommendation: PublishingRecommendation;
  actualMetrics?: PerformanceMetrics;
  aiRetrospective?: string;
}

export interface CreatorProfile {
  lastUpdated: number;
  topStrengths: string[];
  growthAreas: string[];
  bestPerformingGenres: string[];
  audiencePatterns: string[];
  strategicAdvice: string;
}

export enum TabType {
  DASHBOARD = 'DASHBOARD',
  SETUP = 'SETUP',
  RESEARCH = 'RESEARCH',
  SCRIPTING = 'SCRIPTING',
  VISUALS = 'VISUALS',
  PUBLISHING = 'PUBLISHING',
  ANALYTICS = 'ANALYTICS',
  GROWTH = 'GROWTH',
  BRAND = 'BRAND',
  CALENDAR = 'CALENDAR',
  LIVE_VOICE = 'LIVE_VOICE',
  AGENT_MANAGEMENT = 'AGENT_MANAGEMENT',
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: string;
}

export interface EditingSuggestion {
  timestamp: string;
  type: 'cut' | 'transition' | 'visual' | 'pacing' | 'audio';
  description: string;
  reasoning: string;
  impact: string;
}

export interface VideoAnalysisResult {
  hookScore: number;
  pacingScore: number;
  visualStyle: string;
  emotionalImpact: string;
  suggestions: EditingSuggestion[];
  overallFeedback: string;
}
