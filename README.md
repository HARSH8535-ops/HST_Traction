#  TractionPal

AI-powered content creation and growth strategy platform — built for the **AI for Bharat** Hackathon.

TractionPal is a full-stack web application that helps content creators research, script, visualize, review, and grow their content across major social media platforms using Google Gemini AI and AWS cloud services.

---

##  Features

| Module | Description |
|---|---|
| **Workspace Dashboard** | Central hub to manage active projects and navigate all modules |
| **Deployment (Project Setup)** | Configure platform, purpose, emotion, form, and genre for your content project |
| **Market Lab (Research)** | AI-driven creative exploration and content direction analyzer |
| **Script Core** | Develop and finalize scripts with AI assistance based on selected content directions |
| **Visual Logic** | AI-powered visuals suite including video generation via AWS Lambda / Veo |
| **Review Board** | Dual-perspective AI review (positive & critical) with publish recommendations |
| **Performance Analytics** | Video editor analysis and AI-powered learning hub with creator retrospectives |
| **Growth Flow** | Growth strategy suite and content calendar planner |
| **AI Agents** | Create, train, deploy, and manage custom AI agents for specialized content tasks |
| **Strategy Voice** | Live voice conversation with AI for real-time strategic guidance |
| **Cost Monitor** | Real-time API usage and cost tracking |
| **Privacy Controls** | Data audit log and workspace purge controls |

---

##  Tech Stack

### Frontend
- **React + TypeScript** — UI framework
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **Recharts** — Data visualization and analytics charts
- **Anime.js** — Smooth UI micro-animations

### AI & Cloud Services
- **Google Gemini API** (`@google/genai`) — Core AI engine for content analysis, script generation, creative direction, and reviews
- **AWS S3** — Media storage for generated assets
- **AWS Lambda** — Serverless video/media processing
- **AWS CDK (Python)** — Infrastructure as code for the backend stack

### Backend
- **Python (3.10+)** + **AWS CDK** — Defines and deploys cloud infrastructure (`BackendStack`)
- **Services layer (TypeScript)** — Abstracted service modules for Gemini, S3, Lambda, deployment, training, security, caching, and usage metrics

---

### Project Structure (Reorganized)

```
HST_Traction/
├── frontend/                # React + TypeScript frontend (Vite)
│   ├── index.html
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/      # UI components
│   │   ├── services/        # TypeScript service modules and tests
│   │   └── styles/
│   └── vite.config.ts
├── backend_service/         # Python backend, CDK, and video-generator feature
│   ├── app.py
│   ├── backend/             # CDK stacks
│   ├── db/                  # Migrations
│   └── video_generator/     # Previously "Video generator feature"
├── package.json             # Root single-package scripts for dev/build/test
├── CHANGELOG.md
└── .env.example
```

### Reorganization

This repository was reorganized to separate the frontend and backend concerns:

- Frontend sources are now under `frontend/src/` with `vite` and `tsconfig` adjusted to use `src` as the project root.
- Backend code (including the video generator feature and DB migrations) was moved into `backend_service/`.
- Root `package.json` was updated to run the frontend dev server using `frontend/vite.config.ts` and to reference the relocated Jest setup.

This change keeps the repository easier to navigate and prepares the project for clearer build and deployment workflows.

---

##  Getting Started

### Prerequisites
- **Node.js** 18+ and **npm** or **pnpm**
- **Python 3.10+** (for backend CDK deployment)
- A **Google Cloud project** with the Gemini API enabled (or configured via Google AI Studio)
- **AWS CLI** configured (for S3, Lambda, and CDK features)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd HST_Traction
```

### 2. Install Frontend Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and set the keys required for your workspace, for example:

```env
ENCRYPTION_KEY=your_secure_encryption_key
AUDIT_KEY=your_audit_key
# Add cloud credentials or pointers to credential files as needed
```

Note: A **Gemini API credential** (or an active selection in Google AI Studio) is required at runtime for Gemini-related features.

### 4. Run the Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser (default Vite address).

---

##  Backend Deployment (AWS CDK)

The backend infrastructure is defined using **AWS CDK (Python)**.

```bash
cd backend

# Create and activate a virtual environment (Windows)
python -m venv .venv
.venv\Scripts\activate.bat

# macOS / Linux
# python -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Deploy to AWS (after configuring AWS CLI credentials)
cdk deploy
```

### Useful CDK Commands

- `cdk ls` — list stacks
- `cdk synth` — synthesize CloudFormation template
- `cdk deploy` — deploy stack to AWS
- `cdk diff` — compare deployed stack with local changes

---

##  Testing

```bash
# Run tests
npm test

# Run lint/type-check
npm run lint
```

Test files are colocated in the `services/` directory (for example `agentIntegrationService.test.ts`).

---

##  AI Agent System

TractionPal includes a full **AI Agent lifecycle management** system:

- **Task Types**: Script Analysis, Emotional Alignment, Content Generation, Performance Analysis, Growth Tactics, Thumbnail Creation
- **Data Sources**: Public datasets, Creator history, Custom uploads, Hybrid mode
- **Lifecycle**: Draft → Training → Ready → Deployed (with retraining support)
- **Persona Config**: Customize tone, style, response length, and domain knowledge per agent

---

##  Privacy & Security

- All sensitive data is encrypted using a configurable `ENCRYPTION_KEY`.
- A full **audit log** tracks actions within the workspace.
- The **Privacy Controls** panel allows users to view the audit log and permanently purge workspace data.

---

##  Built With

This project was built as part of the **AI for Bharat** Hackathon, demonstrating how AI can empower Indian content creators with world-class tools for ideation, production, and growth.
