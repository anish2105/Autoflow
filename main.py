import os
import warnings
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import uvicorn

# Suppress fixed sampling / temperature warnings from langchain_google_genai
warnings.filterwarnings("ignore", message=".*uses fixed sampling defaults.*")
warnings.filterwarnings("ignore", message=".*temperature will be ignored.*")

from config import settings
from routers import chat_router, graph_router, export_router, documents_router, admin_router, user_router, workflows_router

app = FastAPI(
    title="AutoFlow LangGraph Chatbot",
    description="LangGraph-powered AI Chatbot with Gemini LLM, dynamic node visualizer, and tool execution.",
    version="1.0.0",
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(chat_router)
app.include_router(graph_router)
app.include_router(export_router)
app.include_router(documents_router)
app.include_router(admin_router)
app.include_router(user_router)
app.include_router(workflows_router)


# Serve Frontend Static Assets
dist_dir = settings.FRONTEND_DIST
if dist_dir.exists() and (dist_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    async def root_placeholder():
        return HTMLResponse(
            f"""
            <html>
                <head><title>AutoFlow LangGraph Backend</title></head>
                <body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <div style="background:#1e293b;padding:30px;border-radius:12px;border:1px solid #334155;max-width:500px;text-align:center;">
                        <h2 style="color:#6366f1;">AutoFlow LangGraph API</h2>
                        <p>Backend is active with Gemini Model: <b>{settings.GEMINI_MODEL}</b></p>
                        <p style="color:#94a3b8;">Frontend is ready to be built or run in dev mode.</p>
                        <a href="/docs" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;margin-top:10px;">View Swagger API Docs</a>
                    </div>
                </body>
            </html>
            """
        )


def main():
    """Application runner entrypoint."""
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    main()
