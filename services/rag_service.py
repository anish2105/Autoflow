import os
import re
import json
import math
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from rank_bm25 import BM25Okapi

from config import settings
from db.document_repository import DocumentRepository

# Try importing Pinecone SDK
_PINECONE_AVAILABLE = False
try:
    from pinecone import Pinecone, ServerlessSpec
    _PINECONE_AVAILABLE = True
except ImportError:
    _PINECONE_AVAILABLE = False


# Local in-memory / persistent vector & chunk store for fallback & BM25 indexing
# Structure: { chunk_id: { "id": str, "values": List[float], "metadata": Dict[str, Any] } }
_CHUNK_STORE: Dict[str, Dict[str, Any]] = {}


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
    def generate_embeddings(cls, texts: List[str]) -> List[List[float]]:
        """
        Batches page texts through Google Gemini embedding model (1536 dimensions).
        """
        if not texts:
            return []

        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        embeddings: List[List[float]] = []

        for text in texts:
            cleaned = text.strip() if text else ""
            if not cleaned:
                # Handle empty chunk with zero vector
                embeddings.append([0.0] * settings.EMBEDDING_DIMENSION)
                continue

            try:
                # Gemini embedding API
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
                    embeddings.append(list(embedding_val))
                else:
                    embeddings.append([0.0] * settings.EMBEDDING_DIMENSION)
            except Exception as e:
                print(f"[RAG Service] Embedding generation error for text snippet: {e}")
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
        1. Formats page-by-page chunks with deterministic IDs ({file_id}_page_{page_number:04d}).
        2. Generates dense embeddings.
        3. Upserts records into Pinecone and local cache with full metadata.
        """
        if not pages:
            print(f"[RAG Service] No pages provided for file_id {file_id}.")
            return 0

        chunks_to_embed = []
        records_to_upsert = []

        for idx, page in enumerate(pages):
            page_num = page.get("page_number") or (idx + 1)
            raw_text = page.get("text") or page.get("markdown") or page.get("content") or ""
            text = raw_text.strip()
            
            # Deterministic chunk ID
            chunk_id = f"{file_id}_page_{int(page_num):04d}"
            content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            now_iso = datetime.now(timezone.utc).isoformat()

            metadata = {
                "user_id": user_id or "anonymous",
                "file_id": file_id,
                "file_name": file_name,
                "page_number": int(page_num),
                "chunk_index": idx,
                "text": text,
                "mime_type": mime_type,
                "document_version": document_version,
                "content_hash": content_hash,
                "created_at": now_iso,
            }

            chunks_to_embed.append(text if text else f"Page {page_num} of {file_name}")
            records_to_upsert.append({
                "id": chunk_id,
                "metadata": metadata,
            })

        # 4. Generate embeddings
        print(f"[RAG Service] Embedding {len(chunks_to_embed)} pages for '{file_name}' ({file_id})...")
        vectors = cls.generate_embeddings(chunks_to_embed)

        for record, vec in zip(records_to_upsert, vectors):
            record["values"] = vec
            # Always sync to local chunk store for fast BM25 retrieval and offline resilience
            _CHUNK_STORE[record["id"]] = record

        # 5. Upsert to Pinecone
        pinecone_idx = cls._init_pinecone()
        if pinecone_idx:
            try:
                # Format for Pinecone upsert: list of tuples (id, vector, metadata) or dicts
                pc_vectors = [
                    {
                        "id": r["id"],
                        "values": r["values"],
                        "metadata": r["metadata"],
                    }
                    for r in records_to_upsert
                ]
                # Batch upsert in chunks of 50
                batch_size = 50
                for i in range(0, len(pc_vectors), batch_size):
                    batch = pc_vectors[i : i + batch_size]
                    pinecone_idx.upsert(vectors=batch)
                print(f"[RAG Service] Successfully upserted {len(records_to_upsert)} chunks to Pinecone for '{file_name}'.")
            except Exception as e:
                print(f"[RAG Service] Error upserting to Pinecone: {e}. Local fallback retained.")

        return len(records_to_upsert)

    @classmethod
    def _get_candidate_chunks_in_scope(
        cls,
        selected_file_ids: List[str],
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all chunk records matching selected_file_ids (from local chunk store or DocumentRepository).
        """
        scoped_chunks = []
        # Check in memory chunk store
        for chunk in _CHUNK_STORE.values():
            meta = chunk.get("metadata", {})
            if meta.get("file_id") in selected_file_ids:
                if user_id and meta.get("user_id") not in (user_id, "anonymous", None):
                    continue
                scoped_chunks.append(chunk)

        # If chunks not in _CHUNK_STORE, reconstruct from DocumentRepository parsed_pages
        existing_doc_ids = {c["metadata"]["file_id"] for c in scoped_chunks}
        for fid in selected_file_ids:
            if fid not in existing_doc_ids:
                doc = DocumentRepository.get_document_by_id(fid)
                if doc:
                    pages = doc.get("parsed_pages") or []
                    fname = doc.get("filename") or doc.get("name") or "Document"
                    mtype = doc.get("mime_type") or "application/pdf"
                    cls.index_document_pages(
                        file_id=fid,
                        file_name=fname,
                        pages=pages,
                        mime_type=mtype,
                        user_id=user_id or doc.get("user_id"),
                    )
                    # Re-fetch
                    for chunk in _CHUNK_STORE.values():
                        if chunk.get("metadata", {}).get("file_id") == fid:
                            scoped_chunks.append(chunk)

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
        Executes Dense Vector Similarity Search restricted strictly to selected_file_ids.
        Uses Pinecone if active, otherwise local cosine similarity.
        """
        pinecone_idx = cls._init_pinecone()
        if pinecone_idx:
            try:
                filter_dict: Dict[str, Any] = {
                    "file_id": {"$in": selected_file_ids}
                }
                if user_id:
                    filter_dict["user_id"] = {"$eq": user_id}

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
                if dense_results:
                    return dense_results
            except Exception as e:
                print(f"[RAG Service] Pinecone dense query error: {e}. Falling back to local search.")

        # Local fallback dense search
        scoped = cls._get_candidate_chunks_in_scope(selected_file_ids, user_id)
        scored = []
        for chunk in scoped:
            sim = cosine_similarity(query_vector, chunk.get("values", []))
            scored.append({
                "id": chunk["id"],
                "score": sim,
                "metadata": chunk.get("metadata", {}),
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

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

        # 1. Embed query
        query_vector = cls.embed_query(query)

        # 2. Parallel searches
        dense_results = cls.search_dense(
            query_vector=query_vector,
            selected_file_ids=selected_file_ids,
            user_id=user_id,
            top_k=30,
        )
        bm25_results = cls.search_bm25(
            query=query,
            selected_file_ids=selected_file_ids,
            user_id=user_id,
            top_k=30,
        )

        # 3. Reciprocal Rank Fusion (Top 20 candidates)
        fused_candidates = cls.merge_rrf(
            dense_results=dense_results,
            bm25_results=bm25_results,
            k=60,
            top_n=20,
        )

        # 4. Cross-Encoder Reranker (Top 10 chunks)
        top_chunks = await cls.rerank_candidates(
            query=query,
            candidates=fused_candidates,
            top_n=top_n,
        )

        return top_chunks
