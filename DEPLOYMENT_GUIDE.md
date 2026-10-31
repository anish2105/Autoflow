# 🚀 AutoFlow Deployment Guide: Render (Backend) + Vercel (Frontend)

This complete, production-ready guide walks you through preparing your repository for Git, uploading to GitHub, deploying the **FastAPI backend to Render**, and deploying the **React/Vite frontend to Vercel**.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Preparing & Uploading the Repository to GitHub](#2-preparing--uploading-the-repository-to-github)
3. [Deploying the Backend to Render](#3-deploying-the-backend-to-render)
4. [Deploying the Frontend to Vercel](#4-deploying-the-frontend-to-vercel)
5. [Supabase & OAuth Configuration](#5-supabase--oauth-configuration)
6. [Post-Deployment Verification Checklist](#6-post-deployment-verification-checklist)

---

## 1. Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              User's Browser                  │
                      └──────────────┬───────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│     Vercel Frontend     │                         │      Render Backend     │
│   (React 18 + Vite)     │                         │  (FastAPI + LangGraph)  │
│  autoflow.vercel.app    │                         │  autoflow.onrender.com  │
└──────────┬──────────────┘                         └────────────┬────────────┘
           │                                                     │
           │ API Calls & SSE Stream (VITE_API_BASE)              │
           └─────────────────────────────────────────────────────┤
                                                                 │
                                    ┌────────────────────────────┼───────────────────────────┐
                                    ▼                            ▼                           ▼
                        ┌───────────────────────┐    ┌───────────────────────┐   ┌───────────────────────┐
                        │       Supabase        │    │     Google Gemini     │   │       Pinecone        │
                        │  Auth + PostgreSQL    │    │ (Agent + Validator)   │   │  (Hybrid Document RAG)│
                        └───────────────────────┘    └───────────────────────┘   └───────────────────────┘
```

* **Frontend**: React 18, TypeScript, Vite, KaTeX, Lucide Icons, and Supabase client-side Auth.
* **Backend**: FastAPI, LangGraph workflow, Python 3.12, Uvicorn, and SSE streaming.
* **Storage & Vectors**: Supabase PostgreSQL + Pinecone Serverless vector index.

---

## 2. Preparing & Uploading the Repository to GitHub

### Step 2.1: Verify Sensitive Files Are Ignored
Ensure `.env`, `node_modules`, `dist`, and `.venv` are never committed. The `.gitignore` is already set up to protect your secrets.

To confirm nothing sensitive is staged, run:
```bash
git status
```
*(You should see untracked source files and `.env.example`, but **NOT** `.env` or `node_modules/` or `.venv/`)*.

### Step 2.2: Initialize and Commit Locally
Open PowerShell or your terminal in the root directory (`d:\Projects\LLM\AutoFlow_V1`):

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Stage all project files
git add .

# 3. Create initial commit
git commit -m "feat: AutoFlow v1.0.0 - Full LangGraph Chatbot with RBAC and Hybrid RAG"
```

### Step 2.3: Push to GitHub
1. Go to [GitHub](https://github.com/new) and create a new repository (e.g. `AutoFlow_V1`).
2. Keep it **Private** or **Public**. Do **not** initialize with README/license (we already have them).
3. Link and push your repository:

```bash
# Set default branch to main
git branch -M main

# Add your remote repository (replace with your GitHub repo URL)
git remote add origin https://github.com/<your-username>/AutoFlow_V1.git

# Push code to GitHub
git push -u origin main
```

---

## 3. Deploying the Backend to Render

Render will host the FastAPI backend, LangGraph state engine, and SSE stream endpoints.

### Step 3.1: Create Web Service on Render
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** ➔ Select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub repository (`AutoFlow_V1`).

### Step 3.2: Configure Service Settings
In the Render Web Service creation screen, configure:

| Setting | Value |
| :--- | :--- |
| **Name** | `autoflow-backend` (or your preferred name) |
| **Region** | `Oregon (US West)` or closest to your users |
| **Branch** | `main` |
| **Root Directory** | *(leave blank)* |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free (or Starter for always-on instance without cold starts) |

### Step 3.3: Set Environment Variables in Render
In the **Environment Variables** section on Render, add the following keys:

| Environment Variable | Description / Recommended Value |
| :--- | :--- |
| `PYTHON_VERSION` | `3.12.0` |
| `GEMINI_API_KEY` | Your Google AI Studio API key (`AIza...`) |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` (or `gemini-2.5-flash`) |
| `GEMINI_TEMPERATURE` | `0.2` |
| `VALIDATOR_MODEL` | `gemini-2.5-flash` |
| `SUPABASE_URL` | `https://<your-project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` *(Found in Supabase: Project Settings ➔ API ➔ `service_role` secret)* |
| `SUPABASE_JWT_SECRET` | `your-jwt-secret` *(Found in Supabase: Project Settings ➔ API ➔ JWT Settings)* |
| `TAVILY_API_KEY` | `tvly-...` *(From tavily.com)* |
| `Firecrawl_API_KEY` | `fc-...` *(From firecrawl.dev)* |
| `LLAMA_CLOUD_API_KEY` | `llx-...` *(From cloud.llamaindex.ai)* |
| `PINECONE_API_KEY` | `pcsk_...` *(From app.pinecone.io)* |
| `PINECONE_INDEX_NAME` | `autoflow-docs` |
| `EMBEDDING_MODEL` | `models/gemini-embedding-2` |
| `EMBEDDING_DIMENSION` | `1536` |
| `ACE_EMAILS` | `your-admin-email@gmail.com` *(Optional super admin fallback)* |
| `DEBUG` | `False` |

### Step 3.4: Set Health Check Path
Under **Advanced Settings** on Render:
* **Health Check Path**: `/api/graph/schema`

Click **Create Web Service**. Wait ~2-3 minutes for the build to finish. Once live, copy your backend URL:
`https://autoflow-backend.onrender.com`

---

## 4. Deploying the Frontend to Vercel

Vercel provides instant global edge deployment and automated CI/CD for Vite React applications.

### Step 4.1: Import Project to Vercel
1. Log in to [Vercel](https://vercel.com/dashboard).
2. Click **Add New...** ➔ **Project**.
3. Select your `AutoFlow_V1` repository from GitHub.

### Step 4.2: Configure Root Directory & Build Settings
* **Project Name**: `autoflow`
* **Framework Preset**: `Vite`
* **Root Directory**: Click **Edit** and choose `frontend` *(Crucial: must point to `frontend`)*.
* **Build Command**: `npm run build` *(auto-detected)*.
* **Output Directory**: `dist` *(auto-detected)*.

### Step 4.3: Set Environment Variables in Vercel
Expand the **Environment Variables** panel in Vercel and add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE` | `https://autoflow-backend.onrender.com` | **Use your exact Render backend URL from Section 3!** |
| `VITE_SUPABASE_URL` | `https://<your-project>.supabase.co` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Your Supabase `anon` public key |

Click **Deploy**. In ~30-45 seconds, your frontend will be live at:
`https://autoflow.vercel.app` (or your assigned Vercel URL).

---

## 5. Supabase & OAuth Configuration

Because your app is now hosted on public domains, update Supabase with your Vercel frontend URL.

### Step 5.1: Update Supabase Redirect URLs
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication** ➔ **URL Configuration**.
3. Set **Site URL**:
   ```
   https://autoflow.vercel.app
   ```
4. In **Redirect URLs**, click **Add URL** and add:
   ```
   https://autoflow.vercel.app/**
   https://autoflow.vercel.app
   http://localhost:5173/**
   ```
5. Click **Save**.

### Step 5.2: Update Google Cloud OAuth Credentials (If using Google Sign-In)
If Google OAuth is enabled in Supabase:
1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 Client ID.
3. Under **Authorized JavaScript origins**, add:
   * `https://autoflow.vercel.app`
   * `https://<your-project>.supabase.co`
4. Under **Authorized redirect URIs**, ensure your Supabase callback URL is listed:
   * `https://<your-project>.supabase.co/auth/v1/callback`
5. Click **Save**.

### Step 5.3: Ensure Supabase Migrations Are Executed
If not already executed, run the SQL migrations located in `supabase/migrations/` in your Supabase SQL Editor in numerical order:
1. `001_initial_schema.sql` (Conversations, Messages, Runs, Steps)
2. `002_chat_exports.sql` (Exports table)
3. `003_user_documents.sql` (Document repository)
4. `004_document_content_hash.sql` (Document deduplication)
5. `005_user_roles_and_quotas.sql` (Tiers, Quotas, Ace role assignment)

---

## 6. Post-Deployment Verification Checklist

1. [ ] **Backend Health Check**:
   Visit `https://autoflow-backend.onrender.com/docs` in your browser. You should see the interactive FastAPI Swagger UI.
2. [ ] **Frontend Loading**:
   Visit `https://autoflow.vercel.app`. The introduction landing page should display with all four tiers (Pleasant, Jack, King, Ace).
3. [ ] **Authentication**:
   Click **Sign In with Google**. Complete login and verify your profile loads in the header.
4. [ ] **Chat Streaming & Node Visualization**:
   Send a chat message (e.g. *"What is the current time in Tokyo?"*).
   * Verify token-by-token streaming works.
   * Verify the right panel displays the live node execution graph (`agent` ➔ `tools` ➔ `validator` ➔ `__end__`).
5. [ ] **Toggled-Off Tools**:
   Toggle off **Web Search** in the Tools panel and ask a question. Verify the agent answers using parametric knowledge and appends the polite notice to enable Web Search.
6. [ ] **Document Upload & Deduplication**:
   Upload a PDF or DOCX file. Verify OCR parsing, document list status, and Pinecone embedding. Re-uploading the same file should detect deduplication.
7. [ ] **Ace Admin Dashboard**:
   Log in with an authorized Ace account. Verify the **Admin** shield icon appears in the left navigation sidebar and the user management table loads.

---

### 🎉 Congratulations!
Your AutoFlow application is now fully deployed with a robust, scalable architecture on **Render + Vercel + Supabase + Pinecone**!

