from tools.calculator import calculate
from tools.web_search import web_search
from tools.web_scrape import web_scrape
from tools.time_tool import get_current_time
from tools.image_tool import process_image, set_active_turn_image, get_active_turn_image, clear_active_turn_image
from tools.txt_exporter import export_chat_txt, create_txt_export
from tools.pdf_exporter import export_chat_pdf, create_pdf_export
from tools.excel_exporter import export_chat_excel, create_excel_export
from tools.rag_retrieval_tool import (
    retrieve_document_context,
    set_active_turn_files,
    get_active_turn_files,
    clear_active_turn_files,
)

ALL_TOOLS = [
    calculate,
    web_search,
    web_scrape,
    get_current_time,
    process_image,
    export_chat_txt,
    export_chat_pdf,
    export_chat_excel,
    retrieve_document_context,
]

__all__ = [
    "calculate",
    "web_search",
    "web_scrape",
    "get_current_time",
    "process_image",
    "export_chat_txt",
    "export_chat_pdf",
    "export_chat_excel",
    "retrieve_document_context",
    "create_txt_export",
    "create_pdf_export",
    "create_excel_export",
    "set_active_turn_image",
    "get_active_turn_image",
    "clear_active_turn_image",
    "set_active_turn_files",
    "get_active_turn_files",
    "clear_active_turn_files",
    "ALL_TOOLS",
]

