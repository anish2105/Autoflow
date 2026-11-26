# 📡 AutoFlow API Reference & Specification

Complete REST and Server-Sent Events (SSE) API specification for the **AutoFlow** backend engine.

---

## 1. Authentication & Role-Based Access Control (RBAC)

AutoFlow integrates with **Supabase Authentication**. Protected endpoints require a valid Supabase JWT Bearer token passed in the `Authorization` header:

```http
Authorization: Bearer <supabase_jwt_token>
```

### User Roles & Tier Quotas:
| Tier | Description | Message Quota | Document Quota | Available Tools |
| :--- | :--- | :--- | :--- | :--- |
| **`pleasant`** | Free trial tier | 25 messages/day | 3 documents | Basic tools (calculate, time, search) |
| **`jack`** | Standard default tier | 100 messages/day | 15 documents | Basic tools + Firecrawl scrape + exports |
| **`king`** | Pro power user | 500 messages/day | 100 documents | Full suite + LlamaCloud Agentic OCR + RAG |
| **`ace`** | Super Admin | Unlimited | Unlimited | Full access + Admin Dashboard & Metrics |

---

## 2. Interactive Swagger / OpenAPI Documentation

AutoFlow provides interactive visual documentation when the backend server is running:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema (JSON)**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 3. Chat & Agent Endpoints (`/api/chat`)

### 3.1 Real-Time Streaming Chat (SSE)
```http
POST /api/chat/stream
Content-Type: application/json
```
Streams token deltas, tool executions, and node state transitions chunk-by-chunk in real time using Server-Sent Events.

#### Request Body:
```json
{
  "message": "Summarize page 2 of my uploaded contract and calculate 15% tax on $2,400.",
  "thread_id": "session-uuid-1234",
  "selected_file_ids": ["doc-uuid-5678"],
  "enabled_tools": ["retrieve_document_context", "calculate"]
}
```

#### SSE Event Protocol Stream:
```text
event: node_start
data: {"node": "agent", "timestamp": "2026-11-26T23:50:00Z"}

event: tool_start
data: {"tool": "retrieve_document_context", "input": {"query": "page 2 terms"}}

event: tool_end
data: {"tool": "retrieve_document_context", "output": "Retrieved 2 chunks..."}

event: token
data: {"delta": "Based on page 2 of your contract, "}

event: token
data: {"delta": "the total amount after 15% tax is $2,760."}

event: node_start
data: {"node": "validator", "timestamp": "2026-11-26T23:50:02Z"}

event: validation_end
data: {"completeness_score": 95.0, "sufficient": true, "critique": "All tasks answered."}

event: done
data: {"thread_id": "session-uuid-1234", "status": "completed"}
```

---

### 3.2 Synchronous Chat Execution
```http
POST /api/chat/invoke
Content-Type: application/json
```
Executes the workflow synchronously, blocking until complete and returning the final state payload.

#### Response:
```json
{
  "response": "Based on page 2 of your contract...",
  "thread_id": "session-uuid-1234",
  "execution_steps": [
    {"step_id": 1, "node": "agent", "type": "llm", "latency_ms": 320},
    {"step_id": 2, "node": "tools", "type": "tool", "latency_ms": 410},
    {"step_id": 3, "node": "validator", "type": "validator", "latency_ms": 190}
  ],
  "validation": {
    "sufficient": true,
    "completeness_score": 95.0
  }
}
```

---

### 3.3 Conversation Sessions Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/chat/conversations` | List all conversation sessions for the authenticated user. |
| `POST` | `/api/chat/conversations` | Create a new conversation session (`{"title": "..."}`). |
| `GET` | `/api/chat/conversations/{conversation_id}/messages` | Retrieve persistent message history for a conversation. |
| `DELETE` | `/api/chat/conversations/{conversation_id}` | Delete a conversation and cascade remove its messages and runs. |
| `GET` | `/api/chat/threads/{thread_id}/history` | Retrieve in-memory state from the `MemorySaver` checkpointer. |
| `DELETE` | `/api/chat/threads/{thread_id}` | Reset in-memory checkpointer state for a thread. |
| `POST` | `/api/chat/feedback` | Submit user feedback (thumbs up/down, rating, notes) on an execution run. |

---

## 4. Graph Visualizer Endpoints (`/api/graph`)

### 4.1 Graph Topology Schema
```http
GET /api/graph/schema
```
Returns nodes, edges, styling metadata, and tool specifications for rendering the visual state graph in the React visualizer.

#### Response Schema:
```json
{
  "nodes": [
    {"id": "__start__", "label": "User Input", "type": "start", "color": "#10b981"},
    {"id": "agent", "label": "AutoFlow Agent", "type": "llm", "color": "#6366f1"},
    {"id": "tools", "label": "Tool Dispatcher", "type": "tool", "color": "#ec4899"},
    {"id": "validator", "label": "Validator", "type": "validator", "color": "#f59e0b"},
    {"id": "__end__", "label": "Final Output", "type": "end", "color": "#10b981"}
  ],
  "edges": [
    {"from": "__start__", "to": "agent", "type": "direct"},
    {"from": "agent", "to": "tools", "type": "conditional", "label": "has tool calls"},
    {"from": "agent", "to": "validator", "type": "conditional", "label": "response ready"},
    {"from": "tools", "to": "agent", "type": "direct", "label": "tool results"},
    {"from": "validator", "to": "__end__", "type": "conditional", "label": ">= 80% complete"},
    {"from": "validator", "to": "agent", "type": "conditional", "label": "< 80% incomplete"}
  ]
}
```

### 4.2 Runtime Configuration
```http
GET /api/graph/config
```
Returns active server configuration, LLM model identifier, validator model, and enabled feature flags.

---

## 5. Document Management & OCR Endpoints (`/api/documents`)

### 5.1 Upload & Ingest Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data
```
Uploads a document (PDF, PNG, JPG, DOCX), performs SHA-256 deduplication, executes LlamaCloud OCR parsing, generates Gemini embeddings, and upserts vectors into Pinecone.

#### Form Parameters:
- `file`: Binary file upload.
- `tier`: OCR parsing tier (`fast` or `agentic`, default: `fast`).

#### Response:
```json
{
  "id": "doc-uuid-5678",
  "filename": "quarterly_report.pdf",
  "status": "digitized",
  "page_count": 12,
  "chunk_count": 28,
  "file_size": 1048576,
  "ocr_tier": "fast",
  "created_at": "2026-11-26T23:51:00Z"
}
```

### 5.2 Document Operations Table
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents` | List all uploaded documents for the user with status. |
| `GET` | `/api/documents/{doc_id}` | Retrieve document metadata and full page-wise Markdown text. |
| `GET` | `/api/documents/{doc_id}/status` | Poll asynchronous OCR parsing and indexing status (`uploaded`, `processing`, `digitized`, `failed`). |
| `DELETE` | `/api/documents/{doc_id}` | Delete document record and purge all associated vector embeddings from Pinecone. |

---

## 6. Document & Chat Export Endpoints (`/api/exports`)

### 6.1 Generate Export Artifact
```http
POST /api/exports/generate
Content-Type: application/json
```
#### Request Body:
```json
{
  "conversation_id": "conv-uuid-1234",
  "format": "pdf", // Options: "pdf", "excel", "docx", "txt"
  "title": "Quarterly Analysis Summary"
}
```

#### Response:
```json
{
  "export_id": "export-uuid-9999",
  "format": "pdf",
  "filename": "Quarterly_Analysis_Summary.pdf",
  "download_url": "/api/exports/download/export-uuid-9999",
  "created_at": "2026-11-26T23:52:00Z"
}
```

### 6.2 Download Export File
```http
GET /api/exports/download/{export_id}
```
Streams the pre-generated binary file with appropriate MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`).

---

## 7. User Profile & Tool Configuration (`/api/user`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/user/profile` | Returns current user profile, subscription tier, remaining daily message quota, and document usage. |
| `POST` | `/api/user/upgrade-request` | Submits a request to promote tier from Pleasant/Jack to King/Ace (`{"requested_tier": "king", "reason": "..."}`). |
| `GET` | `/api/user/tools` | Retrieves user's enabled/disabled tool configuration list. |
| `PUT` | `/api/user/tools` | Persists user's custom tool toggles (`{"enabled_tools": ["calculate", "web_search"]}`). |

---

## 8. Custom Workflows Endpoints (`/api/workflows`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/workflows` | List saved user workflows. |
| `POST` | `/api/workflows` | Save a new custom workflow schema. |
| `GET` | `/api/workflows/{workflow_id}` | Retrieve specific workflow definition by ID. |
| `PUT` | `/api/workflows/{workflow_id}` | Update workflow nodes, edges, or prompt configuration. |
| `DELETE` | `/api/workflows/{workflow_id}` | Delete a custom workflow. |
| `POST` | `/api/workflows/log_canvas` | Log visual Mermaid code and canvas states to the server telemetry pipeline. |

---

## 9. Ace Super Admin Dashboard (`/api/admin`)

*Restricted strictly to authenticated users with tier `ace`.*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/metrics` | Returns aggregated platform metrics (total users, runs, latencies, tool execution volume). |
| `GET` | `/api/admin/users` | List all users across tiers with usage statistics. |
| `PUT` | `/api/admin/users/{user_id}/tier` | Promotes or demotes user tier (`{"tier": "king"}`). |
| `PUT` | `/api/admin/users/{user_id}/limits` | Sets custom quota overrides (`{"custom_msg_limit": 1000, "custom_doc_limit": 200}`). |
| `GET` | `/api/admin/upgrade-requests` | Retrieves pending tier upgrade requests queue. |
| `POST` | `/api/admin/upgrade-requests/{id}/review`| Approves or rejects upgrade request (`{"action": "approved"}`). |

---

## 10. Next Steps & Related Documentation
* 🏛️ **[System Architecture](architecture.md)**: High-level overview and data flow.
* 🔄 **[Agents Flow & Reasoning](agents-flow.md)**: State graph logic and validator mechanics.
* 💾 **[Database Architecture](database.md)**: PostgreSQL schemas, tables, and Supabase RLS.
* 🌲 **[Vector DB & Hybrid RAG](vectordb.md)**: Pinecone indexing and BM25 search.
* ⚙️ **[Configuration & Setup Guide](configuration.md)**: Environment keys and settings reference.
