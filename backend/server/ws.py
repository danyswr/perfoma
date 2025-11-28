from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, Optional, List
import json
import asyncio
from datetime import datetime
import hashlib
from agent import get_agent_manager
from agent.queue import QueueManager

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.chat_mode: Dict[WebSocket, str] = {}
        self._broadcast_task: Optional[asyncio.Task] = None
        self._history_broadcast_task: Optional[asyncio.Task] = None
        self._last_history_hash: str = ""
        self._running = False
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        self.chat_mode[websocket] = "chat"
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        if websocket in self.chat_mode:
            del self.chat_mode[websocket]
        # Stop broadcast tasks if no clients remain
        if not self.active_connections:
            self._stop_broadcast_tasks()
            
    def _stop_broadcast_tasks(self):
        """Cancel broadcast tasks when no clients are connected"""
        self._running = False
        if self._broadcast_task and not self._broadcast_task.done():
            self._broadcast_task.cancel()
        if self._history_broadcast_task and not self._history_broadcast_task.done():
            self._history_broadcast_task.cancel()
        self._broadcast_task = None
        self._history_broadcast_task = None
            
    async def broadcast(self, message: dict):
        """Broadcast to all connected clients immediately"""
        if not self.active_connections:
            return
            
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.add(connection)
        
        for conn in dead_connections:
            self.disconnect(conn)
    
    async def send_personal(self, message: dict, websocket: WebSocket):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except:
            self.disconnect(websocket)
    
    def start_broadcast_task(self):
        """Start background broadcast tasks if not already running"""
        if self._running:
            return
        self._running = True
        if self._broadcast_task is None or self._broadcast_task.done():
            self._broadcast_task = asyncio.create_task(self._broadcast_agent_updates())
        if self._history_broadcast_task is None or self._history_broadcast_task.done():
            self._history_broadcast_task = asyncio.create_task(self._broadcast_history_updates())
    
    def _compute_history_hash(self, history: List[Dict]) -> str:
        """Compute hash of history to detect any changes (not just length)"""
        content = json.dumps(history, sort_keys=True, default=str)
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _broadcast_agent_updates(self):
        """Periodically broadcast agent status updates - fast interval for real-time feel"""
        agent_mgr = get_agent_manager()
        while self._running:
            try:
                if self.active_connections:
                    agents = await agent_mgr.get_all_agents()
                    await self.broadcast({
                        "type": "agent_update",
                        "agents": agents,
                        "timestamp": datetime.now().isoformat()
                    })
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Broadcast error: {e}")
            await asyncio.sleep(0.5)
    
    async def _broadcast_history_updates(self):
        """Periodically broadcast instruction history updates with content-based change detection"""
        agent_mgr = get_agent_manager()
        while self._running:
            try:
                if self.active_connections:
                    history = await agent_mgr.get_all_instruction_history()
                    # Get the last 20 entries for comparison and broadcast
                    recent_history = history[-20:] if history else []
                    current_hash = self._compute_history_hash(recent_history)
                    
                    # Broadcast if content changed (not just length)
                    if current_hash != self._last_history_hash:
                        self._last_history_hash = current_hash
                        await self.broadcast({
                            "type": "history_update",
                            "history": recent_history,
                            "total": len(history),
                            "timestamp": datetime.now().isoformat()
                        })
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"History broadcast error: {e}")
            await asyncio.sleep(0.5)

manager = ConnectionManager()
queue_manager = QueueManager()

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    manager.start_broadcast_task()
    
    agent_mgr = get_agent_manager()
    
    try:
        await manager.send_personal({
            "type": "system",
            "message": "Connected to Autonomous CyberSec AI Agent System",
            "mode": "chat",
            "commands": {
                "/chat": "Switch to chat mode",
                "/queue list": "List command queue",
                "/queue add": "Add command to queue",
                "/queue rm <index>": "Remove command from queue",
                "/queue edit <index>": "Edit command in queue"
            }
        }, websocket)
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "command":
                await handle_command(message.get("content", ""), websocket)
            elif message.get("type") == "chat":
                await handle_chat(message.get("content", ""), websocket)
            elif message.get("type") == "get_updates":
                agents = await agent_mgr.get_all_agents()
                await manager.send_personal({
                    "type": "agent_update",
                    "agents": agents
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

async def handle_command(content: str, websocket: WebSocket):
    """Handle special commands like /chat, /queue"""
    content = content.strip()
    
    if content == "/chat":
        manager.chat_mode[websocket] = "chat"
        await manager.send_personal({
            "type": "mode_change",
            "mode": "chat",
            "message": "Switched to chat mode. You can now chat with the AI model."
        }, websocket)
        
    elif content.startswith("/queue"):
        parts = content.split(maxsplit=2)
        
        if len(parts) == 1 or parts[1] == "list":
            # List queue
            queue_list = await queue_manager.list_queue()
            await manager.send_personal({
                "type": "queue_list",
                "queue": queue_list,
                "total": len(queue_list)
            }, websocket)
            
        elif parts[1] == "add" and len(parts) == 3:
            # Add to queue
            try:
                commands = json.loads(parts[2])
                await queue_manager.add_to_queue(commands)
                await manager.send_personal({
                    "type": "queue_add",
                    "message": "Commands added to queue",
                    "commands": commands
                }, websocket)
            except json.JSONDecodeError:
                await manager.send_personal({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
                
        elif parts[1] == "rm" and len(parts) == 3:
            # Remove from queue
            try:
                index = int(parts[2]) - 1  # Convert to 0-based
                removed = await queue_manager.remove_from_queue(index)
                await manager.send_personal({
                    "type": "queue_remove",
                    "message": f"Command removed from queue",
                    "removed": removed
                }, websocket)
            except ValueError:
                await manager.send_personal({
                    "type": "error",
                    "message": "Invalid index"
                }, websocket)
                
        elif parts[1] == "edit" and len(parts) == 3:
            # Edit queue item
            try:
                subparts = parts[2].split(maxsplit=1)
                index = int(subparts[0]) - 1  # Convert to 0-based
                commands = json.loads(subparts[1])
                await queue_manager.edit_queue(index, commands)
                await manager.send_personal({
                    "type": "queue_edit",
                    "message": f"Command edited in queue",
                    "index": index + 1,
                    "commands": commands
                }, websocket)
            except (ValueError, json.JSONDecodeError):
                await manager.send_personal({
                    "type": "error",
                    "message": "Invalid format. Use: /queue edit <index> {json}"
                }, websocket)
        else:
            await manager.send_personal({
                "type": "error",
                "message": "Unknown queue command"
            }, websocket)
    else:
        await manager.send_personal({
            "type": "error",
            "message": "Unknown command"
        }, websocket)

async def handle_chat(content: str, websocket: WebSocket):
    """Handle chat messages with AI model"""
    try:
        # Send to AI model for processing
        from models.router import ModelRouter
        model_router = ModelRouter()
        
        response = await model_router.chat(content)
        
        await manager.send_personal({
            "type": "chat_response",
            "message": response
        }, websocket)
    except Exception as e:
        await manager.send_personal({
            "type": "error",
            "message": f"Chat error: {str(e)}"
        }, websocket)

