# 📘 AutoFlow Technical Documentation

A technical reference and architectural guide for **AutoFlow**, an AI Chatbot platform powered by **LangGraph**, **Google Gemini LLM**, **Tavily AI Search**, **FastAPI**, and **React + TypeScript**.

---

## 📑 Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Centralized Configuration (`config.py`)](#2-centralized-configuration-configpy)
3. [LLM Provider Layer (`llm/gemini.py`)](#3-llm-provider-layer-llmgeminipy)
4. [LangGraph Assembly & Memory Checkpointer (`agent/`)](#4-langgraph-assembly--memory-checkpointer-agent)
5. [Tools Registry & Implementation (`tools/`)](#5-tools-registry--implementation-tools)
6. [FastAPI Endpoints & SSE Streaming (`routers/`)](#6-fastapi-endpoints--sse-streaming-routers)
7. [React + TypeScript Frontend (`frontend/`)](#7-react--typescript-frontend-frontend)
8. [Setup, Deployment & Operational Runbook](#8-setup-deployment--operational-runbook)

---

## 1. Architectural Overview

AutoFlow is architected with a decoupled frontend-backend model:

```
+-----------------------------------------------------------------------------------+
|                              REACT + TYPESCRIPT UI                                |
|  [Left Sidebar: Chat Sessions] [Center: Chat Stream] [Right: LangGraph Visualizer]|
+-----------------------------------------------------------------------------------+
                                         │
                        SSE & REST JSON (/api/chat/*)
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                FASTAPI BACKEND                                    |
|   ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────────┐   |
|   │     routers/chat.py    │  │     routers/graph.py   │  │     config.py     │   |
|   └───────────┬────────────┘  └────────────────────────┘  └───────────────────┘   |
|               │                                                                   |
|               ▼                                                                   |
|   ┌───────────────────────────────────────────────────────────────────────────┐   |
|   │                      LANGGRAPH WORKFLOW ENGINE                            │   |
|   │                                                                           │   |
|   │      __start__ ────► agent_node (Gemini LLM) ───[no tools]───► __end__    │   |
|   │                            │                                              │   |
|   │                     [has tool_calls]                                      │   |
|   │                            ▼                                              │   |
|   │                       tools_node                                          │   |
|   │            (Tavily / Calculator / Time Tool)                              │   |
|   │                            │                                              │   |
|   │                            └───────[ToolMessage results]──────────────────┘   |
|   │                                                                               |
|   │      ┌─────────────────────────────────────────────────────────────────┐      |
|   │      │         MemorySaver Checkpointer (Keyed by thread_id)           │      |
|   │      └─────────────────────────────────────────────────────────────────┘      |
|   └───────────────────────────────────────────────────────────────────────────┘   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Centralized Configuration (`config.py`)

All environment variables and runtime settings are loaded once in `config.py` using `pydantic-settings` and `python-dotenv`.

```python
from config import settings

# Access settings globally
gemini_key = settings.GEMINI_API_KEY
tavily_key = settings.TAVILY_API_KEY
model_name = settings.GEMINI_MODEL       # e.g., gemini-2.5-flash
temperature = settings.GEMINI_TEMPERATURE # e.g., 0.7
```

### Environment Schema:
| Variable | Default | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `""` | Google AI Studio API key. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name identifier (e.g. `gemini-2.5-flash`, `gemini-1.5-flash`). |
| `GEMINI_TEMPERATURE` | `0.7` | Sampling temperature between `0.0` and `1.0`. |
| `TAVILY_API_KEY` | `""` | Tavily Search API key for web lookups. |
| `HOST` | `0.0.0.0` | Bind address for uvicorn server. |
| `PORT` | `8000` | Port number for FastAPI application. |
| `DEBUG` | `True` | Hot-reloading and debug mode flag. |

---

## 3. LLM Provider Layer (`llm/gemini.py`)

The LLM abstraction initializes `ChatGoogleGenerativeAI` from `langchain-google-genai` and configures environment credentials for underlying Google GenAI SDK clients.

### Factory Method:
```python
def get_gemini_llm(
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    streaming: bool = True,
) -> ChatGoogleGenerativeAI
```
- Sets `convert_system_message_to_human=True` for model compatibility.
- Enables token-level streaming for Server-Sent Events.

---

## 4. LangGraph Assembly & Memory Checkpointer (`agent/`)

### 4.1 State Schema (`agent/state.py`)
```python
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    current_node: str
    execution_steps: List[ExecutionStep]
    last_tool_call: Optional[Dict[str, Any]]
    status: str
```
- **`extract_text_content(content)`**: Normalizes message chunks (strings, lists of text dictionaries, parts) into clean Markdown strings, preventing Python `TypeError` and serialization bugs.

### 4.2 Graph Topology (`agent/chatbot_graph.py`)
1. **`START` ➔ `agent_node`**:
   - Injects the system prompt instructing Gemini to format output with Markdown, LaTeX math formulas, tables, and code fences.
   - Evaluates whether tool execution is necessary.
2. **`should_continue` (Conditional Edge)**:
   - If `AIMessage.tool_calls` is present ➔ routes to `tools_node`.
   - If no tool calls ➔ routes to `END`.
3. **`tools_node` ➔ `agent_node`**:
   - Executes requested tool(s) via `ToolNode(ALL_TOOLS)`.
   - Generates `ToolMessage` instances and loops back to `agent_node` for final response synthesis.
4. **`memory_checkpointer` (`MemorySaver`)**:
   - Checkpoints graph state per `thread_id`. Prior conversation turns and tool results are restored automatically across user interactions.

---

## 5. Tools Registry & Implementation (`tools/`)

### 5.1 Tavily Web Search (`tools/web_search.py`)
- Uses `tavily-python` (`TavilyClient`) to perform advanced web searches.
- Returns direct synthesized answers (`### Quick Answer Summary`) and ranked cited sources with relevance scores, URLs, and snippet excerpts.

### 5.2 Safe AST Math Calculator (`tools/calculator.py`)
- Safely parses mathematical expressions into an Abstract Syntax Tree (AST) using Python's `ast.NodeVisitor`.
- Supports arithmetic (`+`, `-`, `*`, `/`, `//`, `%`, `**`) and math functions (`sqrt`, `sin`, `cos`, `tan`, `log`, `log10`, `exp`, `abs`, `round`, `floor`, `ceil`, `pi`, `e`).
- Blocks arbitrary code execution (no `eval` / `exec`).

### 5.3 Global Time & Timezone (`tools/time_tool.py`)
- Resolves date, time, and ISO-8601 timestamps for any standard IANA timezone identifier (e.g. `UTC`, `Asia/Kolkata`, `America/New_York`, `Europe/London`).

---

## 6. FastAPI Endpoints & SSE Streaming (`routers/`)

### 6.1 Server-Sent Events Protocol (`POST /api/chat/stream`)
Accepts `ChatRequest` containing `{ "message": str, "thread_id": str, "history": [...] }`.

Emits real-time SSE events:
- **`node_start`**: Emitted when entering a node (`__start__`, `agent`, `tools`, `__end__`).
- **`node_end`**: Emitted upon node completion with execution payload summary.
- **`token`**: Real-time LLM token chunks (`{"delta": "..."}`).
- **`tool_start`**: Emitted when a tool begins (`{"tool_name": "...", "input": {...}}`).
- **`tool_end`**: Emitted when a tool finishes (`{"tool_name": "...", "output": "..."}`).
- **`done`**: Workflow completion marker.
- **`error`**: Error diagnostic message.

### 6.2 REST Endpoints Reference
| Route | Method | Payload / Params | Description |
| :--- | :--- | :--- | :--- |
| `/api/chat/stream` | `POST` | `ChatRequest` | Streaming SSE endpoint with checkpointer memory. |
| `/api/chat/invoke` | `POST` | `ChatRequest` | Synchronous REST invocation returning complete final state. |
| `/api/chat/threads/{id}/history` | `GET` | `thread_id` (path) | Retrieves message history from memory checkpointer. |
| `/api/chat/threads/{id}` | `DELETE` | `thread_id` (path) | Clears thread memory in checkpointer. |
| `/api/graph/schema` | `GET` | None | Returns node topology, edges, and tool metadata for UI. |
| `/api/graph/config` | `GET` | None | Returns runtime server & model configuration. |
| `/docs` | `GET` | None | Interactive OpenAPI / Swagger UI. |

---

## 7. React + TypeScript Frontend (`frontend/`)

### 7.1 Architecture & Layout
- **Left Sidebar (`ChatSidebar.tsx`)**:
  - `+ New Chat` button to initialize new session threads.
  - Conversation list with title, message counts, and timestamps.
  - Delete and switch session actions.
  - Collapsible drawer toggle.
- **Center Panel (`ChatPanel.tsx` & `MessageItem.tsx`)**:
  - Streaming Markdown responses with auto-scrolling.
  - **Syntax-Highlighted Code Blocks**: Language badges and one-click "Copy Code" button.
  - **LaTeX Math Formulas**: Rendered inline ($...$) and block-level ($$...$$) via `remark-math` and `rehype-katex`.
  - **GFM Tables**: Responsive tables with glassmorphism dark theme.
  - **Tool Cards (`ToolCard.tsx`)**: Collapsible cards displaying tool name, execution status, input arguments, and output previews.
  - **Prompt Presets**: Instant one-click calculation, timezone, and web search prompts.
- **Right Panel (`GraphPanel.tsx`, `GraphCanvas.tsx`, `TraceTimeline.tsx`)**:
  - **Visual Graph Flow**: Interactive boxes for `__start__`, `agent_node` (Gemini), `tools_node`, and `__end__`.
  - **Real-Time Node Glow**: Pulse animations dynamically illuminating the active node during execution.
  - **Execution Trace Log**: Chronological step-by-step latency, input/output inspection, and event status.

---

## 8. Setup, Deployment & Operational Runbook

### 8.1 Installation
```bash
# 1. Install backend requirements
pip install -r requirements.txt

# 2. Build frontend assets
cd frontend
npm install
npm run build
cd ..
```

### 8.2 Starting the Production Server
```bash
python main.py
```
Access the application at **`http://localhost:8000`**.

### 8.3 Running in Local Development Mode
```bash
# Terminal 1: Backend with hot reload
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend with Vite hot reload
cd frontend
npm run dev
```
Access Vite dev server at **`http://localhost:5173`**.
