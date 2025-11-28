# Performa - Autonomous CyberSec AI Agent System

## Overview
A sophisticated Next.js frontend with Python FastAPI backend system for autonomous cybersecurity operations. The system features multi-agent AI capabilities for security assessments, real-time monitoring, and automated threat detection.

## Recent Changes
- **2024-11-28**: Instruction History, Real-time Timer & API Error Fix
  - Added Instruction History panel in Agent Detail Dialog showing executed AI instructions
  - Instruction history API endpoints: `/api/agents/{id}/history` (per-agent) and `/api/history` (global)
  - Real-time instruction history updates with color-coded instruction types (command/decision/analysis)
  - Verified OpenRouter API connection - returns success with 859ms latency
  - **Fixed false 402 "Payment Required" error** - Removed overly aggressive error handling that triggered false positives
  - API is fully functional and processing requests without payment issues
  - Timer remains functional and updates in real-time for running agents

- **2024-11-28**: UI Responsiveness and Layout Improvements
  - Fixed Network resource display to auto-format large values (KB/s → MB/s → GB/s)
  - Changed Active Agents from grid layout to vertical list for better readability
  - Cleaned up execution time format to show consistent "00:00:00" format (HH:MM:SS)
  - Fixed decimal overflow in agent detail modal execution time display

- **2024-11-28**: UI Polish and Export Improvements
  - Simplified agent cards to focus on execution time with live timer
  - Created comprehensive agent detail modal with CPU/Memory monitoring charts (Recharts)
  - Updated findings export to support JSON, CSV, and PDF formats (removed HTML)
  - Added text report fallback when PDF generation is unavailable
  - Enhanced FindingCard UI with severity-based colors, badges, and layout improvements
  - Added CVSS score display and timestamp footer to findings

- **2024-11-28**: Agent Card and Real-time Updates Improvements
  - Replaced progress bar with execution time display in AgentCard component
  - Updated AgentCard styling to match ResourceMonitor with CPU/Memory bars
  - Added real-time agent status broadcasts via WebSocket (agent_status message type)
  - Fixed Model Instructions history persistence using dual localStorage strategy
  - Improved WebSocket message handling to properly merge updates without overwriting existing values
  - Added module-level psutil priming for non-blocking CPU/memory sampling
  - Fixed CPU metrics to accept 0% values as valid readings
  - Added caching for last known CPU/memory values as fallback

- **2024-11-28**: UI and Queue panel improvements
  - Removed CPU/Memory graphs from agent cards (now only in detail dialog) for cleaner interface
  - Fixed Queue panel buttons to use backend-supported commands: /queue list, /queue add {json}, /queue rm index, /queue edit
  - Added command format documentation in Queue tab
  - Removed unused AgentResourceGraph import
  - Fixed React key warning in FindingCard component

- **2024-11-28**: Added advanced monitoring features
  - Model Instructions History: New "History" tab in chat sidebar to track AI model commands sent to agents
  - OS Type Configuration: Added Linux/Windows selection in Mode tab for proper command execution
  - Mission Timer: Added timer component in navbar showing elapsed time during active missions with fallback for page reloads
  - Agent Resource Graphs: Real-time CPU and Memory monitoring graphs in agent detail dialog
  - Fixed chart dimension warnings by adding minWidth/minHeight constraints
  - Mission startTime now properly persists across state updates
  - Model instructions hook captures agent_update/agent_status WebSocket events for command history

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
  - Model Instructions History (tracks AI commands to agents)
  - Per-agent CPU and Memory resource graphs
  - Mission Timer with elapsed time display
  - OS Type configuration (Linux/Windows)
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
- WebSocket HMR warnings in development are cosmetic and don't affect functionality (this is Next.js dev server's hot reload, not the application's WebSocket)
- Chart dimension warnings during initial render are cosmetic - charts function correctly after data loads
- The application's actual WebSocket for real-time updates uses the `/ws/*` routes, which work properly
