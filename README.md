# TractionPal

TractionPal is a full-stack platform built for the **AI for Bharat** hackathon. It provides content creators in emerging markets with an end-to-end suite for researching, scripting, visual planning, and analyzing social media content.

The goal of this project is to unify the fragmented tools creators use today—combining research, AI generation, and strategy into one workspace powered by Google Gemini and AWS.

## Features

- **Workspace Dashboard:** Manage active projects and track your workflow.
- **Content Ideation & Research:** AI-driven exploration to find market gaps and audience interests.
- **Script Generation:** Collaborative scripting environment powered by Gemini AI.
- **Visuals & Video Generation:** Automated visual asset and video generation using AWS Lambda and S3.
- **Review & Feedback:** Automated pre-publish review to evaluate content tone and structure.
- **Performance Analytics:** Post-publish dashboards to track content success and learn from past performance.
- **Custom AI Agents:** Deploy specialized agents trained on specific creator personas or tasks.

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Recharts (Data visualization)

**Backend & Cloud (AWS CDK):**
- AWS Lambda (Serverless processing)
- AWS S3 (Media storage)
- Google Gemini API (`@google/genai`) for core AI features
- Python 3.10+ (Infrastructure as Code)

## Project Structure

```text
HST_Traction/
├── frontend/                # React application
│   ├── src/                 # UI components and services
│   ├── package.json         
│   └── vite.config.ts       
├── backend_service/         # AWS CDK backend
│   ├── backend/             # CDK constructs and stacks
│   ├── video_generator/     # Media processing Lambdas
│   └── app.py               
└── package.json             # Root monorepo scripts


Running Locally
Prerequisites
Node.js 18+
Python 3.10+
AWS CLI configured
Google Gemini API Key
1. Frontend Setup
Clone the repository:

bash
git clone https://github.com/HARSH8535-ops/HST_Traction.git
cd HST_Traction
Install dependencies:

bash
npm install
Set up environment variables:

bash
cp .env.example .env
(Add your Gemini API key and any other required credentials to 

.env
)

Start the local development server:

bash
npm run dev
The application will be available at http://localhost:5173.

2. Backend Setup (AWS CDK)
The backend infrastructure is managed via AWS CDK.

bash
cd backend_service/backend
# Create a virtual environment
python -m venv .venv
# Activate it (Windows)
.venv\Scripts\activate.bat
# (macOS/Linux: source .venv/bin/activate)
# Install CDK dependencies
pip install -r requirements.txt
# Deploy to AWS
cdk deploy
Security & Privacy
Encryption: Local workspace data is secured using a user-defined encryption key.
Data Control: Users have full control to purge their workspace and audit logs at any time.
Built for the AI for Bharat Hackathon.
