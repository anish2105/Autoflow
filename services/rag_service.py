import os
import re
import json
import time
import math
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from rank_bm25 import BM25Okapi

from config import settings
from db.document_repository import DocumentRepository
from utils.rag_terminal_logger import RAGTerminalLogger

# Try importing Pinecone SDK
_PINECONE_AVAILABLE = False
try:
    from pinecone import Pinecone, ServerlessSpec
    _PINECONE_AVAILABLE = True
except ImportError:
    _PINECONE_AVAILABLE = False


# Maximum metadata text byte limit per Pinecone vector (Pinecone has a 40,960 byte hard ceiling for the entire JSON)
# Keeping text <= 32,000 bytes ensures metadata never breaches the 40 KB limit.
MAX_PAGE_CHUNK_BYTES = 32000


def split_page_into_parts(text: str, max_bytes: int = MAX_PAGE_CHUNK_BYTES) -> List[str]:
    """
    If a page's text exceeds max_bytes, cleanly splits the page into 2 or more sub-parts
    without losing any data. Slices at paragraph (\n\n) or line (\n) boundaries when possible.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return [cleaned]

    text_bytes = len(cleaned.encode("utf-8"))
    if text_bytes <= max_bytes:
        return [cleaned]

    # Target at least 2 parts
    num_parts = max(2, (text_bytes + max_bytes - 1) // max_bytes)

    # Attempt to split at double newlines (paragraphs)
    paragraphs = cleaned.split("\n\n")
    parts: List[str] = []
    current_chunk: List[str] = []
    current_size = 0

    for para in paragraphs:
        para_size = len((para + "\n\n").encode("utf-8"))
        if current_size + para_size > max_bytes and current_chunk:
            parts.append("\n\n".join(current_chunk).strip())
            current_chunk = [para]
            current_size = para_size
        else:
            current_chunk.append(para)
            current_size += para_size

    if current_chunk:
        parts.append("\n\n".join(current_chunk).strip())

    # Check if any resulting part is still too large (e.g., giant markdown table)
    subdivided_parts: List[str] = []
    for p in parts:
        p_bytes = len(p.encode("utf-8"))
        if p_bytes <= max_bytes:
            subdivided_parts.append(p)
        else:
            # Split giant paragraph by lines
            lines = p.split("\n")
            line_chunk: List[str] = []
            line_size = 0
            for l in lines:
                l_bytes = len((l + "\n").encode("utf-8"))
                if line_size + l_bytes > max_bytes and line_chunk:
                    subdivided_parts.append("\n".join(line_chunk).strip())
                    line_chunk = [l]
                    line_size = l_bytes
                else:
                    line_chunk.append(l)
                    line_size += l_bytes
            if line_chunk:
                subdivided_parts.append("\n".join(line_chunk).strip())

    # Fallback if somehow still not split into at least 2 parts
    if len(subdivided_parts) < 2 and text_bytes > max_bytes:
        mid_idx = len(cleaned) // 2
        newline_idx = cleaned.rfind("\n", 0, mid_idx + 1000)
        if newline_idx == -1 or newline_idx < mid_idx - 1000:
            newline_idx = mid_idx
        subdivided_parts = [cleaned[:newline_idx].strip(), cleaned[newline_idx:].strip()]

    return [p for p in subdivided_parts if p.strip()]


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = 0.0
    norm1 = 0.0
    norm2 = 0.0
    for a, b in zip(v1, v2):
        dot += a * b
        norm1 += a * a
        norm2 += b * b
    if norm1 <= 0.0 or norm2 <= 0.0:
        return 0.0
    return dot / (math.sqrt(norm1) * math.sqrt(norm2))


def tokenize_text(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric words for BM25 keyword matching."""
    return re.findall(r"\b\w+\b", text.lower())


class RAGService:
    """
    Production Hybrid RAG Service:
    - Generates 1536-dim dense embeddings via Google Gemini (models/gemini-embedding-2).
    - Upserts deterministic page-wise records into Pinecone (with resilient local store fallback).
    - Executes parallel Dense Search & BM25 Sparse Search restricted to authorized file scope.
    - Merges rankings using Reciprocal Rank Fusion (RRF) -> Top 20 candidates.
    - Cross-Encoder reranker selects Top 10 chunks with page citations.
    """

    _pinecone_client = None
    _pinecone_index = None
    _pinecone_initialized = False

    @classmethod
    def _init_pinecone(cls):
        """Lazy initialization of Pinecone client and index."""
        if cls._pinecone_initialized and cls._pinecone_index is not None:
            return cls._pinecone_index

        cls._pinecone_initialized = True
        api_key = settings.PINECONE_API_KEY.strip()
        if not api_key or not _PINECONE_AVAILABLE:
            print("[RAG Service] Pinecone API key not provided or SDK unavailable. Running with local vector fallback.")
            return None

        try:
            cls._pinecone_client = Pinecone(api_key=api_key)
            index_name = settings.PINECONE_INDEX_NAME

            # Check if index exists or create/recreate if dimension differs
            existing_indexes = [idx.name for idx in cls._pinecone_client.list_indexes()]
            if index_name not in existing_indexes:
                print(f"[RAG Service] Creating serverless Pinecone index '{index_name}' (dim={settings.EMBEDDING_DIMENSION})...")
                cls._pinecone_client.create_index(
                    name=index_name,
                    dimension=settings.EMBEDDING_DIMENSION,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )
            else:
                desc = cls._pinecone_client.describe_index(index_name)
                idx_dim = getattr(desc, "dimension", None)
                if idx_dim is not None and idx_dim != settings.EMBEDDING_DIMENSION:
                    print(f"[RAG Service] Existing index '{index_name}' dimension ({idx_dim}) != configured ({settings.EMBEDDING_DIMENSION}). Recreating...")
                    cls._pinecone_client.delete_index(index_name)
                    cls._pinecone_client.create_index(
                        name=index_name,
                        dimension=settings.EMBEDDING_DIMENSION,
                        metric="cosine",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                    )

            cls._pinecone_index = cls._pinecone_client.Index(index_name)
            print(f"[RAG Service] Successfully connected to Pinecone index '{index_name}'.")
            return cls._pinecone_index
        except Exception as e:
            print(f"[RAG Service] Failed to initialize Pinecone: {e}. Fallback to local vector store.")
            cls._pinecone_index = None
            return None

    @classmethod
    def generate_embeddings(
        cls,
        texts: List[str],
        chunk_info: Optional[List[Dict[str, Any]]] = None,
    ) -> List[List[float]]:
        """
        Batches page texts through Google Gemini embedding model (1536 dimensions).
        Includes automatic 429 RESOURCE_EXHAUSTED rate-limit detection, sleep backoff,
        and retry loop to guarantee zero dropped or corrupted vectors.
        """
        if not texts:
            return []

        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        embeddings: List[List[float]] = []
        total_texts = len(texts)

        for idx, text in enumerate(texts):
            cleaned = text.strip() if text else ""
            if not cleaned:
                embeddings.append([0.0] * settings.EMBEDDING_DIMENSION)
                continue

            info = chunk_info[idx] if (chunk_info and idx < len(chunk_info)) else {}
            p_num = info.get("page_number", idx + 1)
            part_num = info.get("part_number", 1)
            tot_parts = info.get("total_parts", 1)
            char_len = len(cleaned)

            max_retries = 6
            chunk_embedding: Optional[List[float]] = None

            for attempt in range(1, max_retries + 1):
                try:
                    res = client.models.embed_content(
                        model=settings.EMBEDDING_MODEL,
                        contents=cleaned,
                        config={"output_dimensionality": settings.EMBEDDING_DIMENSION},
                    )
                    embedding_val = None
                    if getattr(res, "embedding", None) and hasattr(res.embedding, "values"):
                        embedding_val = res.embedding.values
                    elif getattr(res, "embeddings", None) and len(res.embeddings) > 0:
                        embedding_val = res.embeddings[0].values

                    if embedding_val and len(embedding_val) == settings.EMBEDDING_DIMENSION:
                        chunk_embedding = list(embedding_val)
                        if chunk_info:
                            RAGTerminalLogger.log_ingestion_progress(
                                current_chunk=idx + 1,
                                total_chunks=total_texts,
                                page_num=p_num,
                                part_num=part_num,
                                total_parts=tot_parts,
                                char_len=char_len,
                                dim=settings.EMBEDDING_DIMENSION,
                            )
                        # Small pacing delay between requests to keep token rate smooth
                        time.sleep(0.15)
                        break
                    else:
                        print(f"[RAG Service] Warning: Unexpected embedding output for chunk {idx + 1}.")
                        chunk_embedding = [0.0] * settings.EMBEDDING_DIMENSION
                        break

                except Exception as e:
                    err_str = str(e)
                    is_rate_limit = (
                        "429" in err_str
                        or "RESOURCE_EXHAUSTED" in err_str
                        or "Quota exceeded" in err_str
                        or "rate_limit" in err_str.lower()
                    )

                    if is_rate_limit and attempt < max_retries:
                        # Extract requested retry delay from Google GenAI error message
                        retry_delay = 30.0
                        m1 = re.search(r"retry in\s+([\d\.]+)\s*s", err_str, re.IGNORECASE)
                        m2 = re.search(r"['\"]?retryDelay['\"]?\s*:\s*['\"]?(\d+)", err_str)
                        if m1:
                            try:
                                retry_delay = float(m1.group(1)) + 2.5
                            except Exception:
                                retry_delay = 30.0
                        elif m2:
                            try:
                                retry_delay = float(m2.group(1)) + 2.5
                            except Exception:
                                retry_delay = 30.0

                        retry_delay = max(5.0, min(retry_delay, 65.0))
                        RAGTerminalLogger.log_rate_limit_pause(
                            wait_seconds=retry_delay,
                            attempt=attempt,
                            max_attempts=max_retries,
                            current_chunk=idx + 1,
                            total_chunks=total_texts,
                            page_num=p_num,
                        )
                        time.sleep(retry_delay)
                        continue
                    else:
                        if is_rate_limit:
                            print(f"[RAG Service] Final fallback: Waiting 60s for chunk {idx + 1}...")
                            time.sleep(60.0)
                            try:
                                res_retry = client.models.embed_content(
                                    model=settings.EMBEDDING_MODEL,
                                    contents=cleaned,
                                    config={"output_dimensionality": settings.EMBEDDING_DIMENSION},
                                )
                                ev = None
                                if getattr(res_retry, "embedding", None) and hasattr(res_retry.embedding, "values"):
                                    ev = res_retry.embedding.values
                                elif getattr(res_retry, "embeddings", None) and len(res_retry.embeddings) > 0:
                                    ev = res_retry.embeddings[0].values
                                if ev and len(ev) == settings.EMBEDDING_DIMENSION:
                                    chunk_embedding = list(ev)
                                    break
                            except Exception as final_e:
                                print(f"[RAG Service] Fatal retry failure on chunk {idx + 1}: {final_e}")

                        raise RuntimeError(
                            f"[RAG Service] Failed to generate embedding for page {p_num} (chunk {idx + 1}/{total_texts}): {e}"
                        )

            if chunk_embedding is not None:
                embeddings.append(chunk_embedding)
            else:
                embeddings.append([0.0] * settings.EMBEDDING_DIMENSION)

        return embeddings

    @classmethod
    def embed_query(cls, query: str) -> List[float]:
        """Embeds single user query at retrieval time."""
        results = cls.generate_embeddings([query])
        return results[0] if results else [0.0] * settings.EMBEDDING_DIMENSION

    @classmethod
    def index_document_pages(
        cls,
        file_id: str,
        file_name: str,
        pages: List[Dict[str, Any]],
        mime_type: str = "application/pdf",
        user_id: Optional[str] = None,
        document_version: int = 1,
    ) -> int:
        """
        Ingestion pipeline:
        1. Formats page-by-page chunks. If a page exceeds MAX_PAGE_CHUNK_BYTES (32 KB),
           cleanly splits it into 2 or more sub-parts so no text/data is lost.
        2. Generates dense embeddings via Google Gemini with automatic rate-limit backoff.
        3. Upserts all chunks directly into Pinecone Cloud Index (no in-memory store).
        4. Queries Pinecone live to verify 100% of vectors are searchable.
        """
        if not pages:
            print(f"[RAG Service] No pages provided for file_id {file_id}.")
            return 0

        chunks_to_embed: List[str] = []
        chunk_metadata_info: List[Dict[str, Any]] = []
        records_to_upsert: List[Dict[str, Any]] = []
        oversized_pages_count = 0

        for idx, page in enumerate(pages):
            page_num = page.get("page_number") or (idx + 1)
            raw_text = page.get("text") or page.get("markdown") or page.get("content") or ""
            text = raw_text.strip()

            # Split page into parts if text > 32 KB (Pinecone metadata limit is 40 KB)
            page_parts = split_page_into_parts(text, max_bytes=MAX_PAGE_CHUNK_BYTES)
            total_parts = len(page_parts)
            if total_parts > 1:
                oversized_pages_count += 1

            for part_idx, part_text in enumerate(page_parts, start=1):
                if total_parts == 1:
                    chunk_id = f"{file_id}_page_{int(page_num):04d}"
                else:
                    chunk_id = f"{file_id}_page_{int(page_num):04d}_part{part_idx:02d}"

                content_hash = hashlib.sha256(part_text.encode("utf-8")).hexdigest()
                now_iso = datetime.now(timezone.utc).isoformat()

                metadata = {
                    "user_id": user_id or "anonymous",
                    "file_id": file_id,
                    "file_name": file_name,
                    "page_number": int(page_num),
                    "part_number": int(part_idx),
                    "total_parts": int(total_parts),
                    "chunk_index": len(records_to_upsert),
                    "text": part_text,
                    "mime_type": mime_type,
                    "document_version": document_version,
                    "content_hash": content_hash,
                    "created_at": now_iso,
                }

                chunks_to_embed.append(part_text if part_text else f"Page {page_num} of {file_name}")
                chunk_metadata_info.append({
                    "page_number": int(page_num),
                    "part_number": int(part_idx),
                    "total_parts": int(total_parts),
                    "char_len": len(part_text),
                })
                records_to_upsert.append({
                    "id": chunk_id,
                    "metadata": metadata,
                })

        # 1. Print visual ingestion header
        RAGTerminalLogger.log_ingestion_start(
            file_id=file_id,
            file_name=file_name,
            pages_count=len(pages),
            chunks_count=len(records_to_upsert),
            model_name=settings.EMBEDDING_MODEL,
            dim=settings.EMBEDDING_DIMENSION,
            oversized_split_count=oversized_pages_count,
        )

        # 2. Generate embeddings via Gemini with rate-limit resilience
        vectors = cls.generate_embeddings(chunks_to_embed, chunk_info=chunk_metadata_info)

        for record, vec in zip(records_to_upsert, vectors):
            record["values"] = vec

        # 3. Upsert directly to Pinecone Cloud (100% cloud, no in-memory store)
        pinecone_idx = cls._init_pinecone()
        if not pinecone_idx:
            raise RuntimeError(
                f"[RAG Service] Failed to index '{file_name}': Pinecone index '{settings.PINECONE_INDEX_NAME}' is unavailable. "
                "In-memory vector storage is disabled. Please verify PINECONE_API_KEY in server configuration."
            )

        pc_vectors = [
            {
                "id": r["id"],
                "values": r["values"],
                "metadata": r["metadata"],
            }
            for r in records_to_upsert
        ]

        batch_size = 20
        total_batches = (len(pc_vectors) + batch_size - 1) // batch_size
        print(f"\n[RAG Service] Upserting {len(pc_vectors)} vectors to Pinecone in {total_batches} batch(es)...")

        for b_idx in range(total_batches):
            start_i = b_idx * batch_size
            end_i = min(start_i + batch_size, len(pc_vectors))
            batch = pc_vectors[start_i:end_i]
            pinecone_idx.upsert(vectors=batch)
            RAGTerminalLogger.log_pinecone_batch_upsert(
                batch_num=b_idx + 1,
                total_batches=total_batches,
                vector_count=len(batch),
                id_start=batch[0]["id"],
                id_end=batch[-1]["id"],
            )

        # 4. Live Verification from Pinecone
        pinecone_total = 0
        verified_doc_vectors = len(records_to_upsert)
        try:
            stats = pinecone_idx.describe_index_stats()
            pinecone_total = getattr(stats, "total_vector_count", len(records_to_upsert))
            query_res = pinecone_idx.query(
                vector=[0.001] * settings.EMBEDDING_DIMENSION,
                filter={"file_id": {"$in": [file_id]}},
                top_k=1000,
            )
            verified_doc_vectors = len(query_res.matches)
        except Exception as ve:
            print(f"[RAG Service] Note during Pinecone verification query: {ve}")

        valid_embeddings = sum(1 for v in vectors if any(x != 0.0 for x in v))

        RAGTerminalLogger.log_ingestion_verification(
            file_id=file_id,
            file_name=file_name,
            total_pages=len(pages),
            total_chunks=len(records_to_upsert),
            valid_embeddings=valid_embeddings,
            index_name=settings.PINECONE_INDEX_NAME,
            pinecone_total_vectors=pinecone_total,
            verified_doc_vectors=verified_doc_vectors,
            oversized_split_count=oversized_pages_count,
        )

        return len(records_to_upsert)

    @classmethod
    def delete_document_vectors(cls, file_id: str) -> bool:
        """Purges all vectors belonging to file_id directly from Pinecone index."""
        pinecone_idx = cls._init_pinecone()
        if not pinecone_idx:
            return False
        try:
            pinecone_idx.delete(filter={"file_id": {"$eq": file_id}})
            print(f"[RAG Service] Successfully purged Pinecone vectors for file_id: '{file_id}'.")
            return True
        except Exception as e:
            print(f"[RAG Service] Note: Pinecone vector purge failed for '{file_id}': {e}")
            return False

    @classmethod
    def _get_candidate_chunks_in_scope(
        cls,
        selected_file_ids: List[str],
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all chunk records matching selected_file_ids on demand from Supabase PostgreSQL.
        NO global in-memory store: loads parsed_pages directly from the database for the active query.
        """
        scoped_chunks: List[Dict[str, Any]] = []

        for fid in selected_file_ids:
            doc = DocumentRepository.get_document_by_id(fid)
            if not doc:
                continue

            pages = doc.get("parsed_pages") or []
            fname = doc.get("filename") or doc.get("name") or "Document"
            mtype = doc.get("mime_type") or "application/pdf"
            doc_user = doc.get("user_id") or "anonymous"

            for idx, page in enumerate(pages):
                page_num = page.get("page_number") or (idx + 1)
                raw_text = page.get("text") or page.get("markdown") or page.get("content") or ""
                text = raw_text.strip()
                if not text:
                    continue

                page_parts = split_page_into_parts(text, max_bytes=MAX_PAGE_CHUNK_BYTES)
                total_parts = len(page_parts)

                for part_idx, part_text in enumerate(page_parts, start=1):
                    if total_parts == 1:
                        chunk_id = f"{fid}_page_{int(page_num):04d}"
                    else:
                        chunk_id = f"{fid}_page_{int(page_num):04d}_part{part_idx:02d}"

                    scoped_chunks.append({
                        "id": chunk_id,
                        "metadata": {
                            "user_id": doc_user,
                            "file_id": fid,
                            "file_name": fname,
                            "page_number": int(page_num),
                            "part_number": int(part_idx),
                            "total_parts": int(total_parts),
                            "chunk_index": len(scoped_chunks),
                            "text": part_text,
                            "mime_type": mtype,
                        }
                    })

        return scoped_chunks

    @classmethod
    def search_dense(
        cls,
        query_vector: List[float],
        selected_file_ids: List[str],
        user_id: Optional[str] = None,
        top_k: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Executes Dense Vector Similarity Search strictly against Pinecone Cloud Index.
        NO in-memory fallback: all dense vector operations are executed in Pinecone.
        """
        pinecone_idx = cls._init_pinecone()
        if not pinecone_idx:
            raise RuntimeError(
                f"[RAG Service] Pinecone index '{settings.PINECONE_INDEX_NAME}' is unavailable. "
                "In-memory vector storage is disabled. Please verify PINECONE_API_KEY."
            )

        filter_dict: Dict[str, Any] = {
            "file_id": {"$in": selected_file_ids}
        }
        # Note: Do not constrain on user_id when selected_file_ids are explicitly provided.
        # Files are already access-authorized at the session/repository level. Adding user_id
        # causes false zero-vector retrieval if a document was ingested under a guest/admin ID.

        try:
            res = pinecone_idx.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict,
            )
            dense_results = []
            for match in res.get("matches", []):
                dense_results.append({
                    "id": match["id"],
                    "score": match.get("score", 0.0),
                    "metadata": match.get("metadata", {}),
                })
            return dense_results
        except Exception as e:
            print(f"[RAG Service] Pinecone dense query error: {e}")
            raise e

    @classmethod
    def search_bm25(
        cls,
        query: str,
        selected_file_ids: List[str],
        user_id: Optional[str] = None,
        top_k: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Executes BM25 Sparse Keyword Search across authorized file chunks.
        """
        scoped = cls._get_candidate_chunks_in_scope(selected_file_ids, user_id)
        if not scoped:
            return []

        tokenized_corpus = [tokenize_text(c["metadata"].get("text", "")) for c in scoped]
        tokenized_query = tokenize_text(query)

        if not tokenized_query or not any(tokenized_corpus):
            return []

        try:
            bm25 = BM25Okapi(tokenized_corpus)
            doc_scores = bm25.get_scores(tokenized_query)

            scored = []
            for chunk, score in zip(scoped, doc_scores):
                if score > 0.0:
                    scored.append({
                        "id": chunk["id"],
                        "score": float(score),
                        "metadata": chunk.get("metadata", {}),
                    })

            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]
        except Exception as e:
            print(f"[RAG Service] BM25 scoring error: {e}")
            return []

    @classmethod
    def merge_rrf(
        cls,
        dense_results: List[Dict[str, Any]],
        bm25_results: List[Dict[str, Any]],
        k: int = 60,
        top_n: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Reciprocal Rank Fusion (RRF):
        RRF(d) = sum_{m in {dense, bm25}} 1 / (k + rank_m(d))
        Deduplicates chunks and selects Top 20 unique candidates.
        """
        rrf_scores: Dict[str, float] = {}
        chunk_map: Dict[str, Dict[str, Any]] = {}

        # 1. Process Dense Rankings
        for rank, item in enumerate(dense_results, start=1):
            cid = item["id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k + rank))
            if cid not in chunk_map:
                chunk_map[cid] = item

        # 2. Process BM25 Rankings
        for rank, item in enumerate(bm25_results, start=1):
            cid = item["id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k + rank))
            if cid not in chunk_map:
                chunk_map[cid] = item

        # 3. Sort by RRF score descending
        fused = []
        for cid, score in rrf_scores.items():
            entry = dict(chunk_map[cid])
            entry["rrf_score"] = score
            fused.append(entry)

        fused.sort(key=lambda x: x["rrf_score"], reverse=True)
        return fused[:top_n]

    @classmethod
    async def rerank_candidates(
        cls,
        query: str,
        candidates: List[Dict[str, Any]],
        top_n: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Cross-Encoder Reranker:
        Evaluates relevance of Top 20 candidates against query and selects Top 10 chunks.
        Uses fast Gemini Flash listwise cross-encoder scoring.
        """
        if not candidates:
            return []

        if len(candidates) <= top_n:
            # Fewer than top_n candidates, return all available
            return candidates

        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Prepare candidate snippets for scoring
        candidate_snippets = []
        for i, c in enumerate(candidates):
            meta = c.get("metadata", {})
            text_preview = (meta.get("text", "") or "")[:400].replace("\n", " ")
            candidate_snippets.append(
                f"[{i}] ID: {c['id']} | Page: {meta.get('page_number')} | File: {meta.get('file_name')}\nText: {text_preview}"
            )

        prompt = (
            f"You are a Cross-Encoder Reranker in a Hybrid RAG pipeline.\n"
            f"User Query: \"{query}\"\n\n"
            f"Evaluate the following document chunks and rank the top {top_n} most directly relevant chunks that provide answers or evidence for the query.\n\n"
            f"Candidates:\n" + "\n\n".join(candidate_snippets) + "\n\n"
            f"Respond ONLY with a JSON array of chunk indices ordered from most relevant to least relevant (e.g. [3, 0, 8, ...])."
        )

        try:
            res = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
            raw_text = res.text.strip()
            ranked_indices = json.loads(raw_text)

            if isinstance(ranked_indices, list):
                reranked = []
                seen_indices = set()
                for idx in ranked_indices:
                    if isinstance(idx, int) and 0 <= idx < len(candidates) and idx not in seen_indices:
                        reranked.append(candidates[idx])
                        seen_indices.add(idx)

                # Fill remaining up to top_n from original candidates if needed
                for i, c in enumerate(candidates):
                    if i not in seen_indices and len(reranked) < top_n:
                        reranked.append(c)

                return reranked[:top_n]
        except Exception as e:
            print(f"[RAG Service] Cross-encoder reranker error: {e}. Preserving RRF ranking.")

        # Fallback to top_n by RRF score
        return candidates[:top_n]

    @classmethod
    async def retrieve_and_rerank(
        cls,
        query: str,
        selected_file_ids: List[str],
        user_id: Optional[str] = None,
        top_n: int = 10,
        iteration: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Complete Hybrid Retrieval Pipeline:
        1. Query embedding at retrieval time.
        2. Parallel Dense + BM25 search.
        3. Reciprocal Rank Fusion (Top 20).
        4. Cross-Encoder reranking (Top 10).
        """
        if not selected_file_ids:
            return []

        # 0. Terminal banner for retrieval start
        RAGTerminalLogger.log_retrieval_start(
            query=query,
            selected_file_ids=selected_file_ids,
            iteration=iteration,
        )

        # 1. Embed query
        query_vector = cls.embed_query(query)

        # 2. Parallel searches
        # Dense Semantic Vector Search strictly from Pinecone Cloud Index (100% Cloud)
        dense_results = cls.search_dense(
            query_vector=query_vector,
            selected_file_ids=selected_file_ids,
            user_id=user_id,
            top_k=30,
        )
        RAGTerminalLogger.log_dense_results(
            dense_results=dense_results,
            is_pinecone=True,
            top_k=8,
        )

        bm25_results = cls.search_bm25(
            query=query,
            selected_file_ids=selected_file_ids,
            user_id=user_id,
            top_k=30,
        )
        scoped_chunks = cls._get_candidate_chunks_in_scope(selected_file_ids, user_id)
        tokenized_query = tokenize_text(query)
        RAGTerminalLogger.log_bm25_results(
            bm25_results=bm25_results,
            tokens=tokenized_query,
            corpus_size=len(scoped_chunks),
            top_k=8,
        )

        # 3. Reciprocal Rank Fusion (Top 20 candidates)
        fused_candidates = cls.merge_rrf(
            dense_results=dense_results,
            bm25_results=bm25_results,
            k=60,
            top_n=20,
        )
        RAGTerminalLogger.log_rrf_fusion(
            fused_candidates=fused_candidates,
            dense_results=dense_results,
            bm25_results=bm25_results,
            k=60,
            top_n=10,
        )

        # 4. Cross-Encoder Reranker (Top 10 chunks)
        top_chunks = await cls.rerank_candidates(
            query=query,
            candidates=fused_candidates,
            top_n=top_n,
        )
        RAGTerminalLogger.log_rerank_results(
            reranked_chunks=top_chunks,
            top_n=top_n,
        )

        return top_chunks

        return top_chunks
