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

class CreateAgentInput(BaseModel):
    target: str = ""
    category: str = "domain"
    custom_instruction: Optional[str] = None
    stealth_mode: bool = False
    aggressive_mode: bool = False
    model_name: str = "openai/gpt-4-turbo"

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

@router.post("/agents")
async def create_agent(data: CreateAgentInput):
    """Create a single agent manually"""
    try:
        agent_id = await agent_manager.create_single_agent(
            target=data.target,
            category=data.category,
            custom_instruction=data.custom_instruction,
            stealth_mode=data.stealth_mode,
            aggressive_mode=data.aggressive_mode,
            model_name=data.model_name
        )
        if not agent_id:
            raise HTTPException(status_code=400, detail="Maximum 10 agents allowed")
        
        agent = await agent_manager.get_agent(agent_id)
        return {
            "status": "created",
            "agent_id": agent_id,
            "agent": agent
        }
    except HTTPException:
        raise
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

@router.post("/models/test")
async def test_model(data: ModelTestInput):
    """Test connection to AI model"""
    try:
        result = await model_router.test_connection(data.provider, data.model, data.api_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ExploitInput(BaseModel):
    target: str
    stealth_mode: bool = False
    auth_token: Optional[str] = None

class SupplyChainInput(BaseModel):
    packages: List[str]
    registry: str = "npm"
    target_org: Optional[str] = None

@router.post("/exploits/cors")
async def test_cors(data: ExploitInput):
    """Test for CORS misconfigurations"""
    try:
        from exploits.cors_exploit import CORSExploiter
        exploiter = CORSExploiter(data.target, data.stealth_mode)
        results = await exploiter.auto_exploit()
        return {"status": "success", "findings": results, "report": exploiter.get_report()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exploits/ssrf")
async def test_ssrf(data: ExploitInput):
    """Test for SSRF vulnerabilities"""
    try:
        from exploits.ssrf_chain import SSRFChainer
        chainer = SSRFChainer(data.target, stealth_mode=data.stealth_mode)
        findings = await chainer.scan_ssrf()
        cloud_data = await chainer.exploit_cloud_metadata()
        return {"status": "success", "findings": findings, "cloud_metadata": cloud_data, "report": chainer.get_report()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exploits/waf-bypass")
async def test_waf_bypass(data: ExploitInput):
    """Test WAF bypass techniques"""
    try:
        from exploits.waf_bypass import WAFBypasser
        bypasser = WAFBypasser(data.target, data.stealth_mode)
        waf_detection = await bypasser.detect_waf()
        cloudflare_bypass = await bypasser.cloudflare_bypass()
        return {"status": "success", "waf_detection": waf_detection, "cloudflare_strategies": cloudflare_bypass, "report": bypasser.get_report()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exploits/access-control")
async def test_access_control(data: ExploitInput):
    """Test for broken access control vulnerabilities"""
    try:
        from exploits.access_control import AccessControlTester
        tester = AccessControlTester(data.target, data.auth_token, data.stealth_mode)
        idor_findings = await tester.scan_idor([data.target])
        method_bypass = await tester.test_http_method_bypass(data.target)
        chain_results = await tester.chain_payloads(data.target)
        return {"status": "success", "idor": idor_findings, "method_bypass": method_bypass, "chains": chain_results, "report": tester.get_report()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exploits/websocket")
async def test_websocket(data: ExploitInput):
    """Test for WebSocket vulnerabilities"""
    try:
        from exploits.websocket_hijack import WebSocketHijacker
        hijacker = WebSocketHijacker(data.target, data.stealth_mode)
        results = await hijacker.full_scan()
        hijack_payload = hijacker.generate_hijack_payload()
        return {"status": "success", "scan_results": results, "hijack_payload": hijack_payload, "report": hijacker.get_report()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exploits/supply-chain")
async def test_supply_chain(data: SupplyChainInput):
    """Test for supply chain vulnerabilities"""
    try:
        from exploits.supply_chain import SupplyChainAttacker
        attacker = SupplyChainAttacker(data.target_org)
        confusion = await attacker.check_dependency_confusion(data.packages, data.registry)
        typosquats = []
        for pkg in data.packages[:5]:
            typosquats.extend(await attacker.generate_typosquats(pkg, data.registry))
        return {"status": "success", "dependency_confusion": confusion, "typosquats": typosquats, "report": attacker.get_report()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exploits/deserialization")
async def generate_deserialization(language: str, gadget: str, command: str):
    """Generate deserialization exploit payloads"""
    try:
        from exploits.deserialization import DeserializationExploiter
        exploiter = DeserializationExploiter("")
        payload = exploiter.generate_payload(language, gadget, command)
        all_payloads = exploiter.get_all_payloads(language, command)
        return {"status": "success", "payload": payload, "all_payloads": all_payloads, "available_languages": list(exploiter.gadget_chains.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))