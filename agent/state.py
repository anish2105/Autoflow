import operator
from typing import Annotated, Sequence, TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


def extract_text_content(content: Any) -> str:
    """Safely extracts text string from any LangChain message content (str, list of dicts, parts)."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict):
                if item.get("type") == "text" and "text" in item and item["text"] is not None:
                    text_parts.append(str(item["text"]))
                elif "text" in item and item["text"] is not None:
                    text_parts.append(str(item["text"]))
                elif "content" in item and item["content"] is not None:
                    text_parts.append(str(item["content"]))
            elif hasattr(item, "text") and item.text:
                text_parts.append(str(item.text))
            elif hasattr(item, "content") and item.content:
                text_parts.append(str(item.content))
        return "".join(text_parts)
    if isinstance(content, dict):
        if "text" in content and content["text"] is not None:
            return str(content["text"])
        if "content" in content and content["content"] is not None:
            return str(content["content"])
    return str(content)


class ValidationResult(TypedDict, total=False):
    """Validation output evaluating evidence sufficiency and quality."""
    sufficient: bool
    completeness_score: float
    confidence: float
    missing_information: List[str]
    issues: List[str]
    critique: str


class ExecutionStep(TypedDict, total=False):
    """Structured observability log for each node and tool execution."""
    step_id: int
    node: str
    type: str  # 'agent', 'tool', 'validator', 'synthesizer'
    action: Optional[str]
    input: Optional[Dict[str, Any]]
    output: Optional[Dict[str, Any]]
    status: str  # 'success', 'running', 'failed', 'insufficient', 'completed'
    latency_ms: Optional[float]
    iteration: int
    parent_step_id: Optional[int]
    timestamp: str
    details: Optional[Dict[str, Any]]


class AgentState(TypedDict):
    """The multi-agent state with conversation memory, parallel tools, and validation quality gate."""
    # 1. Conversation turns with LangGraph message reducer
    messages: Annotated[Sequence[BaseMessage], add_messages]
    
    # 2. Node & workflow tracking
    current_node: str
    status: str
    
    # 3. Research goal & accumulated evidence
    research_goal: Optional[str]
    evidence: List[Dict[str, Any]]
    
    # 4. Tool execution details
    last_tool_call: Optional[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]
    
    # 5. Validation gate
    validation: ValidationResult
    
    # 6. Safety & loop bounds
    iteration_count: int
    max_iterations: int
    
    # 7. Step-by-step trace log with operator.add reducer
    execution_steps: Annotated[List[ExecutionStep], operator.add]

    # 8. Persistent conversation summary & condensation tracking
    summary: Optional[str]
    summarized_message_count: Optional[int]

    # 9. Dynamic tool enablement (filtered by user toggle preferences)
    enabled_tools: Optional[List[str]]

    # 10. Trusted Document RAG context (injected from chat state)
    selected_file_ids: Optional[List[str]]
    retrieved_chunks: Optional[List[Dict[str, Any]]]

    # 11. Custom workflow configuration (Agent Builder)
    system_prompt_prefix: Optional[str]

