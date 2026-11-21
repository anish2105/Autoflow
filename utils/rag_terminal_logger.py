"""
Terminal Logger for Hybrid RAG Pipeline, Ingestion, Agent Reasoning, and Validator Loops.
Provides high-visibility ANSI-formatted terminal inspection for:
- Document chunking & embedding ingestion into Pinecone / local store
- Dense Vector (Semantic) Search chunks
- BM25 Sparse (Keyword) Search chunks
- Reciprocal Rank Fusion (RRF) overlap analysis
- Cross-Encoder Reranker final top chunks
- Multi-iteration Agent decision and Completeness Validator gates
"""

import sys
import shutil
from typing import List, Dict, Any, Optional

# Reconfigure stdout/stderr on Windows for full UTF-8 / emoji support
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass


def safe_print(*args, **kwargs):
    """Safely print UTF-8 / ANSI strings with graceful fallback if terminal encoding fails."""
    kwargs.setdefault("flush", True)
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        safe_args = [
            arg.encode("ascii", "replace").decode("ascii") if isinstance(arg, str) else arg
            for arg in args
        ]
        print(*safe_args, **kwargs)


# ANSI Escape Sequences
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
UNDERLINE = "\033[4m"

# Foreground Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
RED = "\033[91m"
WHITE = "\033[97m"
ORANGE = "\033[38;5;208m"


def _clean_preview(text: str, max_chars: int = 140) -> str:
    """Cleans up whitespace and returns a compact 1-line snippet."""
    if not text:
        return "(empty chunk)"
    single_line = " ".join(text.split())
    if len(single_line) > max_chars:
        return single_line[:max_chars] + "..."
    return single_line


class RAGTerminalLogger:
    """Formatted terminal output for inspecting the hybrid RAG retrieval and multi-agent reasoning flow."""

    @staticmethod
    def print_banner(title: str, subtitle: Optional[str] = None, color: str = CYAN):
        """Prints a prominent visual section banner."""
        width = min(shutil.get_terminal_size((80, 20)).columns, 100)
        border = "═" * (width - 4)
        safe_print(f"\n{color}{BOLD}╔{border}╗{RESET}")
        safe_print(f"{color}{BOLD}║  {title.ljust(width - 6)}  ║{RESET}")
        if subtitle:
            safe_print(f"{color}{DIM}║  {subtitle.ljust(width - 6)}  ║{RESET}")
        safe_print(f"{color}{BOLD}╚{border}╝{RESET}")

    @classmethod
    def log_ingestion_start(
        cls,
        file_id: str,
        file_name: str,
        pages_count: int,
        chunks_count: int,
        model_name: str,
        dim: int,
        oversized_split_count: int = 0,
    ):
        """Logs the start of document ingestion, chunking, and embedding."""
        cls.print_banner(
            f"📄 [DOCUMENT INGESTION & VECTOR INDEXING] -> '{file_name}'",
            f"File ID: {file_id} | Total Pages: {pages_count} | Chunks Created: {chunks_count}",
            color=GREEN,
        )
        split_note = f" ({oversized_split_count} oversized page(s) cleanly split into sub-parts <= 32 KB)" if oversized_split_count > 0 else " (1 chunk per page)"
        safe_print(f"{GREEN}├── 🧩 Chunking Strategy:{RESET} Auto-Splitting (> 32 KB -> parts){split_note}")
        safe_print(f"{GREEN}├── 🤖 Embedding Model:{RESET} `{model_name}` (Dimension: {dim})")
        safe_print(f"{GREEN}├── 💾 Target Store:{RESET} Pinecone Cloud Index (100% Cloud - No In-Memory Vector Store)")
        safe_print(f"{GREEN}├── 🧠 Generating Dense Embeddings (with automatic 429 quota backoff & retry):{RESET}")

    @classmethod
    def log_ingestion_progress(
        cls,
        current_chunk: int,
        total_chunks: int,
        page_num: int,
        part_num: int,
        total_parts: int,
        char_len: int,
        dim: int,
    ):
        """Logs real-time progress for each embedded page chunk."""
        part_str = f" [Part {part_num}/{total_parts}]" if total_parts > 1 else ""
        safe_print(
            f"{DIM}│   [{current_chunk:02d}/{total_chunks:02d}]{RESET} "
            f"Page {YELLOW}{str(page_num).rjust(2)}{part_str}{RESET} "
            f"({char_len:,} chars) -> {GREEN}Embedding generated (dim: {dim}) ✅{RESET}"
        )

    @classmethod
    def log_rate_limit_pause(
        cls,
        wait_seconds: float,
        attempt: int,
        max_attempts: int,
        current_chunk: int,
        total_chunks: int,
        page_num: int,
    ):
        """Logs when Google Gemini API 30,000 TPM quota is reached and pauses gracefully."""
        safe_print(
            f"{YELLOW}│   ⏳ [RATE-LIMIT PAUSE] Google Gemini Free-Tier Quota Reached (30,000 TPM limit).{RESET}\n"
            f"{YELLOW}│      Chunk [{current_chunk}/{total_chunks}] (Page {page_num}) - Sleeping {wait_seconds:.1f}s to replenish quota (Attempt {attempt}/{max_attempts})...{RESET}"
        )

    @classmethod
    def log_pinecone_batch_upsert(
        cls,
        batch_num: int,
        total_batches: int,
        vector_count: int,
        id_start: str,
        id_end: str,
    ):
        """Logs each batch upserted into Pinecone Cloud."""
        safe_print(
            f"{BLUE}│   🚀 Pinecone Upsert Batch [{batch_num}/{total_batches}]:{RESET} "
            f"{vector_count} vectors (`{id_start}` ... `{id_end}`) -> {GREEN}Upserted ✅{RESET}"
        )

    @classmethod
    def log_ingestion_verification(
        cls,
        file_id: str,
        file_name: str,
        total_pages: int,
        total_chunks: int,
        valid_embeddings: int,
        index_name: str,
        pinecone_total_vectors: int,
        verified_doc_vectors: int,
        oversized_split_count: int = 0,
    ):
        """Prints a comprehensive verification summary after upserting all document chunks into Pinecone."""
        cls.print_banner(
            f"✅ [PINECONE CLOUD INDEX VERIFICATION & STATS] -> '{file_name}'",
            f"File ID: {file_id}",
            color=GREEN,
        )
        safe_print(f"{GREEN}├── 📄 Document Name:{RESET} {BOLD}{file_name}{RESET}")
        safe_print(f"{GREEN}├── 🆔 Document ID:{RESET}   `{file_id}`")
        safe_print(f"{GREEN}├── 📖 Total Parsed Pages:{RESET} {total_pages} page(s)")
        split_detail = f" ({oversized_split_count} oversized page(s) cleanly split into sub-parts <= 32 KB)" if oversized_split_count > 0 else " (1:1 page chunks)"
        safe_print(f"{GREEN}├── 🧩 Chunks/Parts Created:{RESET} {total_chunks}{split_detail}")
        embed_status = f"{GREEN}100% Valid ({valid_embeddings}/{total_chunks}){RESET}" if valid_embeddings == total_chunks else f"{RED}{valid_embeddings}/{total_chunks} valid{RESET}"
        safe_print(f"{GREEN}├── 🧠 Dense Embeddings (dim: 1536):{RESET} {embed_status}")
        safe_print(f"{GREEN}├── ☁️ Pinecone Cloud Index:{RESET} `{index_name}`")
        safe_print(f"{GREEN}├── 📊 Pinecone Total Index Records:{RESET} {pinecone_total_vectors} vector(s)")
        safe_print(f"{GREEN}├── 🎯 Verified Document Vectors in Pinecone:{RESET} {BOLD}{verified_doc_vectors}{RESET} vector(s)")
        if verified_doc_vectors >= total_chunks:
            safe_print(f"{GREEN}└── 🛡️ Verification Status:{RESET} {BOLD}{GREEN}ALL {total_chunks} CHUNK(S) FULLY INGESTED & SEARCHABLE IN PINECONE!{RESET}\n")
        else:
            safe_print(f"{YELLOW}└── ⚠️ Verification Warning:{RESET} Expected {total_chunks} vectors, verified {verified_doc_vectors} in Pinecone.\n")

    @classmethod
    def log_document_ingestion(
        cls,
        file_id: str,
        file_name: str,
        pages_count: int,
        chunks_count: int,
        dim: int,
        model_name: str,
        is_pinecone: bool,
        page_previews: Optional[List[Dict[str, Any]]] = None,
    ):
        """Logs document parsing, chunking, and vector indexing."""
        cls.print_banner(
            f"📄 [DOCUMENT INGESTION & VECTOR INDEXING] -> '{file_name}'",
            f"File ID: {file_id} | Total Pages: {pages_count} | Chunks Created: {chunks_count}",
            color=GREEN,
        )
        split_note = f" ({chunks_count - pages_count} oversized page(s) cleanly split into sub-parts to prevent data loss)" if chunks_count > pages_count else ""
        safe_print(f"{GREEN}├── 🧩 Chunking Strategy:{RESET} 1 Chunk per Page with Auto-Splitting (> 32 KB -> parts){split_note}")
        safe_print(f"{GREEN}├── 🤖 Embedding Model:{RESET} `{model_name}` (Dimension: {dim})")
        safe_print(f"{GREEN}├── 💾 Target Store:{RESET} Pinecone Cloud Index (100% Cloud - No In-Memory Vector Store)")

        if page_previews:
            sample_count = min(len(page_previews), 5)
            safe_print(f"{GREEN}├── 📖 Page Chunks Preview (Showing first {sample_count} of {len(page_previews)}):{RESET}")
            for idx, p in enumerate(page_previews[:sample_count], start=1):
                p_num = p.get("page_number", idx)
                txt = _clean_preview(p.get("text", "") or p.get("markdown", "") or "", max_chars=110)
                char_len = len(p.get("text", "") or p.get("markdown", "") or "")
                safe_print(f"{DIM}│   [{idx:02d}] Page {p_num:02d} ({char_len} chars) -> {RESET}{txt}")
            if len(page_previews) > sample_count:
                safe_print(f"{DIM}│   ... and {len(page_previews) - sample_count} more page chunk(s) indexed.{RESET}")
        safe_print(f"{GREEN}└── ✅ Ingestion Complete:{RESET} All {chunks_count} page chunk(s) ready for Hybrid Search!\n")

    @classmethod
    def log_retrieval_start(
        cls,
        query: str,
        selected_file_ids: List[str],
        iteration: int = 1,
    ):
        """Logs when retrieve_document_context is triggered by the Decision Agent."""
        cls.print_banner(
            f"🔍 [HYBRID RAG RETRIEVAL] ITERATION #{iteration}",
            f"Agent Query: \"{query}\"",
            color=CYAN,
        )
        safe_print(f"{CYAN}├── 📂 Target Document Scope ({len(selected_file_ids)} file(s)):{RESET} {selected_file_ids}")
        safe_print(f"{CYAN}├── ⚙️ Search Mode:{RESET} Hybrid (Dense Semantic Vector + Sparse BM25 Keyword) -> RRF Fusion -> Cross-Encoder")

    @classmethod
    def log_dense_results(
        cls,
        dense_results: List[Dict[str, Any]],
        is_pinecone: bool = True,
        top_k: int = 8,
    ):
        """Logs top Dense Vector similarity results from Pinecone Cloud Index."""
        safe_print(f"\n{BLUE}{BOLD}├── 🧠 1. DENSE VECTOR RETRIEVAL (Pinecone Cloud Index - 100% Cloud){RESET}")
        if not dense_results:
            safe_print(f"{YELLOW}│   ⚠️ No dense vector matches found in Pinecone for target file(s)!{RESET}")
            return

        safe_print(f"{BLUE}│   Retrieved {len(dense_results)} candidate chunks from Pinecone based on semantic embedding similarity:{RESET}")

        display_count = min(len(dense_results), top_k)
        for rank, item in enumerate(dense_results[:display_count], start=1):
            cid = item.get("id", "unknown")
            score = item.get("score", 0.0)
            meta = item.get("metadata", {})
            p_num = meta.get("page_number", "?")
            part_num = meta.get("part_number")
            tot_parts = meta.get("total_parts", 1)
            part_str = f" [Part {part_num}/{tot_parts}]" if tot_parts and tot_parts > 1 else ""
            fname = meta.get("file_name", "doc")
            preview = _clean_preview(meta.get("text", ""), max_chars=120)

            safe_print(
                f"{BLUE}│   {BOLD}#{rank:02d}{RESET} | Score: {GREEN}{score:.4f}{RESET} | "
                f"Page: {YELLOW}{str(p_num).rjust(2)}{part_str}{RESET} | File: {CYAN}{fname}{RESET} | ID: `{cid}`"
            )
            safe_print(f"{DIM}│        Snippet: \"{preview}\"{RESET}")

        if len(dense_results) > display_count:
            safe_print(f"{DIM}│   ... and {len(dense_results) - display_count} more dense candidates passed to RRF.{RESET}")

    @classmethod
    def log_bm25_results(
        cls,
        bm25_results: List[Dict[str, Any]],
        tokens: List[str],
        corpus_size: int,
        top_k: int = 8,
    ):
        """Logs top BM25 sparse keyword results."""
        token_str = ", ".join([f"'{t}'" for t in tokens[:8]]) + (", ..." if len(tokens) > 8 else "")
        safe_print(f"\n{ORANGE}{BOLD}├── 🔤 2. BM25 SPARSE KEYWORD RETRIEVAL (Lexical Matching){RESET}")
        safe_print(f"{ORANGE}│   Query Tokens ({len(tokens)}): [{token_str}] across {corpus_size} scoped chunks:{RESET}")

        if not bm25_results:
            safe_print(f"{DIM}│   (No keyword matches with positive BM25 score; fallback relying on Dense Semantic){RESET}")
            return

        display_count = min(len(bm25_results), top_k)
        for rank, item in enumerate(bm25_results[:display_count], start=1):
            cid = item.get("id", "unknown")
            score = item.get("score", 0.0)
            meta = item.get("metadata", {})
            p_num = meta.get("page_number", "?")
            fname = meta.get("file_name", "doc")
            preview = _clean_preview(meta.get("text", ""), max_chars=120)

            safe_print(
                f"{ORANGE}│   {BOLD}#{rank:02d}{RESET} | BM25 Score: {GREEN}{score:.2f}{RESET} | "
                f"Page: {YELLOW}{str(p_num).rjust(2)}{RESET} | File: {CYAN}{fname}{RESET} | ID: `{cid}`"
            )
            safe_print(f"{DIM}│        Snippet: \"{preview}\"{RESET}")

        if len(bm25_results) > display_count:
            safe_print(f"{DIM}│   ... and {len(bm25_results) - display_count} more keyword candidates passed to RRF.{RESET}")

    @classmethod
    def log_rrf_fusion(
        cls,
        fused_candidates: List[Dict[str, Any]],
        dense_results: List[Dict[str, Any]],
        bm25_results: List[Dict[str, Any]],
        k: int = 60,
        top_n: int = 10,
    ):
        """Logs Reciprocal Rank Fusion combining Dense and BM25 candidates."""
        # Create rank lookup
        dense_ranks = {item["id"]: idx for idx, item in enumerate(dense_results, start=1)}
        bm25_ranks = {item["id"]: idx for idx, item in enumerate(bm25_results, start=1)}

        overlap_count = sum(1 for cid in dense_ranks if cid in bm25_ranks)
        safe_print(f"\n{MAGENTA}{BOLD}├── ⚡ 3. RECIPROCAL RANK FUSION (RRF k={k}){RESET}")
        safe_print(
            f"{MAGENTA}│   Merged into {len(fused_candidates)} unique candidates "
            f"({overlap_count} overlapping chunk(s) boosted by both Vector + Keyword):{RESET}"
        )

        display_count = min(len(fused_candidates), top_n)
        for rank, item in enumerate(fused_candidates[:display_count], start=1):
            cid = item.get("id", "unknown")
            rrf_score = item.get("rrf_score", 0.0)
            meta = item.get("metadata", {})
            p_num = meta.get("page_number", "?")
            part_num = meta.get("part_number")
            tot_parts = meta.get("total_parts", 1)
            part_str = f" [Part {part_num}/{tot_parts}]" if tot_parts and tot_parts > 1 else ""
            fname = meta.get("file_name", "doc")
            preview = _clean_preview(meta.get("text", ""), max_chars=110)

            dense_r = dense_ranks.get(cid)
            bm25_r = bm25_ranks.get(cid)

            if dense_r and bm25_r:
                match_badge = f"{GREEN}{BOLD}🌟 DENSE #{dense_r} + BM25 #{bm25_r} (BOOSTED){RESET}"
            elif dense_r:
                match_badge = f"{BLUE}🧠 Dense Only #{dense_r}{RESET}"
            else:
                match_badge = f"{ORANGE}🔤 BM25 Only #{bm25_r}{RESET}"

            safe_print(
                f"{MAGENTA}│   {BOLD}#{rank:02d}{RESET} | RRF: {GREEN}{rrf_score:.5f}{RESET} | "
                f"Page: {YELLOW}{str(p_num).rjust(2)}{part_str}{RESET} | {match_badge} | File: {fname}"
            )
            safe_print(f"{DIM}│        Snippet: \"{preview}\"{RESET}")

    @classmethod
    def log_rerank_results(
        cls,
        reranked_chunks: List[Dict[str, Any]],
        top_n: int = 10,
    ):
        """Logs the Cross-Encoder re-ranked Top 10 chunks fed to the synthesizer."""
        safe_print(f"\n{GREEN}{BOLD}├── 🎯 4. CROSS-ENCODER RERANKER (Final Grounded Evidence){RESET}")
        safe_print(f"{GREEN}│   Selected Top {len(reranked_chunks)} most relevant chunk(s) passed to Decision Agent:{RESET}")

        total_chars = 0
        for rank, item in enumerate(reranked_chunks[:top_n], start=1):
            meta = item.get("metadata", {})
            p_num = meta.get("page_number", 1)
            part_num = meta.get("part_number")
            tot_parts = meta.get("total_parts", 1)
            part_str = f" [Part {part_num}/{tot_parts}]" if tot_parts and tot_parts > 1 else ""
            fname = meta.get("file_name", "Document")
            cid = item.get("id", "")
            text = meta.get("text", "")
            total_chars += len(text)
            preview = _clean_preview(text, max_chars=120)

            safe_print(
                f"{GREEN}│   {BOLD}Evidence [{rank}]{RESET} -> Document: `{fname}` | {YELLOW}Page {p_num}{part_str}{RESET} "
                f"(ID: `{cid}`) | Length: {len(text)} chars"
            )
            safe_print(f"{DIM}│               Excerpt: \"{preview}\"{RESET}")

        safe_print(
            f"{GREEN}└── 📦 Total Grounded Evidence Delivered:{RESET} {len(reranked_chunks)} chunks "
            f"({total_chars} total characters)\n"
        )

    @classmethod
    def log_agent_turn(
        cls,
        iteration: int,
        research_goal: str,
        is_followup: bool = False,
        missing_parts: Optional[List[str]] = None,
        critique: Optional[str] = None,
    ):
        """Logs Agent decision node start and prior validator feedback."""
        if is_followup:
            cls.print_banner(
                f"🤖 [AUTONOMOUS AGENT] RE-DISPATCHED (Iteration #{iteration})",
                f"Previous completeness < 80% -> Gathering missing evidence for: \"{research_goal}\"",
                color=YELLOW,
            )
            if missing_parts:
                safe_print(f"{YELLOW}├── ⚠️ Missing Information from Prior Evaluation:{RESET}")
                for part in missing_parts:
                    safe_print(f"{YELLOW}│   * {part}{RESET}")
            if critique:
                safe_print(f"{YELLOW}├── 💡 Validator Guidance:{RESET} {critique}")
            safe_print(f"{YELLOW}└── 🔄 Agent Action:{RESET} Formulating targeted follow-up tool queries...\n")
        else:
            cls.print_banner(
                f"🤖 [AUTONOMOUS AGENT DECISION NODE] (Iteration #{iteration})",
                f"User Query: \"{research_goal}\"",
                color=CYAN,
            )

    @classmethod
    def log_agent_actions(
        cls,
        tool_calls: List[Dict[str, Any]],
        direct_response_preview: Optional[str] = None,
        elapsed_ms: float = 0.0,
    ):
        """Logs what the agent decided to execute."""
        if tool_calls:
            safe_print(f"{CYAN}├── 🛠️ Agent Requested {len(tool_calls)} Tool Call(s) (in {elapsed_ms}ms):{RESET}")
            for idx, tc in enumerate(tool_calls, start=1):
                tname = tc.get("name", "unknown")
                targs = tc.get("args", {})
                safe_print(f"{CYAN}│   [{idx}] Tool: {BOLD}{tname}{RESET} | Arguments: {targs}")
            safe_print(f"{CYAN}└── ⚡ Dispatching parallel tool executions concurrently...{RESET}\n")
        else:
            safe_print(f"{GREEN}├── ✍️ Agent Synthesized Direct Response (in {elapsed_ms}ms):{RESET}")
            if direct_response_preview:
                safe_print(f"{DIM}│   Snippet: \"{_clean_preview(direct_response_preview, 160)}\"{RESET}")
            safe_print(f"{GREEN}└── ➡️ Forwarding output to Completeness Validator Gate...{RESET}\n")

    @classmethod
    def log_validator_evaluation(
        cls,
        iteration: int,
        completeness_score: float,
        is_sufficient: bool,
        missing_info: List[str],
        critique: str,
        elapsed_ms: float = 0.0,
    ):
        """Logs Completeness Validator evaluation results."""
        if is_sufficient:
            cls.print_banner(
                f"🛡️ [COMPLETENESS VALIDATOR GATE] ✅ SUFFICIENT (Iteration #{iteration})",
                f"Completeness Score: {completeness_score:.1f}% (Threshold >= 80%) | Took {elapsed_ms}ms",
                color=GREEN,
            )
            safe_print(f"{GREEN}├── 🎯 Verdict:{RESET} Task requirements satisfied! Score {completeness_score:.1f}% >= 80%.")
            safe_print(f"{GREEN}├── 💬 Critique:{RESET} {critique}")
            safe_print(f"{GREEN}└── 🏁 Terminal Action:{RESET} Delivered finalized response to user.")
        else:
            cls.print_banner(
                f"🛡️ [COMPLETENESS VALIDATOR GATE] ⚠️ INSUFFICIENT (Iteration #{iteration})",
                f"Completeness Score: {completeness_score:.1f}% (< 80% Threshold) | Took {elapsed_ms}ms",
                color=RED,
            )
            safe_print(f"{RED}├── ⚠️ Verdict:{RESET} Key requirements or comparisons remain unaddressed (Score: {completeness_score:.1f}% < 80%).")
            safe_print(f"{RED}├── 🔍 Missing Information Identified:{RESET}")
            for idx, item in enumerate(missing_info, start=1):
                safe_print(f"{RED}│   [{idx}] {item}{RESET}")
            safe_print(f"{RED}├── 💬 Critique:{RESET} {critique}")
            safe_print(f"{RED}└── 🔄 Loop Triggered:{RESET} Re-routing to Agent (Iteration #{iteration + 1}) to retrieve remaining chunks & answer!")
        safe_print()

    @classmethod
    def log_agent_builder_canvas_code(
        cls,
        workflow_name: str,
        node_count: int,
        edge_count: int,
        mermaid_code: str,
    ):
        """Logs the reactive Mermaid pipeline code generated when tools are dragged on the canvas."""
        cls.print_banner(
            f"🎨 [AGENT BUILDER CANVAS PIPELINE CODE] -> '{workflow_name}'",
            f"Active Canvas: {node_count} node(s) • {edge_count} edge(s)",
            color=MAGENTA,
        )
        safe_print(f"{MAGENTA}├── 📐 Live Generated Mermaid Pipeline Code:{RESET}")
        for line in (mermaid_code or "").strip().split("\n"):
            safe_print(f"{DIM}│   {line}{RESET}")
        safe_print(f"{MAGENTA}└── ⚡ Pipeline code synchronized with visual canvas.{RESET}\n")

    @classmethod
    def log_workflow_pipeline_start(
        cls,
        workflow_name: str,
        user_query: str,
        selected_file_ids: List[str],
        enabled_tools: List[str],
        system_prompt_prefix: Optional[str] = None,
    ):
        """Logs the workflow execution pipeline starting with input query and scoped tools."""
        cls.print_banner(
            f"🚀 [WORKFLOW EXECUTION PIPELINE] -> '{workflow_name}'",
            f"Input ➔ Tool Dispatches ➔ Decision Agent ➔ Completeness Validator ➔ Output Delivery",
            color=BLUE,
        )
        safe_print(f"{BLUE}├── 📥 1. INPUT NODE (User Query Ingestion):{RESET}")
        safe_print(f"{BLUE}│   • Query Payload: \"{_clean_preview(user_query, 140)}\"{RESET}")
        safe_print(f"{BLUE}│   • Document Scope ({len(selected_file_ids)} file(s)): {selected_file_ids or 'None'}{RESET}")
        safe_print(f"{BLUE}│   • Enabled Tool Pipeline: {enabled_tools}{RESET}")
        if system_prompt_prefix:
            safe_print(f"{BLUE}│   • Injected Persona Prefix: \"{_clean_preview(system_prompt_prefix, 100)}\"{RESET}")
        safe_print(f"{BLUE}└── ⚡ Dispatching query into LangGraph agent graph...{RESET}\n")

    @classmethod
    def log_workflow_tool_flow(
        cls,
        tool_name: str,
        tool_input: Any,
        tool_output: Any,
        elapsed_ms: float = 0.0,
    ):
        """Logs the exact input-to-output data transformation for each tool node."""
        safe_print(f"{ORANGE}├── ⚙️ 2. TOOL NODE EXECUTION: {BOLD}{tool_name}{RESET} (in {elapsed_ms}ms)")
        safe_print(f"{ORANGE}│   • Inputs Flowing In: {tool_input}{RESET}")
        output_str = str(tool_output)
        safe_print(f"{ORANGE}│   • Outputs Flowing Out: {_clean_preview(output_str, 160)}{RESET}")
        safe_print(f"{ORANGE}└── ➡️ Passing tool evidence forward to AutoFlow Decision Agent...{RESET}\n")

    @classmethod
    def log_workflow_agent_synthesis(
        cls,
        evidence_count: int,
        response_preview: str,
        elapsed_ms: float = 0.0,
    ):
        """Logs how the agent consumed tool evidence inputs to synthesize output."""
        safe_print(f"{CYAN}├── 🤖 3. AUTOFLOW DECISION AGENT (Inputs ➔ Synthesized Output):{RESET}")
        safe_print(f"{CYAN}│   • Input Evidence Received: {evidence_count} tool result(s) + User query{RESET}")
        safe_print(f"{CYAN}│   • LLM Synthesis (in {elapsed_ms}ms): \"{_clean_preview(response_preview, 180)}\"{RESET}")
        safe_print(f"{CYAN}└── ➡️ Passing response to Task Completeness Validator Gate (80% rule)...{RESET}\n")

    @classmethod
    def log_workflow_output_delivery(
        cls,
        status: str,
        total_latency_ms: float = 0.0,
        output_preview: Optional[str] = None,
    ):
        """Logs final pipeline completion and delivery."""
        safe_print(f"{GREEN}└── 📄 5. OUTPUT DELIVERY (Workflow Pipeline Completed in {total_latency_ms}ms):{RESET}")
        if output_preview:
            safe_print(f"{GREEN}    • Final Deliverable: \"{_clean_preview(output_preview, 140)}\"{RESET}")
        safe_print(f"{GREEN}    • Status: {status.upper()}{RESET}\n")
