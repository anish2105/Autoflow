from typing import List, Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from config import settings
from agent.chatbot_graph import get_graph_schema

router = APIRouter(prefix="/api/graph", tags=["Graph Visualizer"])


class GraphSchemaResponse(BaseModel):
    nodes: List[Dict[str, Any]] = Field(..., description="List of visual graph nodes (Start, Agent, Tools, End)")
    edges: List[Dict[str, Any]] = Field(..., description="Directed graph edges (direct, conditional, loop)")
    tools: List[Dict[str, str]] = Field(..., description="Available agent tools and metadata")
    model: str = Field(..., description="Configured Gemini LLM model identifier", example="gemini-3.5-flash-lite")
    features: List[str] = Field(..., description="Enabled system capabilities")


class ServerConfigResponse(BaseModel):
    model: str = Field(..., description="Active Google Gemini model name", example="gemini-3.5-flash-lite")
    temperature: float = Field(..., description="Sampling temperature configured for the LLM", example=0.7)
    api_key_configured: bool = Field(..., description="Whether GEMINI_API_KEY is present in environment", example=True)


@router.get(
    "/schema",
    response_model=GraphSchemaResponse,
    summary="Get Graph Topology Schema",
    description="""
### Overview
Returns the structured topology metadata of the AutoFlow LangGraph workflow for interactive visual canvas rendering.

### Output:
* `nodes`: Node configurations with IDs, visual labels, icons, and colors.
* `edges`: Directed connection edges between nodes (`direct`, `conditional`, `loop`).
* `tools`: Registered tools (`calculate`, `web_search`, `get_current_time`).
* `model`: Current LLM name.
"""
)
async def get_schema():
    """Returns the topological structure, nodes, edges, and tools of the LangGraph workflow."""
    return get_graph_schema()


@router.get(
    "/config",
    response_model=ServerConfigResponse,
    summary="Get Runtime Model Configuration",
    description="""
### Overview
Returns the active server runtime configuration, including the configured Gemini model, sampling temperature, and API key presence.
"""
)
async def get_config():
    """Returns runtime model and server configuration."""
    return {
        "model": settings.GEMINI_MODEL,
        "temperature": settings.GEMINI_TEMPERATURE,
        "api_key_configured": bool(settings.GEMINI_API_KEY),
    }
