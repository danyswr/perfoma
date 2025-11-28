# Performa - Autonomous CyberSec AI Agent System

## Overview
A sophisticated Next.js frontend with Python FastAPI backend system for autonomous cybersecurity operations. The system features multi-agent AI capabilities for security assessments, real-time monitoring, and automated threat detection.

## Recent Changes
- **2024-11-28**: Fixed agent state management issues
  - Fixed race condition where polling could overwrite newly created agents
  - Added isCreatingRef flag to prevent state overwrites during agent creation
  - Reduced polling frequency from 1s to 3s to prevent race conditions
  - Fixed health check flickering by only showing "checking" on initial load
  - Extended protection window for syncAgents (3s) and addAgent (2s)

- **2024-11-27**: Completed Replit environment setup
  - Installed Python 3.11 and all required dependencies
  - Configured Next.js for Replit's proxy environment (allowedDevOrigins)
  - Set up unified workflow running both frontend (port 5000) and backend (port 8000)
  - Added Next.js rewrites for API proxying
  - Configured deployment settings for VM deployment
  - Backend bound to 0.0.0.0:8000 for proper network accessibility
  - Frontend bound to 0.0.0.0:5000 for webview access

## Project Architecture

### Frontend (Next.js 16.0.3)
- **Framework**: Next.js with React 19 and TypeScript
- **UI Components**: Radix UI, Tailwind CSS, shadcn/ui components
- **Key Features**:
  - Real-time agent monitoring dashboard
  - Live chat interface for AI agents
  - Resource monitoring and visualization
  - Security findings panel with severity tracking
  - Mission configuration and control

### Backend (Python FastAPI)
- **Framework**: FastAPI with Uvicorn
- **Key Components**:
  - Multi-agent management system
  - WebSocket support for real-time updates
  - Resource monitoring (CPU, memory, disk)
  - Findings aggregation and reporting
  - Stealth operation capabilities (proxy, fingerprinting, timing)
- **AI Integration**: Supports OpenRouter and custom model endpoints

### Workflow Configuration
- **Development**: `bash run.sh` starts both services
  - Backend: localhost:8000 (internal)
  - Frontend: 0.0.0.0:5000 (exposed)
- **API Proxying**: Next.js rewrites `/api/*` and `/ws/*` to backend
- **Deployment**: Configured for VM deployment to maintain persistent connections

## Environment Variables
- `HOST`: Backend bind address (0.0.0.0)
- `PORT`: Backend port (8000)
- `OPENROUTER_API_KEY`: API key for OpenRouter models (required for agent operations)
- `LOG_DIR`: Directory for application logs (./logs)
- `FINDINGS_DIR`: Directory for security findings (./findings)
- `NEXT_PUBLIC_API_URL`: Empty (uses relative paths with rewrites)
- `NEXT_PUBLIC_WS_URL`: WebSocket URL for frontend

## Key Dependencies

### Python
- fastapi, uvicorn - Web framework and ASGI server
- websockets - Real-time communication
- psutil - System resource monitoring
- httpx, aiohttp - HTTP clients
- sqlalchemy, aiosqlite - Database ORM
- reportlab, matplotlib, weasyprint - Report generation
- openai, anthropic - AI model integrations

### Node.js
- next, react, react-dom - Frontend framework
- @radix-ui/* - UI component primitives
- tailwindcss - Utility-first CSS
- lucide-react - Icon library
- recharts - Data visualization

## User Preferences
- None specified yet

## Notes
- The system requires an OpenRouter API key to function (agents use LLMs for operation)
- Backend logs show successful API communication
- Frontend health checks are working (backend receiving /api/agents requests)
- WebSocket HMR warnings in development are cosmetic and don't affect functionality
