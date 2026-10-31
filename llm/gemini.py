import os
import warnings
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from config import settings

# Suppress fixed sampling / temperature warnings from langchain_google_genai
warnings.filterwarnings("ignore", message=".*uses fixed sampling defaults.*")
warnings.filterwarnings("ignore", message=".*temperature will be ignored.*")


def get_gemini_llm(
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    streaming: bool = True,
) -> ChatGoogleGenerativeAI:
    """Initialize and return a Google Gemini Chat LLM instance configured via config.py.
    
    Args:
        model_name: Optional override for the Gemini model name (defaults to settings.GEMINI_MODEL)
        temperature: Optional override for temperature (defaults to settings.GEMINI_TEMPERATURE)
        streaming: Whether to enable token-level streaming
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set. Please provide it in your .env file.")

    # Also export to environment so underlying Google GenAI clients find it seamlessly
    os.environ["GOOGLE_API_KEY"] = api_key
    os.environ["GEMINI_API_KEY"] = api_key

    model = model_name or settings.GEMINI_MODEL
    temp = temperature if temperature is not None else settings.GEMINI_TEMPERATURE

    # Flash-lite and fixed sampling models ignore temperature; pass None if using fixed sampling models
    is_fixed_sampling = any(name in model.lower() for name in ["flash-lite", "thinking"])
    llm_kwargs = {
        "model": model,
        "google_api_key": api_key,
        "streaming": streaming,
    }
    if not is_fixed_sampling:
        llm_kwargs["temperature"] = temp

    return ChatGoogleGenerativeAI(**llm_kwargs)
