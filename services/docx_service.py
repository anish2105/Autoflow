import os
import re
import sys
import types
import base64
import tempfile
import asyncio
from typing import Tuple, List, Dict, Any

# Ensure magika is safely mocked on environments where native onnxruntime crashes
class MagikaOutput:
    label = "docx"
    mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    extensions = ["docx"]
    is_text = False

class MagikaPrediction:
    output = MagikaOutput()

class MagikaResult:
    status = "ok"
    prediction = MagikaPrediction()
    output = MagikaOutput()

class DummyMagika:
    def identify_stream(self, s):
        return MagikaResult()
    def identify_bytes(self, b):
        return MagikaResult()
    def identify_path(self, p):
        return MagikaResult()

m = types.ModuleType("magika")
m.Magika = DummyMagika
sys.modules["magika"] = m

from markitdown import MarkItDown
import mammoth
import markdownify


def _paginate_markdown(full_markdown: str) -> List[Dict[str, Any]]:
    """
    Splits markdown into logical, page-wise sections matching PDF viewer expectations.
    Checks for:
    1. Form feed / page breaks (\x0c, \f, <!-- pagebreak -->, or horizontal rules)
    2. Headings (# or ##) if long
    3. Logical length blocks (~400-500 words or ~2500 characters per page)
    """
    cleaned = full_markdown.strip()
    if not cleaned:
        return [{"page_number": 1, "markdown": "*(Empty Document)*"}]

    # 1. Check for explicit page break markers
    raw_pages = re.split(r'\x0c|\f|<!--\s*pagebreak\s*-->|(?:\n\s*---\s*\n(?=# ))', cleaned)
    raw_pages = [p.strip() for p in raw_pages if p.strip()]

    if len(raw_pages) > 1:
        return [
            {"page_number": idx + 1, "markdown": page_text}
            for idx, page_text in enumerate(raw_pages)
        ]

    # 2. If single chunk but long (> 2000 chars), split by major headings or paragraphs
    lines = cleaned.split("\n")
    pages: List[str] = []
    current_page_lines: List[str] = []
    current_char_count = 0
    PAGE_TARGET_CHARS = 2400

    for line in lines:
        is_h1_or_h2 = line.startswith("# ") or line.startswith("## ")
        line_len = len(line) + 1

        if (current_char_count >= PAGE_TARGET_CHARS and (is_h1_or_h2 or current_char_count >= PAGE_TARGET_CHARS * 1.5)) and current_page_lines:
            pages.append("\n".join(current_page_lines).strip())
            current_page_lines = [line]
            current_char_count = line_len
        else:
            current_page_lines.append(line)
            current_char_count += line_len

    if current_page_lines:
        pages.append("\n".join(current_page_lines).strip())

    if not pages:
        pages = [cleaned]

    return [
        {"page_number": idx + 1, "markdown": page_text}
        for idx, page_text in enumerate(pages)
    ]


def parse_docx_with_markitdown(
    content_base64: str,
    filename: str = "document.docx",
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Parses a Base64-encoded Word DOCX file using Microsoft's MarkItDown library,
    extracting markdown content and paginating it into page-wise chunks like PDF.

    Args:
        content_base64: Base64-encoded string of the DOCX file.
        filename: Original filename.

    Returns:
        Tuple[str, List[Dict[str, Any]]]:
            - full_markdown: Complete synthesized Markdown string.
            - parsed_pages: List of page dictionaries [{"page_number": 1, "markdown": "..."}, ...]
    """
    # 1. Decode Base64
    try:
        if "," in content_base64:
            content_base64 = content_base64.split(",", 1)[1]
        docx_bytes = base64.b64decode(content_base64)
    except Exception as e:
        raise ValueError(f"Invalid Base64 encoding for DOCX document: {e}")

    # 2. Write to secure temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix=".docx", delete=False)
    temp_path = temp_file.name
    temp_file.write(docx_bytes)
    temp_file.close()

    try:
        # 3. Convert using MarkItDown
        try:
            md = MarkItDown()
            print(f"[MarkItDown DOCX] Converting '{filename}'...")
            conversion_result = md.convert(temp_path)
            full_markdown = conversion_result.text_content or ""
        except Exception as md_err:
            print(f"[MarkItDown DOCX] Note: MarkItDown direct convert fallback to mammoth: {md_err}")
            with open(temp_path, "rb") as docx_file:
                html_result = mammoth.convert_to_html(docx_file).value
                full_markdown = markdownify.markdownify(html_result, heading_style="ATX")

        # 4. Paginate page-wise
        parsed_pages = _paginate_markdown(full_markdown)

        print(f"[MarkItDown DOCX] Successfully parsed '{filename}' ({len(parsed_pages)} pages, {len(full_markdown)} chars)")
        return full_markdown, parsed_pages

    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


async def parse_docx_async(
    content_base64: str,
    filename: str = "document.docx",
) -> Tuple[str, List[Dict[str, Any]]]:
    """Asynchronous non-blocking wrapper around MarkItDown DOCX parser."""
    return await asyncio.to_thread(parse_docx_with_markitdown, content_base64, filename)
