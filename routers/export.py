import base64
from typing import Optional, Literal, Dict, Any, List
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from db.export_repository import ExportRepository
from tools.txt_exporter import create_txt_export
from tools.pdf_exporter import create_pdf_export
from tools.excel_exporter import create_excel_export
from tools.docx_exporter import create_docx_export

router = APIRouter(prefix="/api/exports", tags=["Exports"])


class GenerateExportRequest(BaseModel):
    format: Literal["txt", "pdf", "xlsx", "excel", "docx", "doc"] = Field(
        ..., description="Export format: 'txt', 'pdf', 'xlsx', or 'docx'"
    )
    content: str = Field(..., description="Markdown content or chat transcript")
    title: Optional[str] = Field("Document Export", description="Title for document")
    conversation_id: Optional[str] = Field(None, description="Associated conversation UUID")
    tables_json: Optional[str] = Field(None, description="Optional structured tables JSON for PDF/DOCX")
    sheets_json: Optional[str] = Field(None, description="Optional structured sheets JSON for Excel")


@router.get("/download/{export_id}")
async def download_export(export_id: str):
    """Download an export file by decoding its in-memory Base64 representation.
    No local files are stored or read from disk.
    """
    record = ExportRepository.get_export(export_id)
    if not record or not record.get("content_base64"):
        raise HTTPException(status_code=404, detail="Export not found or expired")

    try:
        file_bytes = base64.b64decode(record["content_base64"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to decode export content: {e}")

    filename = record.get("filename", "export.dat")
    mime_type = record.get("mime_type", "application/octet-stream")

    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(file_bytes)),
            "Cache-Control": "no-cache"
        }
    )


@router.post("/generate")
async def generate_export(req: GenerateExportRequest) -> Dict[str, Any]:
    """Generate an export directly on-demand (used by UI dropdown buttons or API clients).
    Encodes file to Base64 in-memory and stores in database table without local disk storage.
    """
    fmt = req.format.lower()
    if fmt == "excel":
        fmt = "xlsx"

    try:
        if fmt == "txt":
            record = create_txt_export(
                content=req.content,
                title=req.title or "AutoFlow Chat Export",
                conversation_id=req.conversation_id
            )
        elif fmt == "pdf":
            record = create_pdf_export(
                content=req.content,
                title=req.title or "AutoFlow PDF Report",
                tables_json=req.tables_json,
                conversation_id=req.conversation_id
            )
        elif fmt == "xlsx":
            record = create_excel_export(
                content=req.content,
                title=req.title or "Excel Spreadsheet",
                sheets_json=req.sheets_json,
                conversation_id=req.conversation_id
            )
        elif fmt in ("docx", "doc"):
            record = create_docx_export(
                content=req.content,
                title=req.title or "Document Export",
                tables_json=req.tables_json,
                conversation_id=req.conversation_id
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format '{req.format}'")

        return {
            "status": "success",
            "export_id": record["id"],
            "filename": record["filename"],
            "file_type": record["file_type"],
            "size_bytes": record["size_bytes"],
            "download_url": f"/api/exports/download/{record['id']}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export generation failed: {str(e)}")


@router.get("/conversation/{conversation_id}")
async def list_conversation_exports(conversation_id: str) -> List[Dict[str, Any]]:
    """List available exports associated with a conversation."""
    return ExportRepository.get_exports_by_conversation(conversation_id)
