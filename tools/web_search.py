import os
from langchain_core.tools import tool
from tavily import TavilyClient
from config import settings


@tool
def web_search(query: str, max_results: int = 5) -> str:
    """Search the web using Tavily Search API for accurate, up-to-date real-time information, research, news, and facts.
    
    Args:
        query: The search term, topic, or question to investigate on the web.
        max_results: Maximum number of search results to return (default 5).
    """
    api_key = settings.TAVILY_API_KEY or os.getenv("TAVILY_API_KEY", "")
    if not api_key:
        return "Error: TAVILY_API_KEY is not configured in .env file. Please provide a valid Tavily API key."

    try:
        print(f"[Tool:web_search] Executing web search for query: '{query}' (max_results={max_results})...")
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query,
            max_results=max_results,
            search_depth="basic",
            include_answer=True,
        )

        formatted = []

        # Include direct AI summary answer if Tavily provided one
        if response.get("answer"):
            formatted.append(f"### Quick Answer Summary:\n{response['answer']}\n")

        results = response.get("results", [])
        print(f"[Tool:web_search] Received {len(results)} search result(s) from Tavily.")
        if not results:
            return f"No search results found for query: '{query}'."

        formatted.append("### Detailed Sources:")
        for i, res in enumerate(results, 1):
            title = res.get("title", "No Title")
            url = res.get("url", "")
            content = res.get("content", "No content snippet available.")
            # Truncate overly long snippet to preserve prompt token budget
            if len(content) > 1000:
                content = content[:1000] + "..."
            score = res.get("score")
            score_str = f" (Relevance: {score:.2f})" if score is not None else ""

            formatted.append(f"[{i}] **{title}**{score_str}\n- **URL**: {url}\n- **Snippet**: {content}\n")

        return "\n".join(formatted)

    except Exception as e:
        print(f"[Tool:web_search] Error during search: {e}")
        return f"Error executing Tavily web search for '{query}': {str(e)}"
