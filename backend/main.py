import asyncio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.api import router as api_router
from server.ws import router as ws_router
from server.config import settings
from monitor.log import setup_logging
import os

# Create necessary directories
os.makedirs(settings.LOG_DIR, exist_ok=True)
os.makedirs(settings.FINDINGS_DIR, exist_ok=True)

# Setup logging
setup_logging()

app = FastAPI(
    title="Autonomous CyberSec AI Agent System",
    description="Multi-agent AI system for cyber security operations",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api", tags=["api"])
app.include_router(ws_router, prefix="/ws", tags=["websocket"])

@app.on_event("startup")
async def startup_event():
    print("🚀 Autonomous CyberSec AI Agent System Starting...")
    print(f"📁 Log Directory: {settings.LOG_DIR}")
    print(f"📁 Findings Directory: {settings.FINDINGS_DIR}")
    print(f"🔑 OpenRouter API Key: {'✓ Configured' if settings.OPENROUTER_API_KEY else '✗ Missing'}")

@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Shutting down Autonomous CyberSec AI Agent System...")

@app.get("/")
async def root():
    return {
        "message": "Autonomous CyberSec AI Agent System API",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info"
    )
