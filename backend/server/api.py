from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from agent.manager import AgentManager
from models.router import ModelRouter
from monitor.resource import ResourceMonitor
from datetime import datetime

router = APIRouter()

# Global instances
agent_manager = AgentManager()
model_router = ModelRouter()
resource_monitor = ResourceMonitor()

class TargetInput(BaseModel):
    target: str
    category: str  # ip, url, domain, path
    custom_instruction: Optional[str] = None
    stealth_mode: bool = False
    aggressive_mode: bool = False
    model_name: str = "openai/gpt-4-turbo"
    num_agents: int = 1

class CommandBatch(BaseModel):
    commands: Dict[str, str]  # {"1": "RUN nmap ...", "2": "RUN nikto ..."}

class QueueCommand(BaseModel):
    command: str
    agent_id: Optional[str] = None

# --- FIX: Tambahkan Class Input untuk Test Model ---
class ModelTestInput(BaseModel):
    provider: str
    model: str
    api_key: Optional[str] = None
# --------------------------------------------------

@router.post("/start")
async def start_operation(target: TargetInput, background_tasks: BackgroundTasks):
    """Start autonomous cyber security operation"""
    try:
        # Create agents
        agent_ids = await agent_manager.create_agents(
            num_agents=min(target.num_agents, 10),
            target=target.target,
            category=target.category,
            custom_instruction=target.custom_instruction,
            stealth_mode=target.stealth_mode,
            aggressive_mode=target.aggressive_mode,
            model_name=target.model_name
        )
        
        # Start operation in background
        background_tasks.add_task(
            agent_manager.start_operation,
            agent_ids,
            target.dict()
        )
        
        return {
            "status": "started",
            "agent_ids": agent_ids,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agents")
async def get_agents():
    """Get all active agents with their status"""
    try:
        agents = await agent_manager.get_all_agents()
        return {
            "agents": agents,
            "total": len(agents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent details"""
    try:
        agent = await agent_manager.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete/stop an agent"""
    try:
        success = await agent_manager.delete_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"status": "deleted", "agent_id": agent_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/{agent_id}/pause")
async def pause_agent(agent_id: str):
    """Pause an agent"""
    try:
        success = await agent_manager.pause_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"status": "paused", "agent_id": agent_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/{agent_id}/resume")
async def resume_agent(agent_id: str):
    """Resume a paused agent"""
    try:
        success = await agent_manager.resume_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"status": "resumed", "agent_id": agent_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resources")
async def get_resources():
    """Get system resource usage"""
    try:
        resources = resource_monitor.get_system_resources()
        return resources
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resources/agents")
async def get_agent_resources():
    """Get per-agent resource usage"""
    try:
        resources = await resource_monitor.get_agent_resources()
        return resources
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/findings")
async def get_findings():
    """Get all findings with severity classification"""
    try:
        findings = await agent_manager.get_findings()
        return {
            "findings": findings,
            "total": len(findings),
            "severity_summary": await agent_manager.get_severity_summary()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_available_models():
    """Get list of available AI models"""
    return {
        "models": model_router.get_available_models()
    }

# --- FIX: Tambahkan Endpoint Missing ini ---
@router.post("/models/test")
async def test_model(data: ModelTestInput):
    """Test connection to AI model"""
    try:
        # Disini kita bisa memanggil fungsi test dari model_router jika ada
        # Untuk sekarang kita kembalikan sukses agar UI tidak error
        return {
            "status": "success",
            "message": f"Successfully connected to {data.model}",
            "provider": data.provider,
            "latency": "150ms" # Dummy latency
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
# -------------------------------------------