import io
import re
import json
import base64
from datetime import datetime
from typing import Optional, Union, List, Dict, Any

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
from langchain_core.tools import tool

from db.export_repository import ExportRepository


def sanitize_filename(name: str) -> str:
    """Sanitize title into a safe filename."""
    clean = re.sub(r'[^\w\-_.]', '_', name.strip().lower())
    clean = re.sub(r'_+', '_', clean).strip('_')
    return clean[:50] or "export"


def set_cell_background(cell, hex_color: str):
    """Set the background color of a Word table cell."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set cell internal padding in twips (1/20 of a pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def add_formatted_text_to_paragraph(paragraph, text: str, default_font_size: Pt = Pt(10.5), default_color: RGBColor = RGBColor(0x1E, 0x29, 0x3B)):
    """Parses basic inline Markdown (**bold**, *italic*, `code`) and adds styled runs to paragraph."""
    # Pattern to match bold, italic, or code
    pattern = re.compile(r'(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)')
    tokens = pattern.split(text)

    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**') and len(token) >= 4:
            run = paragraph.add_run(token[2:-2])
            run.bold = True
            run.font.size = default_font_size
            run.font.color.rgb = default_color
        elif token.startswith('*') and token.endswith('*') and len(token) >= 2:
            run = paragraph.add_run(token[1:-1])
            run.italic = True
            run.font.size = default_font_size
            run.font.color.rgb = default_color
        elif token.startswith('`') and token.endswith('`') and len(token) >= 2:
            run = paragraph.add_run(token[1:-1])
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(0x0D, 0x32, 0x73)
        else:
            run = paragraph.add_run(token)
            run.font.size = default_font_size
            run.font.color.rgb = default_color


def build_docx_table(doc: docx.Document, headers: List[str], rows: List[List[Any]]):
    """Inserts a styled, professional Word table with navy headers and alternating rows."""
    if not headers and not rows:
        return

    col_count = len(headers) if headers else max(len(r) for r in rows)
    row_count = len(rows) + (1 if headers else 0)

    table = doc.add_table(rows=row_count, cols=col_count)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    # Style header row if present
    start_row = 0
    if headers:
        hdr_cells = table.rows[0].cells
        for col_idx, h_text in enumerate(headers):
            cell = hdr_cells[col_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_background(cell, "0D3273")
            set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = p.add_run(str(h_text).strip())
            run.bold = True
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        start_row = 1

    # Style data rows
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + start_row].cells
        is_even = (r_idx % 2 == 1)
        bg_hex = "F8FAFC" if is_even else "FFFFFF"

        for c_idx in range(col_count):
            cell = row_cells[c_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_background(cell, bg_hex)
            set_cell_margins(cell, top=100, bottom=100, left=180, right=180)
            p = cell.paragraphs[0]
            val = str(row_data[c_idx]).strip() if c_idx < len(row_data) else ""
            add_formatted_text_to_paragraph(p, val, default_font_size=Pt(9.5))

    doc.add_paragraph()  # Spacing after table


def parse_markdown_to_docx(doc: docx.Document, content: str, title: str, tables_data: Optional[List[Dict[str, Any]]] = None):
    """Parses clean markdown document into styled DOCX paragraphs, headings, bullet lists, and tables."""
    # Document Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(6)
    title_run = title_p.add_run(title)
    title_run.bold = True
    title_run.font.size = Pt(20)
    title_run.font.color.rgb = RGBColor(0x0D, 0x32, 0x73)

    # Date / subtitle divider line
    now_str = datetime.now().strftime("%B %d, %Y | %I:%M %p")
    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.space_before = Pt(0)
    meta_p.paragraph_format.space_after = Pt(14)
    meta_run = meta_p.add_run(now_str)
    meta_run.font.size = Pt(9)
    meta_run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # If explicit structured tables were passed via tables_data
    if tables_data:
        for t_info in tables_data:
            t_title = t_info.get("title", "Data Table")
            t_p = doc.add_paragraph()
            t_p.paragraph_format.space_before = Pt(10)
            t_p.paragraph_format.space_after = Pt(4)
            trun = t_p.add_run(t_title)
            trun.bold = True
            trun.font.size = Pt(13)
            trun.font.color.rgb = RGBColor(0x0D, 0x32, 0x73)
            build_docx_table(doc, t_info.get("headers", []), t_info.get("rows", []))

    # Parse markdown lines
    lines = content.split('\n')
    idx = 0
    in_code_block = False
    code_block_lines = []

    while idx < len(lines):
        line = lines[idx]
        stripped = line.strip()

        # Code block handler
        if stripped.startswith("```"):
            if in_code_block:
                # Flush code block
                in_code_block = False
                code_text = "\n".join(code_block_lines)
                code_p = doc.add_paragraph()
                code_p.paragraph_format.left_indent = Inches(0.2)
                code_p.paragraph_format.space_before = Pt(4)
                code_p.paragraph_format.space_after = Pt(6)
                c_run = code_p.add_run(code_text)
                c_run.font.name = 'Consolas'
                c_run.font.size = Pt(9.5)
                c_run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
                code_block_lines = []
            else:
                in_code_block = True
                code_block_lines = []
            idx += 1
            continue

        if in_code_block:
            code_block_lines.append(line)
            idx += 1
            continue

        # Empty line
        if not stripped:
            idx += 1
            continue

        # Markdown Table Detection (| Header 1 | Header 2 |)
        if stripped.startswith("|") and stripped.endswith("|") and "|" in stripped[1:-1]:
            table_lines = []
            while idx < len(lines) and lines[idx].strip().startswith("|") and lines[idx].strip().endswith("|"):
                table_lines.append(lines[idx].strip())
                idx += 1

            if len(table_lines) >= 2:
                # Parse markdown table
                raw_headers = [c.strip() for c in table_lines[0].strip('|').split('|')]
                # Skip separator line (|---|---|)
                sep_idx = 1
                if sep_idx < len(table_lines) and re.match(r'^\|?(\s*:?-+:?\s*\|)+\s*$', table_lines[sep_idx]):
                    row_lines = table_lines[2:]
                else:
                    row_lines = table_lines[1:]

                parsed_rows = []
                for rl in row_lines:
                    cols = [c.strip() for c in rl.strip('|').split('|')]
                    parsed_rows.append(cols)

                build_docx_table(doc, raw_headers, parsed_rows)
            continue

        # Headings
        if stripped.startswith("### "):
            h = doc.add_paragraph()
            h.paragraph_format.space_before = Pt(10)
            h.paragraph_format.space_after = Pt(3)
            hrun = h.add_run(stripped[4:])
            hrun.bold = True
            hrun.font.size = Pt(12)
            hrun.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
            idx += 1
            continue

        if stripped.startswith("## "):
            h = doc.add_paragraph()
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(4)
            hrun = h.add_run(stripped[3:])
            hrun.bold = True
            hrun.font.size = Pt(14)
            hrun.font.color.rgb = RGBColor(0x0D, 0x32, 0x73)
            idx += 1
            continue

        if stripped.startswith("# "):
            h = doc.add_paragraph()
            h.paragraph_format.space_before = Pt(16)
            h.paragraph_format.space_after = Pt(6)
            hrun = h.add_run(stripped[2:])
            hrun.bold = True
            hrun.font.size = Pt(16)
            hrun.font.color.rgb = RGBColor(0x0D, 0x32, 0x73)
            idx += 1
            continue

        # Bullet List Items (- or * )
        if stripped.startswith("- ") or stripped.startswith("* "):
            bp = doc.add_paragraph(style='List Bullet')
            bp.paragraph_format.space_before = Pt(1)
            bp.paragraph_format.space_after = Pt(2)
            add_formatted_text_to_paragraph(bp, stripped[2:])
            idx += 1
            continue

        # Numbered List Items (1. , 2. )
        num_match = re.match(r'^\d+\.\s+(.*)$', stripped)
        if num_match:
            np_item = doc.add_paragraph(style='List Number')
            np_item.paragraph_format.space_before = Pt(1)
            np_item.paragraph_format.space_after = Pt(2)
            add_formatted_text_to_paragraph(np_item, num_match.group(1))
            idx += 1
            continue

        # Blockquote (> text)
        if stripped.startswith("> "):
            bq = doc.add_paragraph()
            bq.paragraph_format.left_indent = Inches(0.25)
            bq.paragraph_format.space_before = Pt(3)
            bq.paragraph_format.space_after = Pt(3)
            add_formatted_text_to_paragraph(bq, stripped[2:], default_color=RGBColor(0x47, 0x55, 0x69))
            idx += 1
            continue

        # Horizontal Rule (--- or ***)
        if stripped in ("---", "***", "___"):
            hr_p = doc.add_paragraph()
            hr_p.paragraph_format.space_before = Pt(6)
            hr_p.paragraph_format.space_after = Pt(6)
            hr_run = hr_p.add_run("―" * 50)
            hr_run.font.size = Pt(8)
            hr_run.font.color.rgb = RGBColor(0xCB, 0xD5, 0xE1)
            idx += 1
            continue

        # Standard Paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        add_formatted_text_to_paragraph(p, stripped)
        idx += 1


def create_docx_export(
    content: str,
    title: str = "Document Export",
    tables_json: Optional[Union[str, List[Dict[str, Any]], Dict[str, Any], Any]] = None,
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """In-memory generation of Microsoft Word (.docx) export stored as Base64 in database without watermarks."""
    # Parse tables_json if provided
    parsed_tables = None
    if tables_json:
        if isinstance(tables_json, str):
            try:
                parsed_tables = json.loads(tables_json)
            except Exception:
                parsed_tables = None
        elif isinstance(tables_json, list):
            parsed_tables = tables_json
        elif isinstance(tables_json, dict):
            parsed_tables = [tables_json]

    # Initialize Document
    doc = docx.Document()

    # Set 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Build Content
    parse_markdown_to_docx(doc, content, title, parsed_tables)

    # Save to in-memory bytes
    buf = io.BytesIO()
    doc.save(buf)
    file_bytes = buf.getvalue()

    safe_title = sanitize_filename(title)
    timestamp_suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_title}_{timestamp_suffix}.docx"
    b64_content = base64.b64encode(file_bytes).decode("utf-8")

    record = ExportRepository.save_export(
        title=title,
        filename=filename,
        file_type="docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        content_base64=b64_content,
        size_bytes=len(file_bytes),
        conversation_id=conversation_id,
    )
    return record


@tool
def export_chat_docx(
    content: str,
    title: str = "Document Export",
    tables_json: Optional[Union[str, List[Dict[str, Any]], Dict[str, Any], Any]] = None,
    conversation_id: Optional[str] = None
) -> str:
    """Export conversation content, analysis, or structured tables into a clean, professional Microsoft Word (.docx) document.
    Use ONLY when the user explicitly requests to export, generate, or download content as a Word document or DOCX file (e.g. 'export as docx', 'download word document').
    Word formatting standards enforced: Structured headings, bullet and numbered lists, inline formatting, and styled tables.

    Args:
        content: The text content, markdown, or chat transcript to export.
        title: The title of the Word document (e.g. 'Resume Tailored for Apple').
        tables_json: Optional JSON string or list of structured tables [{'title': '...', 'headers': [...], 'rows': [[...]]}].
        conversation_id: Optional UUID of the conversation thread.
    """
    try:
        record = create_docx_export(
            content=content,
            title=title,
            tables_json=tables_json,
            conversation_id=conversation_id
        )
        export_id = record["id"]
        filename = record["filename"]
        size_kb = round(record["size_bytes"] / 1024, 2)
        download_url = f"/api/exports/download/{export_id}"

        return (
            f"### Document Exported Successfully (Word DOCX)\n\n"
            f"- **Title**: {title}\n"
            f"- **Filename**: `{filename}`\n"
            f"- **File Size**: {size_kb} KB\n"
            f"- **Format**: Microsoft Word Document (`.docx`)\n\n"
            f"[Download Word Document]({download_url})"
        )
    except Exception as e:
        return f"Failed to export DOCX: {str(e)}"

