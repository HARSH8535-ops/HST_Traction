# TractionPal - Architecture & User Flow Documentation

This document provides a comprehensive overview of the **Architecture** and **User Flows** across all files and components in the TractionPal application.

---

## 🏗️ System Architecture

The application is built using a modern decoupled architecture with a React frontend and an AWS serverless backend defined via AWS Cloud Development Kit (CDK).

### 1. Frontend Architecture (React + Vite)
- **Framework**: React 18 with TypeScript.
- **State Management**: React Hooks (`useState`, `useEffect`) acting as a local state store within the high-level components ([App.tsx](file:///c:/Users/calli/OneDrive/Desktop/CSE/HST_Traction/frontend/src/App.tsx)).
- **Routing/Navigation**: Managed via a tab-based state mechanism rather than URL routing to ensure a seamless "Single Page Application" overlay experience.
- **Styling**: Tailwind CSS with Anime.js for smooth micro-animations.
- **Service Layer (`frontend/src/services/`)**: Abstraction layer containing managers for caching (`cacheService.ts`), cloud storage (`s3StorageService.ts`), AI Models (`awsAIService.ts`, `bedrockService.ts`), agent configuration (`agentIntegrationService.ts`), and deployment integrations (`deploymentService.ts`).

### 2. Backend Serverless Architecture (AWS CDK - Python)
The backend infrastructure is modularized into two distinct AWS CDK Stacks:

#### A. Core API Stack (`BackendStack` in `backend_stack.py`)
Provides the main application logic, data persistence, and API gateway routing.
- **API Gateway**: REST API (`TractionPalApi`) handling inbound HTTP traffic with CORS enablement.
- **Lambda Computing**: A single `ApiHandler` function (`main.py`) processes API requests, communicates with SageMaker endpoints (text, image, audio), and reads/writes to the database.
- **DynamoDB Tables**: 
  - `UsageMetricsTable`: Tracks request limits and analytics per agent.
  - `AgentsTable`: Stores custom AI Agent profiles.
  - `DeploymentsTable`: Manages staging/production mappings for trained agents.
  - `TrainingJobsTable`: Tracks the background lifecycle of training custom AI agents.
- **Static Hosting**: An S3 Bucket configured with CloudFront to serve the React Frontend.

#### B. Asynchronous Video Generation Pipeline (`VideoGeneratorStack` in `video_stack.py`)
An event-driven video rendering infrastructure using AWS Bedrock / Stable Diffusion.
- **API Interfaces**: Dedicated endpoints to submit jobs (`/generate`), check status (`/status/{id}`), and download output (`/download/{id}`).
- **Event-Driven Workflow**: Uses Lambda functions (`SubmitFunction`, `ParseFunction`, `GenerateFunction`, `RenderFunction`) triggered automatically via S3 `OBJECT_CREATED` events across three localized buckets (Input, Assets, Output).
- **Persistent Tracking**: DynamoDB `RequestTable` to track the state of asynchronous jobs.
- **Observability**: CloudWatch alarms to monitor lambda failures and 5xx API errors.

---

## 🔄 Core User Flows

TractionPal is organized into an ordered logical sequence that guides content creators from ideation to final review. These flows are orchestrated by `App.tsx` tracking `activeTab`.

### Flow 1: Initialization & Strategy Setup
1. **Dashboard & Workspace**: The user enters the application. `Dashboard.tsx` fetches metrics and recently utilized environments. The user can either continue an active session or click "New Project".
2. **Deployment (Project Setup)**: Transitioning to `ProjectSetup.tsx`, the user configures core project parameters:
   - **Platform**: YouTube, TikTok, Instagram, etc.
   - **Purpose**: Education, Entertainment, Conversion.
   - **Tone/Emotion**: Authoritative, funny, dramatic.
   - **Form/Genre**: Short-form vertical, long-form documentary, etc.
   - *Result*: State updates `projectConfig`, unlocking subsequent modules.

### Flow 2: Ideation & Scripting (Market Lab & Script Core)
1. **Research (Market Lab)**: Using the saved `projectConfig`, `CreativeExplorer.tsx` queries the AI (via Bedrock/Gemini) to generate multiple creative directions and angles.
2. **Direction Selection**: The user interacts with `Analyzer.tsx` to refine these generated ideas. The user picks one `ContentDirection`.
3. **Script Core**: The chosen direction is passed into `ScriptDeveloper.tsx`. The LLM service drafts a script matching the constraints. The user edits the script locally inside the platform. They confirm the final text (`finalScript`).

### Flow 3: Asset Generation (Visual Logic)
1. **Asset Rendering**: With the `finalScript` confirmed, the user enters `VisualsSuite.tsx`.
2. **Lambda Invocation**: The frontend calls the Video API gateway (backed by `VideoGeneratorStack`). 
3. **Event Chain**: 
   - A job request is pushed to DynamoDB and input assets (text prompts) are dropped into S3. 
   - AWS intercepts the drop, triggering the `ParseFunction` and `GenerateFunction` lambdas utilizing Bedrock (`stability.stable-diffusion-xl-v1`) to compute visual frames.
   - `RenderFunction` compiles the frames into a video in the Output S3 Bucket.
4. **Display**: The Visual Suite polls the status API and subsequently renders the final video file for user download.

### Flow 4: Quality Assurance & Review (Review Board)
1. **Dual Review Process**: Over at `DualReview.tsx`, the generated script and proposed visual context are analyzed by two opposing AI personas (Positive / Critical). 
2. **Feedback Loop**: Recommendations are presented to the user to either greenlight the upload or send it back to the Script Core.

### Flow 5: Insight & Growth 
1. **Analytics Hub**: In `LearningHub.tsx` and `VideoEditor.tsx`, post-publish or simulated metrics are displayed via Recharts.
2. **Growth & Calendar**: Using `GrowthSuite.tsx` and `CalendarSuite.tsx`, users assign their generated content into an interactive planner. The system evaluates upload frequency.
3. **Cost Monitoring**: `CostMonitor.tsx` pulls realtime AWS/LLM token usage data from the DynamoDB `UsageMetricsTable` to display current burn rate.

### Alternative Flow: Custom AI Agents
1. **Agent Setup**: In `AgentForm.tsx`, high-powered users define custom instruction sets and domains for bespoke AI agents.
2. **Training & Deployment**: Through `AgentDetail.tsx`, users send requests to `trainingService.ts` which proxies backend API endpoints to simulate agent tuning. 
3. **Activation**: Users map trained agents to environments (Staging/Prod) leveraging `deploymentService.ts`, making them selectable in the Script Core or Live Voice strategy conversations.
