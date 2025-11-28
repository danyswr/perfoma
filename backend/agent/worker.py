import asyncio
import time
import random
from typing import Dict, List, Optional, Any
from datetime import datetime
from agent.executor import CommandExecutor
from models.router import ModelRouter
from monitor.log import Logger
from tools import is_tool_allowed, is_dangerous_command, get_allowed_tools_by_category
import re
import json

from agent.memory import get_memory, AgentMemory
from agent.throttle import IntelligentThrottler, RateLimiter, ThrottleLevel
from agent.collaboration import (
    InterAgentCommunication, KnowledgeBase, AgentCapability, 
    MessageType, Priority, AgentMessage
)
import threading

_shared_throttler = None
_shared_rate_limiter = None
_shared_agent_comm = None
_shared_knowledge_base = None
_init_lock = threading.Lock()

def _get_shared_instances():
    """Get or create shared instances with proper thread-safe locking"""
    global _shared_throttler, _shared_rate_limiter, _shared_agent_comm, _shared_knowledge_base
    
    if _shared_throttler is not None:
        return _shared_throttler, _shared_rate_limiter, _shared_agent_comm, _shared_knowledge_base
    
    with _init_lock:
        if _shared_throttler is None:
            _shared_throttler = IntelligentThrottler()
            _shared_rate_limiter = RateLimiter()
            _shared_agent_comm = InterAgentCommunication()
            _shared_knowledge_base = KnowledgeBase()
    
    return _shared_throttler, _shared_rate_limiter, _shared_agent_comm, _shared_knowledge_base

try:
    import psutil
    PSUTIL_AVAILABLE = True
    psutil.cpu_percent(interval=None)
except ImportError:
    PSUTIL_AVAILABLE = False
    psutil = None

class AgentWorker:
    """Individual autonomous agent worker with SQLite memory, intelligent throttling, and collaboration"""
    
    def __init__(
        self,
        agent_id: str,
        agent_number: int,
        target: str,
        category: str,
        custom_instruction: Optional[str],
        stealth_mode: bool,
        aggressive_mode: bool,
        model_name: str,
        shared_knowledge: Dict,
        logger: Logger,
        stealth_config: Optional[Dict] = None,
        os_type: str = "linux",
        stealth_options: Optional[Dict] = None,
        capabilities: Optional[Dict] = None
    ):
        self.agent_id = agent_id
        self.agent_number = agent_number
        self.target = target
        self.category = category
        self.custom_instruction = custom_instruction
        self.stealth_mode = stealth_mode
        self.aggressive_mode = aggressive_mode
        self.model_name = model_name
        self.shared_knowledge = shared_knowledge
        self.logger = logger
        self.os_type = os_type
        self.stealth_options = stealth_options or {}
        self.capabilities = capabilities or {}
        
        self.executor = CommandExecutor(agent_id, stealth_mode, stealth_config, target, os_type)
        self.model_router = ModelRouter()
        
        self.status = "idle"
        self.start_time = None
        self.last_execute = "Not started"
        self.execution_history: List[Dict] = []
        self.context_history: List[Dict] = []
        self.instruction_history: List[Dict] = []
        self.paused = False
        self.stopped = False
        
        self._last_cpu_usage: Optional[float] = None
        self._last_memory_usage: Optional[int] = None
        
        self.memory: AgentMemory = get_memory()
        throttler, rate_limiter, agent_comm, knowledge_base = _get_shared_instances()
        self.throttler = throttler
        self.rate_limiter = rate_limiter
        self.agent_comm = agent_comm
        self.knowledge_base = knowledge_base
        
        self._specializations = self._determine_specializations()
        
    def _determine_specializations(self) -> List[str]:
        """Determine agent specializations based on category and capabilities"""
        spec_map = {
            "domain": ["network_recon", "osint", "subdomain_enum"],
            "ip": ["network_recon", "port_scanning", "service_enum"],
            "url": ["web_scanning", "vuln_scanning", "directory_enum"],
            "file": ["static_analysis", "code_review"]
        }
        return spec_map.get(self.category, ["general"])
        
    async def start(self):
        """Start agent execution with memory, throttling, and collaboration initialization"""
        self.status = "running"
        self.start_time = time.time()
        
        await self._initialize_systems()
        
        await self.logger.log_event(
            f"Agent {self.agent_id} started",
            "agent",
            {"agent_number": self.agent_number, "target": self.target or "no target"}
        )
        
        if not self.target:
            self.last_execute = "Agent ready, awaiting target assignment"
            self.status = "idle"
            await self.logger.log_event(
                f"Agent {self.agent_id} running in standby mode (no target)",
                "agent",
                {"agent_id": self.agent_id}
            )
            await self._broadcast_status_update()
            return
        
        self.last_execute = f"Initializing analysis of {self.target}..."
        await self._broadcast_status_update()
        
        try:
            await self._run_autonomous_loop()
        except Exception as e:
            self.status = "error"
            self.last_execute = f"Error: {str(e)[:100]}"
            await self.logger.log_event(
                f"Agent {self.agent_id} error: {str(e)}",
                "error",
                {"agent_id": self.agent_id}
            )
            await self._broadcast_status_update()
        finally:
            await self.memory.update_agent_status(self.agent_id, self.status)
    
    async def _initialize_systems(self):
        """Initialize memory, throttling, and collaboration systems"""
        await self.memory.initialize()
        await self.memory.register_agent(
            agent_id=self.agent_id,
            agent_number=self.agent_number,
            target=self.target,
            category=self.category,
            model_name=self.model_name,
            metadata={
                "stealth_mode": self.stealth_mode,
                "aggressive_mode": self.aggressive_mode,
                "specializations": self._specializations
            }
        )
        
        self.throttler.register_agent(self.agent_id, base_delay=1.5 if self.stealth_mode else 1.0)
        
        capability = AgentCapability(
            agent_id=self.agent_id,
            specializations=self._specializations,
            current_load=0.0,
            status="running",
            target=self.target,
            tools_available=list(get_allowed_tools_by_category().keys()),
            findings_count=0
        )
        await self.agent_comm.register_agent(self.agent_id, capability)
        
        self.agent_comm.set_message_handler(self.agent_id, self._handle_agent_message)
        
        await self.logger.log_event(
            f"Agent {self.agent_id} systems initialized",
            "system",
            {"memory": True, "throttler": True, "collaboration": True}
        )
    
    async def _handle_agent_message(self, message: AgentMessage):
        """Handle incoming messages from other agents"""
        if message.message_type == MessageType.DISCOVERY:
            discovery = message.content
            await self.memory.add_knowledge(
                agent_id=message.from_agent,
                knowledge_type=discovery.get("discovery_type", "general"),
                key=discovery.get("key", ""),
                value=discovery.get("data", {}),
                source=f"agent:{message.from_agent}"
            )
        
        elif message.message_type == MessageType.FINDING:
            finding = message.content
            await self.logger.log_event(
                f"Received finding from {message.from_agent}: {finding.get('content', '')[:100]}",
                "collaboration"
            )
        
        elif message.message_type == MessageType.REQUEST_HELP:
            can_help = any(
                spec in self._specializations 
                for spec in message.content.get("requirements", {}).get("specializations", [])
            )
            if can_help and self.status in ["running", "idle"]:
                await self.agent_comm.offer_help(
                    from_agent=self.agent_id,
                    to_agent=message.from_agent,
                    help_request_id=message.id,
                    capabilities=self._specializations
                )
        
        elif message.message_type == MessageType.ALERT:
            await self.logger.log_event(
                f"ALERT from {message.from_agent}: {message.content.get('message', '')}",
                "alert",
                message.content
            )
    
    async def _broadcast_status_update(self):
        """Broadcast current status to WebSocket clients"""
        try:
            from server.ws import manager
            status = await self.get_status()
            
            message = {
                "type": "agent_status",
                "agent_id": self.agent_id,
                "status": status["status"],
                "last_command": status["last_command"],
                "execution_time": status["execution_time"],
                "progress": status["progress"]
            }
            
            if "cpu_usage" in status:
                message["cpu_usage"] = status["cpu_usage"]
            if "memory_usage" in status:
                message["memory_usage"] = status["memory_usage"]
            
            await manager.broadcast(message)
        except Exception:
            pass
    
    async def _run_autonomous_loop(self):
        """Main autonomous execution loop with intelligent throttling and rate limiting"""
        
        system_prompt = self._build_system_prompt()
        
        iteration = 0
        max_iterations = 50
        
        self.last_execute = f"Starting security analysis of {self.target}..."
        await self._broadcast_status_update()
        
        while not self.stopped and iteration < max_iterations:
            while self.paused and not self.stopped:
                self.last_execute = "Agent paused"
                await asyncio.sleep(1)
            
            if self.stopped:
                break
            
            throttle_result = await self.throttler.check_and_throttle(self.agent_id)
            
            if throttle_result.get("should_pause"):
                pause_time = throttle_result.get("pause_remaining", 10)
                self.last_execute = f"Auto-paused: {throttle_result.get('reason', 'Resource limit')}"
                await self.logger.log_event(
                    f"Agent {self.agent_id} auto-throttled",
                    "throttle",
                    throttle_result
                )
                await self._broadcast_status_update()
                await asyncio.sleep(min(pause_time, 30))
                continue
            
            if throttle_result.get("throttle_level") in ["HEAVY", "MODERATE"]:
                delay = throttle_result.get("delay", 2)
                self.last_execute = f"Throttling: {throttle_result.get('reason', 'High resource usage')}"
                await asyncio.sleep(delay)
            
            iteration += 1
            if iteration >= max_iterations:
                self.last_execute = f"Completed {iteration} analysis iterations"
                self.status = "completed"
                await self._broadcast_status_update()
                break
            
            self.last_execute = f"Iteration {iteration}: Analyzing target..."
            await self._broadcast_status_update()
            
            user_message = await self._build_user_message_with_collaboration(iteration)
            
            try:
                rate_limit_check = await self.rate_limiter.acquire(
                    self.model_name, 
                    estimated_tokens=2000
                )
                
                if rate_limit_check.get("wait_time", 0) > 0:
                    wait_time = rate_limit_check["wait_time"]
                    self.last_execute = f"Rate limit delay: {wait_time:.1f}s"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} rate limit delay",
                        "rate_limit",
                        {"model": self.model_name, "wait_time": wait_time}
                    )
                    await asyncio.sleep(wait_time)
                
                start_time = time.time()
                response = await self.model_router.generate(
                    self.model_name,
                    system_prompt,
                    user_message,
                    self.context_history[-10:]
                )
                execution_time = time.time() - start_time
                
                await self.rate_limiter.record_request(
                    self.model_name, 
                    tokens_used=len(response) // 4,
                    success=True
                )
                
                await self.memory.save_conversation(
                    self.agent_id, "user", user_message, iteration
                )
                await self.memory.save_conversation(
                    self.agent_id, "assistant", response, iteration
                )
                
                response_summary = response[:100].replace('\n', ' ')
                self.last_execute = f"AI: {response_summary}..."
                
                await self._broadcast_model_instruction(response)
                await self._broadcast_status_update()
                
                self.context_history.append({
                    "role": "user",
                    "content": user_message
                })
                self.context_history.append({
                    "role": "assistant",
                    "content": response
                })
                
                if "<END!>" in response:
                    self.last_execute = "Mission completed successfully"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} completed mission",
                        "agent"
                    )
                    self.status = "completed"
                    await self._broadcast_status_update()
                    break
                
                commands = self._extract_commands(response)
                
                if commands:
                    await self._execute_commands_with_coordination(commands)
                    await self._broadcast_status_update()
                
                findings = self._extract_findings(response)
                
                if findings:
                    await self._save_findings_with_sharing(findings)
                
                await self._share_knowledge(response)
                
                await self._apply_intelligent_delay()
                
            except Exception as e:
                error_str = str(e)
                self.last_execute = f"Error: {error_str[:80]}"
                
                if "rate" in error_str.lower() or "429" in error_str:
                    cooldown = await self.rate_limiter.handle_rate_limit_error(self.model_name)
                    self.last_execute = f"Rate limit hit, cooling down {cooldown['cooldown_seconds']}s"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} rate limit error",
                        "rate_limit",
                        cooldown
                    )
                    await asyncio.sleep(cooldown['cooldown_seconds'])
                    continue
                
                await self.rate_limiter.record_request(self.model_name, success=False)
                
                await self.logger.log_event(
                    f"Agent {self.agent_id} iteration error: {error_str}",
                    "error",
                    {"error_type": type(e).__name__, "model": self.model_name}
                )
                await self._broadcast_status_update()
                
                if "401" in error_str and "Unauthorized" in error_str:
                    self.status = "error"
                    self.last_execute = f"Auth Error: {error_str[:60]}"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} stopping due to auth error: {error_str}",
                        "error"
                    )
                    await self._broadcast_status_update()
                    break
                
                await asyncio.sleep(3)
        
        if iteration >= max_iterations:
            self.status = "completed"
            self.last_execute = "Reached maximum iterations"
            await self.logger.log_event(
                f"Agent {self.agent_id} reached max iterations",
                "agent"
            )
        
        self.status = "completed"
        await self._broadcast_status_update()
    
    async def _build_user_message_with_collaboration(self, iteration: int) -> str:
        """Build user message with collaboration data from other agents"""
        messages = await self.agent_comm.get_messages(
            self.agent_id, 
            unread_only=True, 
            limit=10
        )
        
        knowledge = await self.knowledge_base.get_target_summary(self.target)
        
        message = f"Iteration {iteration}:\n\n"
        
        if messages:
            message += "## Messages from other agents:\n"
            for msg in messages[:5]:
                msg_type = msg.message_type.value if hasattr(msg.message_type, 'value') else msg.message_type
                message += f"- [{msg.from_agent}] ({msg_type}): {str(msg.content)[:150]}\n"
            message += "\n"
            
            await self.agent_comm.clear_messages(
                self.agent_id, 
                [m.id for m in messages[:5]]
            )
        
        if knowledge.get("ports"):
            message += f"## Known open ports: {len(knowledge['ports'])} discovered\n"
            for port_info in knowledge["ports"][:5]:
                message += f"- Port {port_info.get('port')}: {port_info.get('service', 'unknown')}\n"
            message += "\n"
        
        if knowledge.get("vulnerabilities"):
            message += f"## Known vulnerabilities: {len(knowledge['vulnerabilities'])} found\n"
            for vuln in knowledge["vulnerabilities"][:3]:
                message += f"- [{vuln.get('severity')}] {vuln.get('type')}: {vuln.get('details', '')[:80]}\n"
            message += "\n"
        
        if self.execution_history:
            last_execution = self.execution_history[-1]
            message += f"## Last command executed:\n{last_execution.get('command')}\n"
            result_preview = last_execution.get('result', '')[:500]
            message += f"Result: {result_preview}...\n\n"
        
        message += "What is your next action? Provide commands to execute or signal completion with <END!>"
        
        return message
    
    async def _execute_commands_with_coordination(self, commands: Dict[str, str]):
        """Execute commands with coordination to avoid duplicate work"""
        for key, command in commands.items():
            if command.startswith("RUN "):
                cmd = command[4:].strip()
                
                task_id = f"{self.target}:{cmd.split()[0]}:{hash(cmd) % 10000}"
                
                is_available = await self.agent_comm.is_task_available(task_id)
                if not is_available:
                    self.last_execute = f"Skipped (already done by team): {cmd[:50]}"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} skipped duplicate task",
                        "coordination",
                        {"command": cmd[:100]}
                    )
                    continue
                
                claimed = await self.agent_comm.claim_task(self.agent_id, task_id)
                if not claimed:
                    self.last_execute = f"Task claimed by another agent: {cmd[:50]}"
                    continue
                
                if is_dangerous_command(cmd):
                    self.last_execute = f"BLOCKED: Dangerous command detected"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} blocked dangerous command: {cmd}",
                        "security_violation"
                    )
                    await self.agent_comm.complete_task(self.agent_id, task_id, {"blocked": True})
                    continue
                
                if not is_tool_allowed(cmd):
                    tool_name = cmd.split()[0]
                    self.last_execute = f"BLOCKED: Tool '{tool_name}' not in allowed list"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} blocked unauthorized tool: {tool_name}",
                        "security_violation"
                    )
                    await self.agent_comm.complete_task(self.agent_id, task_id, {"blocked": True})
                    continue
                
                self.last_execute = cmd
                
                await self.logger.log_event(
                    f"Agent {self.agent_id} executing: {cmd}",
                    "command"
                )
                
                start_time = time.time()
                result = await self.executor.execute(cmd)
                exec_time = time.time() - start_time
                
                await self.memory.save_execution(
                    self.agent_id, cmd, result, 
                    success=True, execution_time=exec_time
                )
                
                self.execution_history.append({
                    "command": cmd,
                    "result": result,
                    "timestamp": datetime.now().isoformat()
                })
                
                await self._extract_and_share_discoveries(cmd, result)
                
                await self.agent_comm.complete_task(self.agent_id, task_id, {
                    "command": cmd,
                    "result_length": len(result)
                })
                
                await self.logger.log_event(
                    f"Agent {self.agent_id} completed: {cmd}",
                    "command",
                    {"result_length": len(result), "exec_time": exec_time}
                )
    
    async def _extract_and_share_discoveries(self, command: str, result: str):
        """Extract discoveries from command results and share with team"""
        import re
        
        if "nmap" in command.lower():
            port_pattern = r'(\d+)/(?:tcp|udp)\s+open\s+(\S+)'
            for match in re.finditer(port_pattern, result):
                port, service = match.groups()
                added = await self.knowledge_base.add_port(
                    self.target, int(port), service, agent_id=self.agent_id
                )
                if added:
                    await self.agent_comm.share_discovery(
                        self.agent_id,
                        "port",
                        f"{self.target}:{port}",
                        {"port": port, "service": service}
                    )
        
        if any(tool in command.lower() for tool in ["gobuster", "dirb", "ffuf"]):
            path_pattern = r'(/\S+)\s+\(Status:\s*(\d+)'
            for match in re.finditer(path_pattern, result):
                path, status = match.groups()
                await self.knowledge_base.add_directory(
                    self.target, path, int(status), agent_id=self.agent_id
                )
        
        if any(tool in command.lower() for tool in ["subfinder", "amass"]):
            subdomain_pattern = r'([a-zA-Z0-9][-a-zA-Z0-9]*\.' + re.escape(self.target) + r')'
            for match in re.finditer(subdomain_pattern, result):
                subdomain = match.group(1)
                await self.knowledge_base.add_subdomain(
                    self.target, subdomain, agent_id=self.agent_id
                )
    
    async def _save_findings_with_sharing(self, findings: List[str]):
        """Save findings and share with other agents"""
        for finding in findings:
            severity = self._classify_severity(finding)
            
            finding_data = {
                "agent_id": self.agent_id,
                "agent_number": self.agent_number,
                "content": finding,
                "severity": severity,
                "timestamp": datetime.now().isoformat(),
                "target": self.target
            }
            
            self.shared_knowledge["findings"].append(finding_data)
            
            await self.memory.save_finding(
                self.agent_id, self.target, finding, 
                severity=severity, category=self.category
            )
            
            await self.agent_comm.share_finding(self.agent_id, finding_data)
            
            if severity in ["Critical", "High"]:
                await self.knowledge_base.add_vulnerability(
                    self.target, 
                    "discovered",
                    finding,
                    severity=severity,
                    agent_id=self.agent_id
                )
            
            await self.logger.write_finding(self.agent_id, finding)
            
            await self.logger.log_event(
                f"Agent {self.agent_id} finding: {finding[:100]}...",
                "finding",
                {"severity": severity}
            )
            
            await self.agent_comm.update_capabilities(
                self.agent_id,
                findings_count=len([f for f in self.shared_knowledge.get("findings", []) 
                                   if f["agent_id"] == self.agent_id])
            )
    
    async def _apply_intelligent_delay(self):
        """Apply intelligent delay based on throttling, stealth, and rate limits"""
        from server.config import settings
        
        throttle_result = await self.throttler.check_and_throttle(self.agent_id)
        throttle_delay = throttle_result.get("delay", 1.0)
        
        rate_status = self.rate_limiter.get_status(self.model_name)
        rate_delay = rate_status.get("current_delay", 1.0)
        
        if self.stealth_mode:
            base_delay = random.uniform(
                settings.DEFAULT_DELAY_MIN * 2,
                settings.DEFAULT_DELAY_MAX * 3
            )
        else:
            base_delay = random.uniform(
                settings.DEFAULT_DELAY_MIN,
                settings.DEFAULT_DELAY_MAX
            )
        
        final_delay = max(base_delay, throttle_delay, rate_delay)
        
        jitter = random.uniform(-0.3, 0.3) * final_delay
        final_delay = max(0.5, final_delay + jitter)
        
        resources = throttle_result.get("resources", {})
        await self.memory.record_resource_usage(
            self.agent_id,
            cpu=resources.get("cpu_percent", 0),
            memory=resources.get("memory_percent", 0),
            throttle=(throttle_result.get("throttle_level", "NONE") != "NONE")
        )
        
        await asyncio.sleep(final_delay)
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for AI model with available tools"""
        
        mode_str = "Stealth (evade detection)" if self.stealth_mode else "Aggressive (thorough scanning)" if self.aggressive_mode else "Normal"
        
        custom_section = ""
        if self.custom_instruction:
            custom_section = f"\n## CUSTOM INSTRUCTION\n{self.custom_instruction}\n"
        
        # Build available tools section
        tools_by_category = get_allowed_tools_by_category()
        tools_section = "## AVAILABLE TOOLS BY CATEGORY\n\n"
        for category, tools in tools_by_category.items():
            category_display = category.replace("_", " ").title()
            tools_list = ", ".join(sorted(list(tools))[:10])  # Show first 10 per category
            tools_section += f"### {category_display}\n{tools_list}{'... and more' if len(tools) > 10 else ''}\n\n"
        
        prompt = f"""You are an elite autonomous cyber security agent (Agent #{self.agent_number}) conducting advanced security assessment.

Target: {self.target}
Category: {self.category}
Mode: {mode_str}

## CORE CAPABILITIES

### 1. Command Execution
Execute security tools using: RUN <command>
Example: RUN nmap -sV -sC {self.target}
ALL commands must use tools from the AVAILABLE TOOLS list below.

### 2. Finding Documentation
Save findings using: <write>content</write>
Include severity: Critical/High/Medium/Low/Info

### 3. Completion Signal
Use <END!> when mission objectives are met.

{tools_section}

## METHODOLOGY

1. **Reconnaissance**: Use network_recon tools (nmap, amass, subfinder) to map attack surface
2. **Enumeration**: Use web_scanning tools (nikto, gobuster, httpx) to discover services
3. **Vulnerability Discovery**: Use vuln_scanning tools (trivy, nuclei) to identify issues
4. **Exploitation Testing**: Use exploitation tools to validate findings
5. **Documentation**: Record all findings with <write> tags
6. **Collaboration**: Share critical discoveries with other agents
{custom_section}

## RULES
- ONLY use tools from the AVAILABLE TOOLS list above
- Be methodical and thorough
- Document ALL findings with <write> tags
- Include severity classification (Critical/High/Medium/Low/Info)
- Provide exploitation proof when possible
- Signal <END!> only when objectives are fully met
- Never use forbidden commands (rm -rf, mkfs, chmod 777 /, etc.)
"""
        
        return prompt
    
    def _build_user_message(self, iteration: int) -> str:
        """Build user message for current iteration"""
        
        # Check shared knowledge for updates from other agents
        recent_findings = self.shared_knowledge.get("findings", [])[-5:]
        recent_messages = self.shared_knowledge.get("messages", [])[-5:]
        
        message = f"Iteration {iteration}:\n\n"
        
        if recent_findings:
            message += "Recent findings from team:\n"
            for finding in recent_findings:
                message += f"- [{finding.get('agent_id')}] {finding.get('content', '')}\n"
            message += "\n"
        
        if recent_messages:
            message += "Recent messages from team:\n"
            for msg in recent_messages:
                if msg.get('agent_id') != self.agent_id:  # Skip own messages
                    message += f"- [{msg.get('agent_id')}] {msg.get('content', '')}\n"
            message += "\n"
        
        if self.execution_history:
            last_execution = self.execution_history[-1]
            message += f"Last command executed: {last_execution.get('command')}\n"
            message += f"Result: {last_execution.get('result', '')[:500]}...\n\n"  # Truncate for token efficiency
        
        message += "What is your next action? Provide commands to execute or signal completion with <END!>"
        
        return message
    
    def _extract_commands(self, response: str) -> Dict[str, str]:
        """Extract RUN commands from response"""
        
        # Check if response contains JSON batch commands
        json_pattern = r'\{[^}]*"(?:\d+|agent[^"]*)":\s*"RUN[^}]+\}'
        json_matches = re.findall(json_pattern, response, re.DOTALL)
        
        if json_matches:
            try:
                # Parse JSON batch
                commands = json.loads(json_matches[0])
                # Filter to only this agent's commands
                agent_key = str(self.agent_number)
                if agent_key in commands:
                    return {agent_key: commands[agent_key]}
                return commands
            except json.JSONDecodeError:
                pass
        
        # Otherwise extract individual RUN commands
        run_pattern = r'RUN\s+(.+?)(?:\n|$)'
        matches = re.findall(run_pattern, response)
        
        if matches:
            return {"1": f"RUN {matches[0]}"}
        
        return {}
    
    def _extract_findings(self, response: str) -> List[str]:
        """Extract findings marked with <write> tags"""
        
        pattern = r'<write>(.*?)</write>'
        matches = re.findall(pattern, response, re.DOTALL)
        
        return [m.strip() for m in matches]
    
    async def _execute_commands(self, commands: Dict[str, str]):
        """Execute extracted commands with validation"""
        
        for key, command in commands.items():
            if command.startswith("RUN "):
                cmd = command[4:].strip()  # Remove "RUN " prefix
                
                # Validate command safety
                if is_dangerous_command(cmd):
                    self.last_execute = f"⚠️ BLOCKED: Dangerous command detected"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} blocked dangerous command: {cmd}",
                        "security_violation"
                    )
                    continue
                
                # Validate tool is allowed
                if not is_tool_allowed(cmd):
                    tool_name = cmd.split()[0]
                    self.last_execute = f"⚠️ BLOCKED: Tool '{tool_name}' not in allowed list"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} blocked unauthorized tool: {tool_name}",
                        "security_violation"
                    )
                    continue
                
                self.last_execute = cmd
                
                await self.logger.log_event(
                    f"Agent {self.agent_id} executing: {cmd}",
                    "command"
                )
                
                # Execute command
                result = await self.executor.execute(cmd)
                
                # Store in history
                self.execution_history.append({
                    "command": cmd,
                    "result": result,
                    "timestamp": datetime.now().isoformat()
                })
                
                await self.logger.log_event(
                    f"Agent {self.agent_id} completed: {cmd}",
                    "command",
                    {"result_length": len(result)}
                )
    
    async def _save_findings(self, findings: List[str]):
        """Save findings to log and shared knowledge"""
        
        for finding in findings:
            # Classify severity (basic keyword matching)
            severity = self._classify_severity(finding)
            
            finding_data = {
                "agent_id": self.agent_id,
                "agent_number": self.agent_number,
                "content": finding,
                "severity": severity,
                "timestamp": datetime.now().isoformat(),
                "target": self.target
            }
            
            # Add to shared knowledge
            self.shared_knowledge["findings"].append(finding_data)
            
            # Log to file
            await self.logger.write_finding(self.agent_id, finding)
            
            await self.logger.log_event(
                f"Agent {self.agent_id} finding: {finding[:100]}...",
                "finding",
                {"severity": severity}
            )
    
    def _classify_severity(self, finding: str) -> str:
        """Classify finding severity based on keywords"""
        
        finding_lower = finding.lower()
        
        critical_keywords = ["critical", "remote code execution", "rce", "sql injection", "authentication bypass"]
        high_keywords = ["high", "vulnerability", "exploit", "exposed", "sensitive"]
        medium_keywords = ["medium", "misconfiguration", "weak", "outdated"]
        low_keywords = ["low", "information disclosure", "warning"]
        
        if any(kw in finding_lower for kw in critical_keywords):
            return "Critical"
        elif any(kw in finding_lower for kw in high_keywords):
            return "High"
        elif any(kw in finding_lower for kw in medium_keywords):
            return "Medium"
        elif any(kw in finding_lower for kw in low_keywords):
            return "Low"
        else:
            return "Info"
    
    async def _share_knowledge(self, response: str):
        """Share knowledge with other agents"""
        
        # Add to shared messages
        self.shared_knowledge["messages"].append({
            "agent_id": self.agent_id,
            "agent_number": self.agent_number,
            "content": response[:200],  # Truncate for efficiency
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep only recent messages (last 50)
        if len(self.shared_knowledge["messages"]) > 50:
            self.shared_knowledge["messages"] = self.shared_knowledge["messages"][-50:]
    
    async def _apply_delay(self):
        """Apply delay for rate limiting and stealth"""
        
        from server.config import settings
        
        if self.stealth_mode:
            # Randomize delay more in stealth mode
            delay = random.uniform(
                settings.DEFAULT_DELAY_MIN * 2,
                settings.DEFAULT_DELAY_MAX * 3
            )
        else:
            delay = random.uniform(
                settings.DEFAULT_DELAY_MIN,
                settings.DEFAULT_DELAY_MAX
            )
        
        await asyncio.sleep(delay)
    
    async def get_status(self) -> Dict:
        """Get current agent status"""
        cpu_usage = self._last_cpu_usage
        memory_usage = self._last_memory_usage
        
        if PSUTIL_AVAILABLE and psutil:
            try:
                new_cpu = psutil.cpu_percent(interval=None)
                if new_cpu is not None:
                    cpu_usage = new_cpu
                    self._last_cpu_usage = cpu_usage
                
                memory = psutil.virtual_memory()
                memory_usage = int(memory.used / (1024 * 1024))
                self._last_memory_usage = memory_usage
            except Exception:
                pass
        
        elapsed_time = 0
        if self.start_time:
            elapsed_time = time.time() - self.start_time
        
        progress = min(100, int((len(self.execution_history) / max(1, 50)) * 100))
        if self.status == "completed":
            progress = 100
        
        result = {
            "id": self.agent_id,
            "agent_id": self.agent_id,
            "agent_number": self.agent_number,
            "status": self.status,
            "target": self.target,
            "category": self.category,
            "model": self.model_name,
            "execution_time": elapsed_time,
            "elapsed_time": elapsed_time,
            "last_command": self.last_execute,
            "last_execute": self.last_execute,
            "last_execute_time": datetime.now().isoformat() if self.execution_history else None,
            "execution_count": len(self.execution_history),
            "findings_count": len([f for f in self.shared_knowledge.get("findings", []) if f["agent_id"] == self.agent_id]),
            "stealth_mode": self.stealth_mode,
            "aggressive_mode": self.aggressive_mode,
            "progress": progress
        }
        
        if cpu_usage is not None:
            result["cpu_usage"] = cpu_usage
        if memory_usage is not None:
            result["memory_usage"] = memory_usage
        
        return result
    
    async def pause(self):
        """Pause agent execution"""
        self.paused = True
        self.status = "paused"
        
    async def resume(self):
        """Resume agent execution"""
        self.paused = False
        self.status = "running"
    
    async def stop(self):
        """Stop agent execution"""
        self.stopped = True
        self.status = "stopped"
    
    async def _broadcast_model_instruction(self, response: str):
        """Broadcast model instruction to WebSocket clients and store in history"""
        try:
            from server.ws import manager
            
            # Determine instruction type based on content
            instruction_type = "analysis"
            if "RUN " in response:
                instruction_type = "command"
            elif "<write>" in response or "finding" in response.lower():
                instruction_type = "decision"
            
            # Extract a summary of the response (first 500 chars)
            summary = response[:500] + ("..." if len(response) > 500 else "")
            timestamp = datetime.now().isoformat()
            
            # Store in instruction history
            instruction_record = {
                "id": len(self.instruction_history) + 1,
                "instruction": summary,
                "full_response": response,
                "instruction_type": instruction_type,
                "timestamp": timestamp,
                "model_name": self.model_name
            }
            self.instruction_history.append(instruction_record)
            
            # Keep only last 100 instructions
            if len(self.instruction_history) > 100:
                self.instruction_history = self.instruction_history[-100:]
            
            await manager.broadcast({
                "type": "model_instruction",
                "agent_id": self.agent_id,
                "model_name": self.model_name,
                "instruction": summary,
                "instruction_type": instruction_type,
                "timestamp": timestamp,
                "history_id": instruction_record["id"]
            })
        except Exception:
            # Silent fail for broadcast errors
            pass
    
    def get_instruction_history(self) -> List[Dict]:
        """Get the instruction history for this agent"""
        return self.instruction_history
