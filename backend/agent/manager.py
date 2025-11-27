import asyncio
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
from agent.worker import AgentWorker
from agent.queue import QueueManager
from monitor.log import Logger
from monitor.resource import ResourceMonitor
import json

class AgentManager:
    """Manages multiple autonomous agents"""
    
    def __init__(self):
        self.agents: Dict[str, AgentWorker] = {}
        self.queue_manager = QueueManager()
        self.logger = Logger()
        self.resource_monitor = ResourceMonitor()
        self.shared_knowledge: Dict[str, Any] = {
            "findings": [],
            "messages": [],
            "vulnerabilities": []
        }
        self.operation_active = False
        
    async def create_agents(
        self,
        num_agents: int,
        target: str,
        category: str,
        custom_instruction: Optional[str],
        stealth_mode: bool,
        aggressive_mode: bool,
        model_name: str,
        stealth_config: Optional[Dict] = None
    ) -> List[str]:
        """Create multiple agents for operation"""
        agent_ids = []
        
        if stealth_config is None and stealth_mode:
            from server.config import settings
            stealth_config = {
                "proxies": settings.get_proxy_list(),
                "ua_strategy": settings.UA_ROTATION_STRATEGY,
                "timing_strategy": settings.TIMING_STRATEGY,
                "proxy_strategy": settings.PROXY_STRATEGY,
                "enable_obfuscation": settings.ENABLE_TRAFFIC_OBFUSCATION,
                "min_delay": settings.DEFAULT_DELAY_MIN * 2,  # Double for stealth
                "max_delay": settings.DEFAULT_DELAY_MAX * 3,
            }
        
        for i in range(num_agents):
            agent_id = f"agent-{uuid.uuid4().hex[:8]}"
            
            agent = AgentWorker(
                agent_id=agent_id,
                agent_number=i + 1,
                target=target,
                category=category,
                custom_instruction=custom_instruction,
                stealth_mode=stealth_mode,
                aggressive_mode=aggressive_mode,
                model_name=model_name,
                shared_knowledge=self.shared_knowledge,
                logger=self.logger,
                stealth_config=stealth_config
            )
            
            self.agents[agent_id] = agent
            agent_ids.append(agent_id)
            
            await self.logger.log_event(
                f"Agent {agent_id} created",
                "system",
                {"agent_number": i + 1, "target": target}
            )
        
        return agent_ids
    
    async def start_operation(self, agent_ids: List[str], config: Dict):
        """Start autonomous operation with all agents"""
        self.operation_active = True
        
        await self.logger.log_event(
            "Operation started",
            "system",
            {"num_agents": len(agent_ids), "config": config}
        )
        
        # Start all agents concurrently
        tasks = []
        for agent_id in agent_ids:
            if agent_id in self.agents:
                agent = self.agents[agent_id]
                tasks.append(agent.start())
        
        # Run all agents
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Generate final report
        await self.generate_report()
        
        self.operation_active = False
        
        await self.logger.log_event(
            "Operation completed",
            "system",
            {"num_agents": len(agent_ids)}
        )
    
    async def get_all_agents(self) -> List[Dict]:
        """Get status of all agents"""
        agents_status = []
        
        for agent_id, agent in self.agents.items():
            status = await agent.get_status()
            # Add resource usage
            resources = await self.resource_monitor.get_agent_resource(agent_id)
            status["resources"] = resources
            agents_status.append(status)
        
        return agents_status
    
    async def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get specific agent status"""
        if agent_id not in self.agents:
            return None
        
        agent = self.agents[agent_id]
        status = await agent.get_status()
        resources = await self.resource_monitor.get_agent_resource(agent_id)
        status["resources"] = resources
        
        return status
    
    async def delete_agent(self, agent_id: str) -> bool:
        """Stop and delete an agent"""
        if agent_id not in self.agents:
            return False
        
        agent = self.agents[agent_id]
        await agent.stop()
        del self.agents[agent_id]
        
        await self.logger.log_event(
            f"Agent {agent_id} deleted",
            "system"
        )
        
        return True
    
    async def pause_agent(self, agent_id: str) -> bool:
        """Pause an agent"""
        if agent_id not in self.agents:
            return False
        
        agent = self.agents[agent_id]
        await agent.pause()
        
        return True
    
    async def resume_agent(self, agent_id: str) -> bool:
        """Resume a paused agent"""
        if agent_id not in self.agents:
            return False
        
        agent = self.agents[agent_id]
        await agent.resume()
        
        return True
    
    async def get_findings(self) -> List[Dict]:
        """Get all findings from shared knowledge base"""
        return self.shared_knowledge.get("findings", [])
    
    async def get_severity_summary(self) -> Dict:
        """Get summary of findings by severity"""
        findings = self.shared_knowledge.get("findings", [])
        
        summary = {
            "Critical": 0,
            "High": 0,
            "Medium": 0,
            "Low": 0,
            "Info": 0
        }
        
        for finding in findings:
            severity = finding.get("severity", "Info")
            if severity in summary:
                summary[severity] += 1
        
        return summary
    
    async def generate_report(self):
        """Generate final report of all findings"""
        from monitor.log import ReportGenerator
        
        report_gen = ReportGenerator(self.shared_knowledge)
        
        # Generate PDF report
        pdf_path = await report_gen.generate_pdf()
        
        # Generate HTML report
        html_path = await report_gen.generate_html()
        
        # Export JSON
        json_path = await report_gen.export_json()
        
        await self.logger.log_event(
            "Reports generated",
            "system",
            {
                "pdf": pdf_path,
                "html": html_path,
                "json": json_path
            }
        )
        
        return {
            "pdf": pdf_path,
            "html": html_path,
            "json": json_path
        }
