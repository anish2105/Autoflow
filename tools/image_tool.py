import os
import base64
import re
from typing import Optional, Dict, Any
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from config import settings
from llm.gemini import get_gemini_llm

# Supported MIME types constraint
SUPPORTED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/heic",
    "image/heif",
}

# Maximum allowed file size: 5 MB (5 * 1024 * 1024 bytes)
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024


class ImageProcessInput(BaseModel):
    query: Optional[str] = Field(
        default="Analyze the image and answer the user's inquiry.",
        description="The specific question, analysis instruction, or information to extract from the image (e.g. 'Read all text in this receipt', 'Describe what is shown', 'Analyze the chart values')."
    )
    image_data: Optional[str] = Field(
        default=None,
        description="Base64-encoded image string or data URL (e.g. 'data:image/png;base64,...'). If omitted, analyzes the active uploaded photo from current conversation."
    )
    mime_type: Optional[str] = Field(
        default="image/png",
        description="MIME type of the image. Must be one of: image/png, image/jpeg, image/webp, image/heic, image/heif."
    )


# Module-level cached vision LLM instance
_vision_llm = None


def get_vision_llm():
    """Obtain or cache a multimodal Gemini LLM instance for image analysis."""
    global _vision_llm
    if _vision_llm is None:
        _vision_llm = get_gemini_llm(
            model_name=settings.GEMINI_MODEL,
            streaming=False,
        )
    return _vision_llm


# Global thread-safe cache for recently uploaded active image in current turn
_ACTIVE_TURN_IMAGE: Dict[str, Any] = {}


def set_active_turn_image(image_base64: str, mime_type: str = "image/png"):
    """Store the image uploaded in the current chat turn for tool access."""
    global _ACTIVE_TURN_IMAGE
    _ACTIVE_TURN_IMAGE = {
        "data": image_base64,
        "mime_type": mime_type,
    }


def get_active_turn_image() -> Optional[Dict[str, Any]]:
    """Retrieve the image uploaded in the current chat turn."""
    return _ACTIVE_TURN_IMAGE if _ACTIVE_TURN_IMAGE.get("data") else None


def clear_active_turn_image():
    """Clear active turn image."""
    global _ACTIVE_TURN_IMAGE
    _ACTIVE_TURN_IMAGE = {}


@tool("process_image", args_schema=ImageProcessInput)
async def process_image(
    query: Optional[str] = "Analyze the image and answer the user inquiry.",
    image_data: Optional[str] = None,
    mime_type: Optional[str] = "image/png",
) -> str:
    """Analyze photos, screenshots, diagrams, documents, or charts uploaded by the user to answer questions or extract text.
    
    Constraints:
    - Maximum file size: 5 MB.
    - Supported formats: image/png, image/jpeg, image/webp, image/heic, image/heif.
    """
    effective_query = (query or "").strip() or "Analyze the image and answer the user inquiry."
    raw_b64 = image_data
    chosen_mime = (mime_type or "image/png").lower().strip()

    # If image_data not passed directly, fetch active image uploaded in this turn
    if not raw_b64:
        active = get_active_turn_image()
        if active:
            raw_b64 = active["data"]
            chosen_mime = active.get("mime_type", chosen_mime)

    if not raw_b64:
        return (
            "Error: No image was provided or found in the current turn. "
            "Please upload an image (PNG, JPEG, WEBP, HEIC, or HEIF, under 5 MB) along with your question."
        )

    # 1. Normalize data URL format (e.g. "data:image/png;base64,iVBOR...")
    if raw_b64.startswith("data:"):
        match = re.match(r"^data:([^;]+);base64,(.*)$", raw_b64, re.DOTALL)
        if match:
            chosen_mime = match.group(1).lower().strip()
            raw_b64 = match.group(2).strip()

    # Normalize jpg to jpeg
    if chosen_mime == "image/jpg":
        chosen_mime = "image/jpeg"

    # 2. Constraint validation: Supported MIME types
    if chosen_mime not in SUPPORTED_MIME_TYPES:
        allowed_list = ", ".join(sorted(SUPPORTED_MIME_TYPES))
        return (
            f"Error: Unsupported MIME type '{chosen_mime}'. "
            f"AutoFlow Image Processor supports only: {allowed_list}."
        )

    # 3. Constraint validation: Maximum file size (5 MB)
    try:
        decoded_bytes = base64.b64decode(raw_b64)
        size_bytes = len(decoded_bytes)
        if size_bytes > MAX_FILE_SIZE_BYTES:
            size_mb = size_bytes / (1024 * 1024)
            return (
                f"Error: Image size ({size_mb:.2f} MB) exceeds the maximum allowed limit of 5.0 MB. "
                "Please compress or resize the photo and re-upload."
            )
    except Exception as e:
        return f"Error: Failed to decode base64 image data: {str(e)}"

    # 4. Invoke Gemini Multimodal Vision Analysis
    try:
        llm = get_vision_llm()
        data_url = f"data:{chosen_mime};base64,{raw_b64}"

        vision_prompt = (
            f"You are AutoFlow's specialized Multimodal Vision Analyzer.\n"
            f"User Question / Instruction: \"{effective_query}\"\n\n"
            f"Analyze the image carefully and provide a comprehensive, accurate response: "
            f"extract any visible text/OCR, detect objects, read chart data, or answer the user's specific inquiry. "
            f"Use rich Markdown with bullet points and code blocks if applicable."
        )

        message = HumanMessage(
            content=[
                {"type": "text", "text": vision_prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]
        )

        response = await llm.ainvoke([message])
        content = response.content

        # Handle structured parts from response
        if isinstance(content, list):
            text_chunks = []
            for part in content:
                if isinstance(part, str):
                    text_chunks.append(part)
                elif isinstance(part, dict) and "text" in part:
                    text_chunks.append(str(part["text"]))
                elif hasattr(part, "text") and part.text:
                    text_chunks.append(str(part.text))
            output_text = "\n".join(text_chunks).strip()
        else:
            output_text = str(content).strip()

        size_kb = round(size_bytes / 1024, 1)
        return f"### Image Analysis Result ({chosen_mime}, {size_kb} KB)\n\n{output_text}"

    except Exception as err:
        return f"Error during multimodal image processing: {str(err)}"
