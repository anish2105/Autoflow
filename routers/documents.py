import base64
import hashlib
import asyncio
from typing import Optional, Literal, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from auth import get_optional_user, check_document_quota_allowed
from db.document_repository import DocumentRepository
from db.tier_repository import TierRepository
from services.llama_ocr_service import parse_pdf_async
from services.docx_service import parse_docx_async

router = APIRouter(prefix="/api/documents", tags=["Documents"])


def normalize_doc_for_client(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures both snake_case and camelCase attributes are populated for seamless API compatibility."""
    out = dict(doc)
    out["name"] = doc.get("filename") or doc.get("name") or "Document"
    out["size"] = doc.get("size_bytes") if doc.get("size_bytes") is not None else doc.get("size", 0)
    out["type"] = doc.get("file_type") or doc.get("type") or "other"
    out["mimeType"] = doc.get("mime_type") or doc.get("mimeType") or "application/octet-stream"
    out["base64"] = doc.get("content_base64") or doc.get("base64") or ""
    out["uploadedAt"] = doc.get("created_at") or doc.get("uploadedAt") or ""
    out["parsedMarkdown"] = doc.get("parsed_markdown") or doc.get("parsedMarkdown")
    out["parsedPages"] = doc.get("parsed_pages") if doc.get("parsed_pages") is not None else doc.get("parsedPages", [])
    out["errorMessage"] = doc.get("error_message") or doc.get("errorMessage")
    return out


class UploadDocumentRequest(BaseModel):
    filename: str = Field(..., description="Name of the uploaded file", example="Quarterly_Report.pdf")
    content_base64: str = Field(..., description="Base64-encoded file content")
    file_type: str = Field(default="pdf", description="File extension category (pdf, excel, image, docx)")
    mime_type: str = Field(default="application/pdf", description="MIME type of document")
    tier: Literal["fast", "agentic"] = Field(
        default="fast",
        description="LlamaCloud OCR tier: 'fast' (Default: simple, text-only) or 'agentic' (diagrams, images, complex layouts)"
    )
    source: Literal["upload", "chat", "documents"] = Field(
        default="upload",
        description="Source of document: 'upload' (Documents panel), 'documents', or 'chat' (Chat attachment)"
    )
    id: Optional[str] = Field(default=None, description="Optional pre-assigned document UUID")
    size_bytes: Optional[int] = Field(default=None, description="Optional precomputed size in bytes")
    wait_for_completion: bool = Field(
        default=False,
        description="If True, awaits OCR extraction and Pinecone indexing before returning"
    )


from services.rag_service import RAGService


async def process_document_ocr_background(
    doc_id: str,
    content_base64: str,
    filename: str,
    tier: str,
    user_id: Optional[str] = None,
):
    """
    Background worker that updates document status through the lifecycle for PDF:
    'uploaded' -> 'processing' -> 'digitized' (or 'failed').
    Chunks and embeds each page deterministically into Pinecone before marking digitized.
    """
    try:
        # 1. Update status to 'processing'
        print(f"[Document Pipeline] Processing OCR for doc {doc_id} ('{filename}', tier={tier})...")
        DocumentRepository.update_document_status(doc_id, status="processing")

        # 2. Call LlamaCloud Agentic / Fast OCR service
        full_markdown, parsed_pages = await parse_pdf_async(
            content_base64=content_base64,
            filename=filename,
            tier=tier,
        )

        # 3. Ingestion into Pinecone: 1 chunk per page with deterministic ID
        print(f"[Document Pipeline] Upserting {len(parsed_pages)} pages into Pinecone for doc {doc_id}...")
        indexed_count = RAGService.index_document_pages(
            file_id=doc_id,
            file_name=filename,
            pages=parsed_pages,
            mime_type="application/pdf",
            user_id=user_id,
        )
        print(f"[Document Pipeline] Indexed {indexed_count} chunks in Pinecone for doc {doc_id}.")

        # 4. Update status to 'digitized' only after all expected records are indexed and searchable
        DocumentRepository.update_document_status(
            doc_id,
            status="digitized",
            parsed_markdown=full_markdown,
            parsed_pages=parsed_pages,
        )
        print(f"[Document Pipeline] Doc {doc_id} successfully digitized and indexed ({len(parsed_pages)} pages).")

    except Exception as err:
        err_msg = str(err)
        print(f"[Document Pipeline] Error processing OCR/Indexing for doc {doc_id}: {err_msg}")
        DocumentRepository.update_document_status(
            doc_id,
            status="failed",
            error_message=err_msg,
        )


async def process_document_docx_background(
    doc_id: str,
    content_base64: str,
    filename: str,
    user_id: Optional[str] = None,
):
    """
    Background worker that extracts markdown from DOCX files using Microsoft MarkItDown:
    'uploaded' -> 'processing' -> 'digitized' (or 'failed').
    Chunks and embeds each page deterministically into Pinecone before marking digitized.
    """
    try:
        # 1. Update status to 'processing'
        print(f"[Document Pipeline] Processing MarkItDown extraction for doc {doc_id} ('{filename}')...")
        DocumentRepository.update_document_status(doc_id, status="processing")

        # 2. Call MarkItDown parser service with page-wise chunking
        full_markdown, parsed_pages = await parse_docx_async(
            content_base64=content_base64,
            filename=filename,
        )

        # 3. Ingestion into Pinecone: 1 chunk per page with deterministic ID
        print(f"[Document Pipeline] Upserting {len(parsed_pages)} pages into Pinecone for DOCX doc {doc_id}...")
        indexed_count = RAGService.index_document_pages(
            file_id=doc_id,
            file_name=filename,
            pages=parsed_pages,
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            user_id=user_id,
        )
        print(f"[Document Pipeline] Indexed {indexed_count} DOCX chunks in Pinecone for doc {doc_id}.")

        # 4. Update status to 'digitized' only after all expected records are indexed and searchable
        DocumentRepository.update_document_status(
            doc_id,
            status="digitized",
            parsed_markdown=full_markdown,
            parsed_pages=parsed_pages,
        )
        print(f"[Document Pipeline] DOCX doc {doc_id} successfully digitized and indexed ({len(parsed_pages)} pages).")

    except Exception as err:
        err_msg = str(err)
        print(f"[Document Pipeline] Error processing DOCX/Indexing for doc {doc_id}: {err_msg}")
        DocumentRepository.update_document_status(
            doc_id,
            status="failed",
            error_message=err_msg,
        )


@router.post("/upload")
async def upload_document(
    payload: UploadDocumentRequest,
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_optional_user),
):
    """
    Uploads a document (PDF / DOCX / Image / Excel), saves it to repository, and initiates
    asynchronous background digitization with status tracking:
    'uploaded' -> 'processing' -> 'digitized'.
    """
    try:
        # Determine actual file bytes, size, and content SHA-256 hash
        raw_b64 = payload.content_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(raw_b64)
        size_bytes = payload.size_bytes or len(file_bytes)
        content_hash = hashlib.sha256(file_bytes).hexdigest()
    except Exception:
        size_bytes = len(payload.content_base64)
        content_hash = hashlib.sha256(payload.content_base64.encode("utf-8")).hexdigest()

    user_id = user.get("user_id") if user.get("authenticated") else None

    # Check RBAC Document Quota before processing new uploads
    profile = TierRepository.get_user_profile(user_id=user_id, email=user.get("email"))
    check_document_quota_allowed(profile)

    # 1. Deduplication check: Exact same filename AND tier AND content hash
    existing_duplicate = DocumentRepository.find_duplicate_document(
        filename=payload.filename,
        tier=payload.tier,
        content_hash=content_hash,
        user_id=user_id,
    )

    if existing_duplicate:
        print(
            f"[Document Deduplication] Found identical match for '{payload.filename}' "
            f"(tier='{payload.tier}', id='{existing_duplicate['id']}'). Skipping parsing & re-indexing."
        )
        return {
            "success": True,
            "deduplicated": True,
            "message": f"Document '{payload.filename}' with identical content and '{payload.tier}' tier is already present in your repository.",
            "document": normalize_doc_for_client(existing_duplicate),
        }

    # 2. Not a duplicate: Create new document record with status 'uploaded'
    doc_record = DocumentRepository.save_document(
        filename=payload.filename,
        content_base64=payload.content_base64,
        size_bytes=size_bytes,
        file_type=payload.file_type.lower(),
        mime_type=payload.mime_type,
        tier=payload.tier,
        source=payload.source,
        user_id=user_id,
        doc_id=payload.id,
        content_hash=content_hash,
    )

    doc_id = doc_record["id"]

    # Increment user document consumption
    TierRepository.increment_usage(user_id=user_id, resource="documents", amount=1)

    is_pdf = payload.file_type.lower() == "pdf" or payload.filename.lower().endswith(".pdf")
    is_docx = payload.file_type.lower() in ("docx", "doc") or payload.filename.lower().endswith((".docx", ".doc"))

    # 3. Synchronous execution if wait_for_completion is requested (e.g. Chat direct upload)
    if payload.wait_for_completion:
        if is_pdf:
            await process_document_ocr_background(
                doc_id=doc_id,
                content_base64=payload.content_base64,
                filename=payload.filename,
                tier=payload.tier,
                user_id=user_id,
            )
        elif is_docx:
            await process_document_docx_background(
                doc_id=doc_id,
                content_base64=payload.content_base64,
                filename=payload.filename,
                user_id=user_id,
            )
        else:
            DocumentRepository.update_document_status(doc_id, status="digitized")

        final_record = DocumentRepository.get_document_by_id(doc_id) or doc_record
        normalized_doc = normalize_doc_for_client(final_record)

        return {
            "success": True,
            "deduplicated": False,
            "message": f"Document '{payload.filename}' uploaded and digitized successfully.",
            "document": normalized_doc,
        }

    # 4. Asynchronous background execution (e.g. Documents Panel upload)
    if is_pdf:
        background_tasks.add_task(
            process_document_ocr_background,
            doc_id=doc_id,
            content_base64=payload.content_base64,
            filename=payload.filename,
            tier=payload.tier,
            user_id=user_id,
        )
    elif is_docx:
        background_tasks.add_task(
            process_document_docx_background,
            doc_id=doc_id,
            content_base64=payload.content_base64,
            filename=payload.filename,
            user_id=user_id,
        )
    else:
        # Non-PDF/DOCX files (images/excel) default directly to digitized
        DocumentRepository.update_document_status(doc_id, status="digitized")
        doc_record["status"] = "digitized"
        doc_record["digitized"] = True

    normalized_doc = normalize_doc_for_client(doc_record)

    return {
        "success": True,
        "deduplicated": False,
        "message": f"Document '{payload.filename}' uploaded successfully.",
        "document": normalized_doc,
    }


@router.get("")
async def get_documents(
    user: Dict[str, Any] = Depends(get_optional_user),
):
    """Retrieves all documents belonging to the user or guest session with normalized client keys."""
    user_id = user.get("user_id") if user.get("authenticated") else None
    docs = DocumentRepository.get_user_documents(user_id=user_id)
    normalized_list = [normalize_doc_for_client(d) for d in docs]
    return {
        "documents": normalized_list,
        "count": len(normalized_list),
    }


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    user: Dict[str, Any] = Depends(get_optional_user),
):
    """Retrieves full details of a specific document including parsed markdown and pages."""
    doc = DocumentRepository.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return normalize_doc_for_client(doc)


@router.get("/{doc_id}/status")
async def get_document_status(
    doc_id: str,
):
    """Fast polling endpoint to check the digitization status of a document."""
    doc = DocumentRepository.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc["id"],
        "name": doc.get("filename") or doc.get("name"),
        "filename": doc.get("filename") or doc.get("name"),
        "status": doc.get("status", "uploaded"),
        "digitized": doc.get("digitized", False),
        "error_message": doc.get("error_message"),
        "tier": doc.get("tier", "fast"),
        "has_parsed_markdown": bool(doc.get("parsed_markdown")),
        "pages_count": len(doc.get("parsed_pages", [])),
    }


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user: Dict[str, Any] = Depends(get_optional_user),
):
    """Deletes a document from repository and purges its vectors from Pinecone."""
    user_id = user.get("user_id") if user.get("authenticated") else None
    
    # 1. Purge all corresponding vectors from Pinecone Cloud Index
    try:
        RAGService.delete_document_vectors(doc_id)
    except Exception as e:
        print(f"[Document Pipeline] Note: Pinecone vector purge failed for {doc_id}: {e}")

    # 2. Delete document record from Supabase / repository
    success = DocumentRepository.delete_document(doc_id, user_id=user_id)
    return {"success": success, "deleted_id": doc_id}
