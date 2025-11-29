# Performa - Autonomous CyberSec AI Agent System

## Overview
A sophisticated Next.js frontend with Python FastAPI backend system for autonomous cybersecurity operations. The system features multi-agent AI capabilities for security assessments, real-time monitoring, and automated threat detection.

## Recent Changes
- **2024-11-29**: Comprehensive Memory Optimization ✅
  - ✅ OPTIMIZED: Worker.py agent memory with strict limits
    - context_history: 6 items max (auto-trimmed)
    - execution_history: 15 items max
    - instruction_history: 10 items max
    - GC runs every 5 iterations with forced collection
  - ✅ OPTIMIZED: Collaboration.py message bus limits
    - Message queue: 100 messages per agent max
    - Shared discoveries: 50 items max
    - Completed tasks: 100 items max (uses set)
  - ✅ OPTIMIZED: Shared_queue.py instruction limits
    - Pending instructions: 50 max
    - Executed history: 25 items max
    - Result content: 500 chars max
  - ✅ OPTIMIZED: Throttle.py auto-cleanup for stale states
    - Agent states: 15 max, stale after 5 minutes, cleanup every 30s
    - Rate limiter model states: 10 max, stale after 10 minutes, cleanup every 60s
  - ✅ OPTIMIZED: Cache TTL reduced from 2.0s to 1.0s
  - STATUS: System now runs with bounded memory growth across all subsystems

- **2024-11-29**: UI Improvements & Ollama Support ✅
  - ✅ ADDED: Ollama local model support in AI provider list
    - New _generate_ollama() function in models/router.py
    - OLLAMA_HOST environment variable for custom Ollama endpoint
    - Fixed provider detection order - Ollama checked before OpenRouter fallback
  - ✅ FIXED: Double input bug in queue chat sidebar
    - Chat tab now has its own input, queue tab has its own "Add Command" input
    - Separated sidebarTab === "chat" condition for form visibility
  - ✅ ADDED: Findings popup dialog with detailed report view
    - Click on any finding to see full details in popup
    - Shows: severity, CVSS score, CVE, title, description, technical details, remediation
    - Color-coded severity indicators (critical=red, high=orange, medium=yellow, etc.)
  - ✅ CONFIRMED: Timer correctly stops when agent is not running
    - useEffect only runs interval when agent.status === "running"
  - STATUS: UI polished with better UX for findings and chat interactions

- **2024-11-29**: Shared Instruction Queue System & Real-Time Updates ✅
  - ✅ ADDED: Global shared instruction queue (backend/agent/shared_queue.py)
    - All agents compete for next available instruction from single queue
    - Queue format: {"1": "RUN cmd1", "2": "RUN cmd2", ...} sequential keys
    - Thread-safe with asyncio locks - fixed deadlock by notifying listeners after lock release
    - Methods: add_instruction, claim_next, complete_instruction, fail_instruction
  - ✅ CHANGED: Model predicts 5-10 sequential instructions at once (token efficient)
    - Reduces API calls by generating batch commands in one request
    - Agents pick commands from shared queue as they become available
  - ✅ IMPROVED: WebSocket real-time queue broadcasts (200ms intervals)
    - Frontend receives queue state updates: pending, executing, completed counts
    - Real-time instruction queue panel in sidebar
  - ✅ ADDED: Queue display component in sidebar
    - Shows pending instructions with sequential numbering
    - Displays executing instructions with agent assignment
    - Color-coded status indicators
  - ✅ CHANGED: Execution time format from HH:MM:SS to MM:SS
  - ✅ REMOVED: Per-agent rate limiting (kept only for models)
  - STATUS: Agents now share global instruction queue with real-time updates

- **2024-11-29**: Findings Organization & Real-Time Event Broadcasting ✅
  - ✅ CHANGED: Findings organized by target folder (e.g., findings/porsche.com/)
    - Each target gets its own folder with clean TXT files
    - Format: findings/{target}/findings_YYYYMMDD.txt
  - ✅ REMOVED: HTML report generation (cluttered & unnecessary)
  - ✅ ADDED: Clean TXT report generation
    - Format: findings/{target}/report_YYYYMMDD_HHMMSS.txt
    - Clean, readable format with severity levels
  - ✅ KEPT: JSON and PDF report formats
    - findings/{target}/findings_YYYYMMDD_HHMMSS.json
    - findings/{target}/report_YYYYMMDD_HHMMSS.pdf
  - ✅ CHANGED: Real-time event broadcasting system
    - Separate event types: "command", "found", "execute", "model_output", "info"
    - History limited to 15 most recent items (not 100)
    - Found findings show severity level with color coding (critical=red pulse)
  - ✅ CHANGED: Model output format - batch JSON with 3-10 commands
    - Model generates 3 batches with multiple commands per batch
    - Agent queues commands and executes them one-by-one
    - Next model call only after all commands executed (token efficient)
  - ✅ FIXED: New agent mid-execution - pulls commands from shared queue
    - get_agent_commands() allows new agents to pick up pending work
  - STATUS: System now produces clean, organized findings with real-time broadcasting

- **2024-11-29**: Batch JSON Commands & Target-Filtered Findings ✅
  - ✅ CHANGED: Model output format changed to strict JSON batch commands (3 batches, 3 commands each)
    - Format: `{"batch_1": {"1": "RUN cmd", "2": "RUN cmd2"}, "batch_2": {...}, "batch_3": {...}}`
    - Agents extract only their commands based on agent_number
    - Supports `{"status": "END"}` for mission completion
  - ✅ ADDED: Target-filtered findings in memory.py
    - `get_findings_for_target(agent_id, target)` - retrieves findings for specific target only
    - `get_target_context(agent_id, target)` - gets full context including findings, knowledge, and history
  - ✅ FIXED: False credit error handling in models/router.py
    - Now validates actual credit-related keywords before raising "Insufficient credits"
  - ✅ IMPROVED: Per-agent queue separation in queue_distributor.py
    - Each agent has independent queue with async locks
    - Duplicate command prevention across batches
    - Agents don't wait for each other's queue operations
  - ✅ CHANGED: Instruction history now shows only commands, not full model responses
    - `get_instruction_history()` returns only extracted commands
    - `_save_instruction_to_history()` stores command per entry
  - STATUS: System optimized for token efficiency and multi-target operations

- **2024-11-28**: Advanced Agent Intelligence Features ✅
  - ✅ ADDED: SQLite-based persistent memory system (agent/memory.py)
    - Conversation history, findings, knowledge base storage
    - Async operations using aiosqlite for non-blocking database access
  - ✅ ADDED: Intelligent throttling mechanism (agent/throttle.py)
    - Resource monitoring with async thread pool execution (no event loop blocking)
    - ThrottleLevel enum: NONE, LIGHT, MODERATE, HEAVY, PAUSE
    - 2-second cache for resource metrics to reduce overhead
  - ✅ ADDED: Inter-agent collaboration system (agent/collaboration.py)
    - Message bus for agent-to-agent communication
    - Shared knowledge base with multi-agent contributions
    - Support for discovery sharing, task requests, and alerts
  - ✅ ADDED: Rate limiting for AI model calls (token bucket algorithm)
    - Prevents API rate limit errors with adaptive delays
    - Exponential backoff strategy for failed calls
  - ✅ FIXED: Thread-safe singleton initialization with double-checked locking
  - ✅ FIXED: Removed SQLite UNIQUE constraints for multi-agent knowledge sharing
  - STATUS: Agent system now supports persistent memory, collaboration, and intelligent resource management

- **2024-11-28**: OpenRouter Full Integration - All Models Available ✅
  - ✅ CHANGED: ModelRouter now uses OpenRouter as primary provider for all models
  - ✅ CHANGED: All models available through OpenRouter (GPT-4, Claude, Gemini, Llama, etc.)
  - ✅ CHANGED: Default model set to GPT-4 Turbo (freely selectable by users)
  - ✅ CHANGED: Frontend model labels updated to show "OpenRouter" provider
  - ✅ CHANGED: Backend startup shows OpenRouter as primary required key
  - ✅ IMPROVED: Optional fallback to direct APIs if Anthropic/OpenAI keys are configured
  - STATUS: System uses OpenRouter - users can freely choose any available model

- **2024-11-28**: Final Session - All Systems Fixed & Operational ✅
  - ✅ FIXED: Restored worker.py with complete AgentWorker class
  - ✅ FIXED: Reconstructed tools/allowed_tools.py with correct dict structure (17 categories)
  - ✅ VERIFIED: Backend API responding correctly (/api/agents, /api/tools/categories)
  - ✅ VERIFIED: All 368+ security tools loaded and categorized
  - ✅ VERIFIED: Tools API endpoints fully functional
  - ✅ Created comprehensive tools registry with 368+ allowed security tools across 17 categories
  - ✅ Implemented per-agent queue distribution system (queue_distributor.py)
  - ✅ Agent command validation against allowed tools before execution
  - ✅ Dangerous command blocklist: rm -rf, mkfs, chmod 777, reboot, shutdown, etc.
  - ✅ Per-agent task queue for non-blocking parallel execution
  - STATUS: System is operational and ready for agent deployment

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
  - Real-time event broadcast history (15 most recent)
  - Event types: command, found (with severity colors), execute, model_output, info
  - Live chat interface for AI agents
  - Model Instructions History with color-coded event types
  - Per-agent CPU and Memory resource graphs
  - Mission Timer with elapsed time display
  - OS Type configuration (Linux/Windows)
  - Security findings panel with severity tracking
  - Mission configuration and control

### Backend (Python FastAPI)
- **Framework**: FastAPI with Uvicorn
- **Key Components**:
  - Multi-agent management system
  - WebSocket support for real-time broadcast events
  - Resource monitoring (CPU, memory, disk)
  - Findings aggregation by target folder
  - Batch command generation & execution
  - Queue-based command distribution
  - Stealth operation capabilities
- **AI Integration**: OpenRouter primary provider (Claude, GPT-4, Gemini, Llama, etc.)

### Findings Organization
- **Structure**: findings/{target_name}/{files}
  - findings/porsche.com/findings_20241129.txt
  - findings/porsche.com/report_20241129_120530.txt
  - findings/porsche.com/findings_20241129_120530.json
  - findings/porsche.com/report_20241129_120530.pdf
- **No HTML reports** - Clean TXT, JSON, PDF only

## Workflow Configuration
- **Development**: `bash run.sh` starts both services
  - Backend: localhost:8000 (internal)
  - Frontend: 0.0.0.0:5000 (exposed)
- **API Proxying**: Next.js rewrites `/api/*` and `/ws/*` to backend
- **Deployment**: Configured for VM deployment to maintain persistent connections

## Environment Variables
- `OPENROUTER_API_KEY`: **Required** - API key for OpenRouter models (all agents use this)
- `ANTHROPIC_API_KEY`: Optional - Direct API key for Claude models (bypasses OpenRouter if set)
- `OPENAI_API_KEY`: Optional - Direct API key for GPT models (bypasses OpenRouter if set)
- `HOST`: Backend bind address (0.0.0.0)
- `PORT`: Backend port (8000)
- `LOG_DIR`: Directory for application logs (./logs)
- `FINDINGS_DIR`: Directory for findings (./findings)
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
- Clean, organized findings (no HTML clutter)
- Separate folders for each target
- TXT/JSON/PDF reports only
- Real-time event broadcasting with clear labels
- History limited to 15 recent items (not overwhelming)
- Token-efficient model output (batch commands)

## Notes
- Findings organized by target in findings/{target_name}/ folders
- Each target has clean TXT log files plus JSON/PDF reports
- Real-time WebSocket broadcasts show events: command, found (with severity), execute, info
- Model generates 3-10 commands in batch, agent queues and executes them one-by-one
- New agents can pick up pending commands from queue mid-execution
- Rate limiting with adaptive delays prevents API errors
