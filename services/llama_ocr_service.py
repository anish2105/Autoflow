import os
import base64
import tempfile
import asyncio
from typing import Tuple, List, Dict, Any, Literal
from llama_cloud import LlamaCloud
from config import settings


def parse_pdf_with_llama_cloud(
    content_base64: str,
    filename: str = "document.pdf",
    tier: str = "fast",
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Parses a Base64-encoded PDF using LlamaCloud OCR and layout extraction.

    Args:
        content_base64: Base64-encoded string of the PDF file.
        filename: Original filename (used for extension identification).
        tier: 'fast' (Default: simple, text-only documents) or
              'agentic' (for complex documents with diagrams, charts, and images).

    Returns:
        Tuple[str, List[Dict[str, Any]]]:
            - full_markdown: Full document synthesized Markdown string.
            - parsed_pages: List of page dictionaries:
                [{"page_number": 1, "markdown": "..."}, ...]
    """
    api_key = settings.LLAMA_CLOUD_API_KEY
    if not api_key:
        raise ValueError(
            "Missing LLAMA_CLOUD_API_KEY in server configuration. "
            "Please configure LLAMA_CLOUD_API_KEY in your .env file."
        )

    # Validate tier
    clean_tier = tier.lower().strip() if tier else "fast"
    if clean_tier not in ("fast", "agentic"):
        clean_tier = "fast"

    # Decode base64 data to binary bytes
    try:
        # Strip data URL prefix if present (e.g. data:application/pdf;base64,...)
        if "," in content_base64:
            content_base64 = content_base64.split(",", 1)[1]
        pdf_bytes = base64.b64decode(content_base64)
    except Exception as e:
        raise ValueError(f"Invalid Base64 encoding for PDF document: {e}")

    # Write to a secure temporary file for upload to LlamaCloud Files API
    temp_file = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    temp_path = temp_file.name
    temp_file.write(pdf_bytes)
    temp_file.close()

    try:
        # Initialize LlamaCloud client
        client = LlamaCloud(api_key=api_key)

        # 1. Upload file to LlamaCloud
        with open(temp_path, "rb") as f:
            file_obj = client.files.create(file=f, purpose="parse")

        print(f"[LlamaCloud OCR] Uploaded '{filename}' (ID: {file_obj.id}). Parsing tier: '{clean_tier}'...")

        # 2. Execute agentic or fast parsing with page-level expansion
        result = client.parsing.parse(
            file_id=file_obj.id,
            tier=clean_tier,
            version="latest",
            expand=["markdown_full", "markdown"],
        )

        full_markdown = result.markdown_full or ""

        # 3. Extract page-wise parsed markdown
        parsed_pages: List[Dict[str, Any]] = []
        if result.markdown and getattr(result.markdown, "pages", None):
            for p in result.markdown.pages:
                page_num = getattr(p, "page_number", len(parsed_pages) + 1)
                page_md = getattr(p, "markdown", "") or ""
                parsed_pages.append({
                    "page_number": page_num,
                    "markdown": page_md,
                })
        elif full_markdown:
            # Fallback if pages object is not populated: treat as page 1
            parsed_pages.append({
                "page_number": 1,
                "markdown": full_markdown,
            })

        print(f"[LlamaCloud OCR] Successfully parsed '{filename}' ({len(parsed_pages)} pages, {len(full_markdown)} chars)")
        return full_markdown, parsed_pages

    finally:
        # Clean up temporary local file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


async def parse_pdf_async(
    content_base64: str,
    filename: str = "document.pdf",
    tier: str = "fast",
) -> Tuple[str, List[Dict[str, Any]]]:
    """Asynchronous non-blocking wrapper around LlamaCloud PDF OCR parser."""
    return await asyncio.to_thread(parse_pdf_with_llama_cloud, content_base64, filename, tier)
