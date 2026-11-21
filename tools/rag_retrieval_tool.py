import asyncio
from typing import Optional, List, Dict, Any, Tuple
from langchain_core.tools import tool
from services.rag_service import RAGService

# Module-level thread/turn context for trusted file scope injection
_ACTIVE_TURN_FILE_IDS: List[str] = []
_ACTIVE_TURN_USER_ID: Optional[str] = None
_ACTIVE_TURN_RETRIEVAL_COUNT: int = 0


def set_active_turn_files(file_ids: Optional[List[str]], user_id: Optional[str] = None):
    """Sets authorized file IDs and authenticated user ID for the current request turn."""
    global _ACTIVE_TURN_FILE_IDS, _ACTIVE_TURN_USER_ID, _ACTIVE_TURN_RETRIEVAL_COUNT
    _ACTIVE_TURN_FILE_IDS = list(file_ids) if file_ids else []
    _ACTIVE_TURN_USER_ID = user_id
    _ACTIVE_TURN_RETRIEVAL_COUNT = 0


def get_active_turn_files() -> Tuple[List[str], Optional[str]]:
    """Returns the current turn's authorized file IDs and user ID."""
    return list(_ACTIVE_TURN_FILE_IDS), _ACTIVE_TURN_USER_ID


def clear_active_turn_files():
    """Resets active turn file context."""
    global _ACTIVE_TURN_FILE_IDS, _ACTIVE_TURN_USER_ID, _ACTIVE_TURN_RETRIEVAL_COUNT
    _ACTIVE_TURN_FILE_IDS = []
    _ACTIVE_TURN_USER_ID = None
    _ACTIVE_TURN_RETRIEVAL_COUNT = 0


@tool
async def retrieve_document_context(query: str) -> str:
    """Retrieve relevant paragraphs, facts, and page evidence from user-selected uploaded documents using Hybrid Search (Dense vector similarity + BM25 keyword matching + RRF fusion + Cross-Encoder reranking).
    
    Args:
        query: Specific search query or question to retrieve evidence for from the selected documents.
    """
    global _ACTIVE_TURN_RETRIEVAL_COUNT
    _ACTIVE_TURN_RETRIEVAL_COUNT += 1
    call_num = _ACTIVE_TURN_RETRIEVAL_COUNT
    selected_file_ids, user_id = get_active_turn_files()

    if not selected_file_ids:
        return (
            "NO_FILES_SELECTED: No documents are currently selected in the chat session. "
            "Instruct the user to select one or more documents from the document selector above the chat input "
            "so that relevant document evidence can be retrieved."
        )

    try:
        # Run Hybrid Search: Dense + BM25 -> RRF (Top 20) -> Cross-Encoder Reranker (Top 10)
        chunks = await RAGService.retrieve_and_rerank(
            query=query,
            selected_file_ids=selected_file_ids,
            user_id=user_id,
            top_n=10,
            iteration=call_num,
        )

        if not chunks:
            return (
                f"No relevant excerpts found in the selected documents for query: '{query}'. "
                "Inform the user that the query could not be answered with the current selected documents."
            )

        print(f"[Tool:retrieve_document_context] Retrieved {len(chunks)} grounded chunk(s).")

        formatted_evidence = [
            f"### Retrieved Document Evidence for: \"{query}\"",
            f"Found {len(chunks)} relevant excerpt(s) across selected files:\n",
        ]

        for i, chunk in enumerate(chunks, 1):
            meta = chunk.get("metadata", {})
            file_name = meta.get("file_name", "Document")
            page_num = meta.get("page_number", 1)
            chunk_id = chunk.get("id", f"chunk_{i}")
            score = chunk.get("rrf_score") or chunk.get("score") or 0.0
            text = meta.get("text", "").strip()

            formatted_evidence.append(
                f"**[Source {i}]** Document: `{file_name}` | **Page {page_num}** (ID: `{chunk_id}`, Score: {score:.4f})\n"
                f"```text\n{text}\n```\n"
            )

        formatted_evidence.append(
            "\n**Instructions for AutoFlow Synthesizer**:\n"
            "1. Ground your answer strictly on the above facts.\n"
            "2. Keep the answer clean, concise, and structured with markdown tables and bullet points.\n"
            "3. If citing pages in your text, use simple compact tags like `[p.1]`. Do not insert quote strings inside citation tags."
        )

        return "\n".join(formatted_evidence)

    except Exception as e:
        print(f"[Tool:retrieve_document_context] Error during retrieval: {e}")
        return f"Error executing document retrieval for '{query}': {str(e)}"
