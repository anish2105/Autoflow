# ⚙️ AutoFlow Configuration & Environment Reference

Complete configuration manual, environment variables specification, API key provisioning guides, and operational presets for **AutoFlow**.

---

## 1. Environment Variables Reference (`.env`)

All runtime settings are managed via `config.py` using `pydantic-settings` and loaded from the project root `.env` file.

| Variable | Type | Default | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`GEMINI_API_KEY`** | `string` | `""` | **Yes** | Google AI Studio API key powering Gemini LLM and embeddings. |
| **`GEMINI_MODEL`** | `string` | `gemini-2.5-flash` | No | Primary reasoning and tool synthesis model (`gemini-2.5-flash`, `gemini-3.1-flash-lite`). |
| **`GEMINI_TEMPERATURE`** | `float` | `0.7` | No | Sampling temperature for the primary agent ($0.0 - 1.0$). |
| **`VALIDATOR_MODEL`** | `string` | `gemini-2.5-flash` | No | Dedicated model for the Task Completeness Quality Gate. |
| **`TAVILY_API_KEY`** | `string` | `""` | **Yes** | Tavily AI Search API key for real-time web research. |
| **`FIRECRAWL_API_KEY`** | `string` | `""` | No | Firecrawl API key for deep web page and online PDF scraping. |
| **`LLAMA_CLOUD_API_KEY`**| `string` | `""` | **Yes** | LlamaCloud API key for Fast and Agentic PDF OCR parsing. |
| **`SUPABASE_URL`** | `string` | `""` | **Yes** | Supabase project URL (`https://<project-id>.supabase.co`). |
| **`SUPABASE_SERVICE_ROLE_KEY`**| `string` | `""` | **Yes** | Supabase Service Role Secret Key (bypasses RLS for admin tasks). |
| **`SUPABASE_JWT_SECRET`** | `string` | `""` | **Yes** | JWT Secret for decoding user access tokens. |
| **`ACE_EMAILS`** | `string` | `""` | No | Comma-separated list of emails auto-assigned to Super Admin `ace` tier. |
| **`PINECONE_API_KEY`** | `string` | `""` | **Yes** | Pinecone API key for serverless vector database indexing. |
| **`PINECONE_ENVIRONMENT`** | `string` | `""` | No | Pinecone environment region (if required by plan). |
| **`PINECONE_INDEX_NAME`** | `string` | `autoflow-docs` | No | Pinecone index name holding 1536-dimensional embeddings. |
| **`EMBEDDING_MODEL`** | `string` | `models/gemini-embedding-2` | No | Google GenAI embedding model identifier. |
| **`EMBEDDING_DIMENSION`** | `integer` | `1536` | No | Dimension size of embedding vectors. |
| **`LANGFUSE_SECRET_KEY`** | `string` | `""` | No | Langfuse private secret key for trace telemetry. |
| **`LANGFUSE_PUBLIC_KEY`** | `string` | `""` | No | Langfuse public key for client observability. |
| **`LANGFUSE_HOST`** | `string` | `https://cloud.langfuse.com` | No | Langfuse endpoint host. |
| **`HOST`** | `string` | `0.0.0.0` | No | Bind network interface address for Uvicorn server. |
| **`PORT`** | `integer` | `8000` | No | Port number for FastAPI HTTP and SSE server. |
| **`DEBUG`** | `boolean` | `True` | No | Enables hot reloading and detailed server logging. |

---

## 2. API Key Provisioning Walkthrough

### 2.1 Google Gemini AI Studio
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and generate a new key.
3. Set `GEMINI_API_KEY=AIzaSy...` in your `.env` file.
4. *Recommended Models*: `gemini-2.5-flash` (balanced speed & reasoning) or `gemini-3.1-flash-lite` (ultra-low latency).

---

### 2.2 Supabase PostgreSQL & Auth
1. Create a new project at [Supabase](https://supabase.com/).
2. Go to **Project Settings** $\rightarrow$ **API**:
   - Copy **Project URL** to `SUPABASE_URL`.
   - Copy **service_role (secret)** key to `SUPABASE_SERVICE_ROLE_KEY`.
   - Copy **JWT Secret** under *JWT Settings* to `SUPABASE_JWT_SECRET`.
3. Apply the database migrations located in `supabase/migrations/`:
   ```bash
   # Run through Supabase SQL Editor in numerical order:
   # 001_initial_schema.sql
   # 002_chat_exports.sql
   # 003_user_documents.sql
   # 004_document_content_hash.sql
   # 005_user_roles_and_quotas.sql
   # 006_user_workflows.sql
   ```

---

### 2.3 Pinecone Vector Database
1. Sign up at [Pinecone](https://app.pinecone.io/).
2. Create a new **Serverless Index**:
   - **Name**: `autoflow-docs`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
3. Retrieve your API Key from the **API Keys** tab and set `PINECONE_API_KEY`.

---

### 2.4 LlamaCloud OCR Service
1. Visit [LlamaIndex Cloud](https://cloud.llamaindex.ai/).
2. Navigate to **API Keys** and generate a new key.
3. Set `LLAMA_CLOUD_API_KEY=llx-...`. Supports both Fast OCR and layout-aware Agentic OCR.

---

### 2.5 Tavily Search & Firecrawl Scraper
1. **Tavily AI Search**: Create an account at [Tavily](https://tavily.com/) and copy the API key to `TAVILY_API_KEY`.
2. **Firecrawl Web Scraper**: Sign up at [Firecrawl](https://firecrawl.dev/) and set `FIRECRAWL_API_KEY`.

---

### 2.6 Langfuse Observability *(Optional)*
1. Sign up at [Langfuse](https://cloud.langfuse.com/).
2. Create a new project and configure `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_HOST`.

---

## 3. Operational Presets

### Development Preset (`.env`)
```bash
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TEMPERATURE=0.7
DEBUG=True
PORT=8000
```

### Production High-Throughput Preset (`.env`)
```bash
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_TEMPERATURE=0.2
DEBUG=False
PORT=8000
```

---

## 4. Troubleshooting Configuration Issues

| Symptom | Probable Cause | Resolution |
| :--- | :--- | :--- |
| **`PineconeApiException: 400 Bad Request (metadata size limit)`** | Raw page text exceeded 40 KB metadata limit. | AutoFlow's `split_page_into_parts()` automatically prevents this. Verify `services/rag_service.py` is up to date. |
| **`401 Unauthorized` on `/api/documents/*`** | Missing or expired Supabase JWT token. | Verify `SUPABASE_JWT_SECRET` matches your Supabase Project Settings. |
| **Tool calls returning empty web results** | Tavily search quota exhausted or invalid key. | Check `TAVILY_API_KEY` validity at `tavily.com`. |
| **`temperature will be ignored` warning** | Gemini 2.5 fixed sampling parameter. | Safe to ignore; AutoFlow automatically filters this warning in `main.py`. |

---

## 5. Next Steps & Related Documentation
* 🏛️ **[System Architecture](architecture.md)**: High-level overview and subsystem breakdown.
* 🔄 **[Agents Flow & Reasoning](agents-flow.md)**: State graph logic and validator mechanics.
* 📡 **[Full API Reference](apis.md)**: Endpoints, SSE streaming contracts, and schemas.
* 💾 **[Database Architecture](database.md)**: PostgreSQL schemas, tables, and Supabase RLS.
* 🌲 **[Vector DB & Hybrid RAG](vectordb.md)**: Pinecone indexing, BM25, and chunking algorithms.
