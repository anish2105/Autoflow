import os
import re
from typing import Optional
from langchain_core.tools import tool
from firecrawl import Firecrawl
from config import settings


def get_firecrawl_api_key() -> str:
    """Retrieve Firecrawl API key from settings or environment."""
    return (
        settings.FIRECRAWL_API_KEY
        or os.getenv("Firecrawl_API_KEY", "")
        or os.getenv("FIRECRAWL_API_KEY", "")
    )


@tool
def web_scrape(url: str, only_main_content: bool = True) -> str:
    """Scrape, read, and extract clean markdown content from a specific webpage URL or online PDF using Firecrawl.
    Use this tool whenever the user provides a specific URL or link to inspect, read, summarize, or extract data from,
    or when deep, complete page content is required beyond quick search snippets.

    Args:
        url: The full web URL or online PDF URL to scrape (e.g. 'https://example.com/page' or 'https://site.com/doc.pdf').
        only_main_content: If True, extracts only the core main article body, stripping navigation, ads, and footers. Defaults to True.
    """
    api_key = get_firecrawl_api_key()
    if not api_key:
        return (
            "Error: Firecrawl API key is not configured. "
            "Please ensure 'Firecrawl_API_KEY' is set in your .env file."
        )

    # Ensure URL has proper scheme
    clean_url = url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = f"https://{clean_url}"

    try:
        print(f"[Tool:web_scrape] Scraping URL via Firecrawl: '{clean_url}' (only_main_content={only_main_content})...")
        app = Firecrawl(api_key=api_key)

        data = app.scrape(
            clean_url,
            only_main_content=only_main_content,
            max_age=172800000,
            parsers=["pdf"],
            formats=["markdown"]
        )

        # Extract markdown content from Document object or dictionary
        markdown_text = ""
        metadata = {}

        if hasattr(data, "markdown") and data.markdown:
            markdown_text = data.markdown
            metadata = getattr(data, "metadata", {}) or {}
        elif isinstance(data, dict):
            markdown_text = data.get("markdown") or data.get("data", {}).get("markdown", "")
            metadata = data.get("metadata") or data.get("data", {}).get("metadata", {})
        else:
            markdown_text = str(data)

        if not markdown_text or not markdown_text.strip():
            return f"Warning: No text or markdown content could be extracted from '{clean_url}'."

        title = ""
        if isinstance(metadata, dict):
            title = metadata.get("title") or metadata.get("og:title") or ""
        elif hasattr(metadata, "title"):
            title = getattr(metadata, "title", "") or ""

        # Safe truncation if content is massive to protect prompt context budget
        MAX_CHARS = 16000
        is_truncated = False
        if len(markdown_text) > MAX_CHARS:
            markdown_text = markdown_text[:MAX_CHARS]
            is_truncated = True

        result_header = [
            f"### Web Scrape Result from: {clean_url}",
        ]
        if title:
            result_header.append(f"**Page Title**: {title}")
        result_header.append(f"**Content Length**: {len(markdown_text)} characters" + (" (truncated for context)" if is_truncated else ""))
        result_header.append("-" * 40)

        return "\n".join(result_header) + "\n\n" + markdown_text

    except Exception as e:
        print(f"[Tool:web_scrape] Error scraping '{clean_url}': {e}")
        return f"Error scraping '{clean_url}' with Firecrawl: {str(e)}"
