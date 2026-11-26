# 🏛️ AutoFlow System Architecture

Comprehensive architectural specifications and system design for **AutoFlow** — an autonomous multi-agent chatbot and real-time execution visualizer powered by **LangGraph**, **Google Gemini**, **FastAPI**, **Supabase PostgreSQL**, **Pinecone Vector DB**, and **React + TypeScript**.

---

## 1. High-Level System Architecture

AutoFlow decouples real-time presentation, asynchronous agent orchestration, high-speed hybrid retrieval, and transactional persistence into a clean, modular multi-tier architecture.

```mermaid
flowchart TB
    subgraph Client["🖥️ Presentation Tier (React 18 + TypeScript + Vite)"]
        UI_Chat["💬 Chat Session Stream\n(Markdown, KaTeX Math, Code Highlighting)"]
        UI_Graph["⚡ Live LangGraph Visualizer\n(Node Glow, Real-time Topology)"]
        UI_Trace["📊 Execution Trace Log\n(Step Latencies, Payload Inspection)"]
        UI_Docs["📑 Document Manager\n(PDF/Image Uploads, OCR Status)"]
        UI_Canvas["🎨 Reactive Canvas\n(Dynamic Workflow Diagrams)"]
    end

    subgraph API["🚀 Application & Gateway Tier (FastAPI + Uvicorn)"]
        Router_Chat["/api/chat/*\n(SSE Streaming & REST)"]
        Router_Graph["/api/graph/*\n(Topology & Runtime Schema)"]
        Router_Docs["/api/documents/*\n(OCR & Ingestion)"]
        Router_Export["/api/exports/*\n(PDF, XLSX, DOCX, TXT)"]
        Router_User["/api/user/*\n(Profiles, Quotas, Tiers)"]
        Router_Admin["/api/admin/*\n(Ace Super Admin Dashboard)"]
        Router_WF["/api/workflows/*\n(User Workflow CRUD)"]
        Auth_Middleware["🔐 Supabase JWT Auth & RBAC\n(Pleasant, Jack, King, Ace)"]
    end

    subgraph Orchestration["🧠 Agent Orchestration Tier (LangGraph)"]
        Graph_Engine["LangGraph StateGraph Engine"]
        Agent_Node["🤖 Agent Node\n(Decision Maker & Synthesizer)"]
        Tools_Node["🛠️ Parallel Tool Executor\n(asyncio.gather concurrency)"]
        Validator_Node["🛡️ Task Completeness Validator\n(80% Completeness Threshold)"]
        Memory_Saver["💾 MemorySaver Checkpointer\n(Thread-level State Persistence)"]
        Summarizer["📝 Dynamic Context Condenser\n(Sliding-Window Memory Synthesizer)"]
    end

    subgraph Storage["💾 Persistence & Vector Tier"]
        DB_Postgres[("🐘 Supabase PostgreSQL\n(Users, Chats, Runs, Steps, Quotas)")]
        Vector_Pinecone[("🌲 Pinecone Vector DB\n(Serverless 1536-dim Index)")]
        BM25_Index["🔍 In-Memory BM25 Index\n(Lexical Keyword Matching)"]
    end

    subgraph External["🌐 External AI & Cloud Ecosystem"]
        Gemini_API["✨ Google Gemini LLMs\n(gemini-2.5-flash / 3.1-flash-lite)"]
        Gemini_Embed["📐 Gemini Embeddings\n(models/gemini-embedding-2)"]
        Llama_Cloud["🦙 LlamaCloud OCR\n(Fast & Agentic PDF Extraction)"]
        Tavily_API["🔎 Tavily AI Search\n(Live Internet Summaries)"]
        Firecrawl_API["🔥 Firecrawl\n(Web Page & URL Scraping)"]
        Langfuse_API["🔭 Langfuse Observability\n(Traces, Latency & Evals)"]
    end

    %% Client to API Connections
    Client <-->|SSE Stream & REST JSON| API
    API --> Auth_Middleware

    %% API to Orchestration
    Router_Chat --> Graph_Engine
    Router_Docs --> Llama_Cloud
    Router_Docs --> Vector_Pinecone

    %% Graph Engine Flow
    Graph_Engine --> Agent_Node
    Agent_Node <--> Tools_Node
    Agent_Node --> Validator_Node
    Validator_Node -.->|Incomplete & iters < max| Agent_Node
    Graph_Engine --- Memory_Saver
    Graph_Engine --- Summarizer

    %% Tools to Services
    Tools_Node --> Tavily_API
    Tools_Node --> Firecrawl_API
    Tools_Node --> Vector_Pinecone
    Tools_Node --> BM25_Index

    %% Orchestration to Gemini
    Agent_Node <--> Gemini_API
    Validator_Node <--> Gemini_API
    Summarizer <--> Gemini_API

    %% Vector to Embeddings
    Vector_Pinecone <--> Gemini_Embed

    %% Data persistence
    API --> DB_Postgres
    Graph_Engine --> DB_Postgres
    API -.-> Langfuse_API
```

---

## 2. Core Architectural Subsystems

### 2.1 Presentation Tier (`frontend/`)
The frontend is built using **React 18**, **TypeScript 5.6**, **Vite 6**, and modern **TailwindCSS** with dark glassmorphism styling:
- **Three-Panel Unified Layout**:
  - **Left Drawer**: Conversation history, thread switching, new session creation, active document selector, and tool toggles.
  - **Center Viewport**: High-performance streaming chat interface supporting LaTeX math ($...$ and $$...$$) via `remark-math` and `rehype-katex`, syntax-highlighted code blocks with language pills and copy buttons, GFM tables, and collapsible tool execution cards.
  - **Right Sidebar**: Real-time topological LangGraph visualizer displaying the active executing node (`agent`, `tools`, `validator`), live millisecond execution timers, and deep payload trace inspects.
- **Server-Sent Events (SSE) Client**: Robust event-stream consumer handling low-latency token deltas, tool lifecycle events, validation scores, and graph state updates without polling.

---

### 2.2 Application & Gateway Tier (`routers/`, `main.py`)
The backend is driven by **FastAPI 0.115+** running on **Uvicorn**:
- **Modular Routers**:
  - `routers/chat.py`: Handles SSE streaming (`/api/chat/stream`), synchronous invocation (`/api/chat/invoke`), conversation history management, and thread state.
  - `routers/graph.py`: Supplies dynamic node/edge topology (`/api/graph/schema`) and active model settings (`/api/graph/config`).
  - `routers/documents.py`: Ingests PDFs, images, and DOCX files; triggers LlamaCloud OCR; orchestrates chunking and Pinecone vector indexing.
  - `routers/export.py`: Generates on-demand styled PDF, Excel (.xlsx), Word (.docx), and plain text (.txt) exports of conversation threads.
  - `routers/user.py`: Exposes user profile, subscription tier, quota meters, and tool preference updates.
  - `routers/workflows.py`: Manages user custom workflows and canvas logging.
  - `routers/admin.py`: Powers the Ace Super Admin Dashboard with system metrics, user tier promotion/demotion, and custom quota overrides.
- **Authentication & RBAC**: Decodes Supabase JWT tokens via `auth/supabase_auth.py` and validates permissions across four tiers: `pleasant`, `jack`, `king`, and `ace` via `auth/rbac.py`.

---

### 2.3 Agent Orchestration Tier (`agent/`)
Built with **LangGraph 0.2+**:
- **Unified Decision + Synthesizer Pattern**: Rather than separating decision-making and final answer synthesis into separate nodes, a single `agent` node handles both roles with zero extra latency.
- **Async Parallel Tool Execution**: When multiple tools are required (e.g., retrieving document chunks and performing web search), all tool calls are executed concurrently using `asyncio.gather()`, capped at 6 concurrent tools to respect rate limits.
- **Task Completeness Quality Gate**: An autonomous `validator` node evaluates whether the response answers $\ge 80\%$ of multi-part user requests. If deficient, it loops back with structured critique.
- **Dual Memory Layer**:
  - **Short-term Memory**: Managed by LangGraph's `MemorySaver` keyed by `thread_id`.
  - **Long-term Condensed Memory**: A dedicated Gemini summarizer condenses historical turns into structured facts, preserving motives, dates, and entity definitions across hundreds of turns.

---

### 2.4 Hybrid Vector & Storage Tier (`services/rag_service.py`, `supabase/`)
- **Supabase PostgreSQL**: Persistent relational storage for users, threads, messages, execution traces, tool records, and document metadata.
- **Pinecone Serverless Vector Database**: High-dimension vector index (`autoflow-docs`) storing 1536-dimensional embeddings produced by `models/gemini-embedding-2`.
- **Hybrid Search Engine**: Fuses Pinecone dense vector semantic matching with in-memory **BM25** keyword ranking using **Reciprocal Rank Fusion (RRF)** and Cross-Encoder reranking.
- **Safe 32KB Chunking Engine**: Automatically bisects documents and giant markdown tables at line and paragraph boundaries to guarantee that vector metadata never breaches Pinecone's 40KB hard limit.

---

## 3. End-to-End Sequence Diagram

The following sequence diagram illustrates how a user request flows through the entire system during a multi-turn RAG and tool execution lifecycle:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant Client as React Client (SSE)
    participant FastAPI as FastAPI Router
    participant Auth as Supabase Auth (JWT)
    participant Graph as LangGraph Engine
    participant Agent as Agent Node (Gemini)
    participant Tools as Parallel Tool Executor
    participant RAG as RAG Service (Pinecone + BM25)
    participant Validator as Validator Node
    participant DB as Supabase PostgreSQL

    User->>Client: Enter query + Select document
    Client->>FastAPI: POST /api/chat/stream {message, thread_id, selected_file_ids}
    FastAPI->>Auth: Verify JWT Token & Check Quota
    Auth-->>FastAPI: User verified (Tier: King)
    FastAPI->>Graph: Invoke graph.astream_events(thread_id)

    Graph->>Client: SSE event: node_start ("agent")
    Graph->>Agent: Evaluate prompt + tools + history
    Agent-->>Graph: Tool Calls: [retrieve_document_context, calculate]
    Graph->>Client: SSE event: tool_start ("retrieve_document_context", "calculate")

    par Parallel Execution
        Tools->>RAG: Hybrid Search (Pinecone dense + BM25 lexical)
        RAG-->>Tools: Grounded document passages [p.1, p.4]
    and
        Tools->>Tools: AST Math Evaluation
        Tools-->>Tools: Calculated value
    end

    Tools-->>Graph: Return ToolMessages
    Graph->>Client: SSE event: tool_end

    Graph->>Agent: Synthesize final answer with citations & math
    loop Token Streaming
        Agent-->>Client: SSE event: token ("Here is the summary...")
    end

    Graph->>Client: SSE event: node_start ("validator")
    Graph->>Validator: Validate completeness (Gemini 2.5 Flash)
    Validator-->>Graph: {completeness_score: 95, sufficient: true}
    Graph->>Client: SSE event: validation_end {score: 95, sufficient: true}

    Graph->>DB: Persist Run, Message, Steps & Tool Calls
    Graph-->>Client: SSE event: done
    Client->>User: Display rendered response & active node trace
```

---

## 4. Key Design Decisions & Highlights

| Architectural Area | Decision | Rationale |
| :--- | :--- | :--- |
| **Agent Orchestration** | LangGraph StateGraph | Enables declarative state machines, cyclical looping, deterministic validation gates, and checkpointing. |
| **LLM Provider** | Google Gemini (2.5 Flash / 3.1 Flash-Lite) | Industry-leading 1M+ token context window, multimodal vision support, rapid time-to-first-token (TTFT), and cost efficiency. |
| **Vector Database** | Pinecone Serverless | Zero-maintenance serverless scalability, sub-50ms vector query latencies, and metadata filtering per user and file. |
| **Hybrid Search** | Dense Vector + BM25 + RRF | Resolves the vocabulary mismatch problem: dense vectors capture conceptual intent, while BM25 guarantees exact-match keyword hits. |
| **Document OCR** | LlamaCloud Fast & Agentic Parsing | State-of-the-art layout-aware document extraction turning complex multi-column PDFs, tables, and charts into structured Markdown. |
| **Streaming Protocol** | Server-Sent Events (SSE) | HTTP/2-friendly, native reconnect semantics, lightweight firewall-friendly single-direction event streaming. |
| **Security & Auth** | Supabase Row-Level Security (RLS) | Enforces multi-tenant data isolation at the database kernel level; prevents unauthorized cross-tenant data access. |

---

## 5. Next Steps & Related Documentation
* 🔄 **[Agents Flow & Reasoning Lifecycle](agents-flow.md)**: State machine topology, parallel tool dispatcher, and completeness validator.
* 📡 **[Full API Reference & Specifications](apis.md)**: Comprehensive REST endpoints, request/response schemas, and SSE event contracts.
* 💾 **[Database Architecture & Schema](database.md)**: PostgreSQL entity-relationship diagrams, schema tables, and RLS policies.
* 🌲 **[Vector DB & Hybrid RAG Pipeline](vectordb.md)**: Pinecone indexing, BM25 integration, chunking algorithms, and reranking.
* ⚙️ **[Configuration & Setup Guide](configuration.md)**: Environment variables, API keys, and deployment runbooks.
