from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio
from agent.manager import AgentManager
from agent.queue import QueueManager

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.chat_mode: Dict[WebSocket, str] = {}  # "chat" or "queue"
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        self.chat_mode[websocket] = "chat"
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        if websocket in self.chat_mode:
            del self.chat_mode[websocket]
            
    async def broadcast(self, message: dict):
        """Broadcast to all connected clients"""
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.add(connection)
        
        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)
    
    async def send_personal(self, message: dict, websocket: WebSocket):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except:
            self.disconnect(websocket)

manager = ConnectionManager()
agent_manager = AgentManager()
queue_manager = QueueManager()

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        # Send initial connection message
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
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "command":
                await handle_command(message.get("content", ""), websocket)
            elif message.get("type") == "chat":
                await handle_chat(message.get("content", ""), websocket)
            elif message.get("type") == "get_updates":
                # Send agent updates
                agents = await agent_manager.get_all_agents()
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

# Background task to broadcast agent updates
async def broadcast_agent_updates():
    """Periodically broadcast agent status updates"""
    while True:
        try:
            agents = await agent_manager.get_all_agents()
            await manager.broadcast({
                "type": "agent_update",
                "agents": agents
            })
        except Exception as e:
            print(f"Broadcast error: {e}")
        
        await asyncio.sleep(2)  # Update every 2 seconds
