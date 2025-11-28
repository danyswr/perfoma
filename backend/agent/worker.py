import asyncio
import time
import random
from typing import Dict, List, Optional, Any
from datetime import datetime
from agent.executor import CommandExecutor
from models.router import ModelRouter
from monitor.log import Logger
import re
import json

class AgentWorker:
    """Individual autonomous agent worker"""
    
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
        
        self.status = "idle"  # idle, running, paused, completed, error
        self.start_time = None
        self.last_execute = "Not started"
        self.execution_history: List[Dict] = []
        self.context_history: List[Dict] = []
        self.paused = False
        self.stopped = False
        
    async def start(self):
        """Start agent execution"""
        self.status = "running"
        self.start_time = time.time()
        
        await self.logger.log_event(
            f"Agent {self.agent_id} started",
            "agent",
            {"agent_number": self.agent_number, "target": self.target or "no target"}
        )
        
        # If no target is set, agent will run in standby mode with basic instructions
        if not self.target:
            self.last_execute = "Agent ready, awaiting target assignment"
            await self.logger.log_event(
                f"Agent {self.agent_id} running in standby mode (no target)",
                "agent",
                {"agent_id": self.agent_id}
            )
        
        try:
            await self._run_autonomous_loop()
        except Exception as e:
            self.status = "error"
            await self.logger.log_event(
                f"Agent {self.agent_id} error: {str(e)}",
                "error",
                {"agent_id": self.agent_id}
            )
    
    async def _run_autonomous_loop(self):
        """Main autonomous execution loop"""
        
        # Build initial system prompt
        system_prompt = self._build_system_prompt()
        
        iteration = 0
        max_iterations = 50  # Prevent infinite loops
        
        while not self.stopped and iteration < max_iterations:
            # Check if paused
            while self.paused and not self.stopped:
                await asyncio.sleep(1)
            
            if self.stopped:
                break
            
            iteration += 1
            
            # Get next action from AI model
            user_message = self._build_user_message(iteration)
            
            try:
                response = await self.model_router.generate(
                    self.model_name,
                    system_prompt,
                    user_message,
                    self.context_history[-10:]  # Last 10 messages
                )
                
                # Broadcast model instruction via WebSocket
                await self._broadcast_model_instruction(response)
                
                # Add to context
                self.context_history.append({
                    "role": "user",
                    "content": user_message
                })
                self.context_history.append({
                    "role": "assistant",
                    "content": response
                })
                
                # Check for END signal
                if "<END!>" in response:
                    await self.logger.log_event(
                        f"Agent {self.agent_id} completed mission",
                        "agent"
                    )
                    self.status = "completed"
                    break
                
                # Extract and execute commands
                commands = self._extract_commands(response)
                
                if commands:
                    await self._execute_commands(commands)
                
                # Extract and save findings
                findings = self._extract_findings(response)
                
                if findings:
                    await self._save_findings(findings)
                
                # Share with other agents
                await self._share_knowledge(response)
                
                # Delay for rate limiting and stealth
                await self._apply_delay()
                
            except Exception as e:
                error_str = str(e)
                await self.logger.log_event(
                    f"Agent {self.agent_id} iteration error: {error_str}",
                    "error",
                    {"error_type": type(e).__name__, "model": self.model_name}
                )
                
                if "402 Payment Required" in error_str or "Unauthorized" in error_str:
                    # Stop agent on auth/billing errors
                    self.status = "error"
                    await self.logger.log_event(
                        f"Agent {self.agent_id} stopping due to critical error: {error_str}",
                        "error"
                    )
                    break
                
                # Continue to next iteration for temporary errors
        
        if iteration >= max_iterations:
            self.status = "completed"
            await self.logger.log_event(
                f"Agent {self.agent_id} reached max iterations",
                "agent"
            )
        
        self.status = "completed"
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for AI model"""
        
        mode_str = "Stealth (evade detection)" if self.stealth_mode else "Aggressive (thorough scanning)" if self.aggressive_mode else "Normal"
        
        custom_section = ""
        if self.custom_instruction:
            custom_section = f"\n## CUSTOM INSTRUCTION\n{self.custom_instruction}\n"
        
        prompt = f"""You are an elite autonomous cyber security agent (Agent #{self.agent_number}) conducting advanced security assessment.

Target: {self.target}
Category: {self.category}
Mode: {mode_str}

## CORE CAPABILITIES

### 1. Command Execution
Execute security tools using: RUN <command>
Example: RUN nmap -sV -sC {self.target}

### 2. Finding Documentation
Save findings using: <write>content</write>
Include severity: Critical/High/Medium/Low/Info

### 3. Completion Signal
Use <END!> when mission objectives are met.

## ADVANCED EXPLOIT MODULES

### CORS Exploitation
- Test for CORS misconfigurations
- RUN curl -H "Origin: https://evil.com" -I {self.target}

### SSRF Chaining
- Discover and chain SSRF vulnerabilities
- Test cloud metadata endpoints (AWS, GCP, Azure)
- Generate gopher/dict protocol payloads

### Deserialization Exploits
- Generate payloads for Java, PHP, Python, .NET, Ruby, Node.js
- Auto-detect vulnerable frameworks
- Chain gadgets for RCE

### WAF/Cloudflare Bypass
- Auto-detect WAF type (Cloudflare, Akamai, AWS WAF, etc.)
- Apply encoding, unicode, chunked bypasses
- Test origin IP discovery methods

### Broken Access Control
- IDOR testing with payload chaining
- HTTP method bypass (GET/POST/PUT override)
- Path traversal bypass techniques
- Privilege escalation testing

### WebSocket Hijacking
- Discover WebSocket endpoints
- Test Cross-Site WebSocket Hijacking (CSWSH)
- Authentication bypass testing
- Message injection testing

### Supply Chain Attacks
- Dependency confusion checker
- Typosquatting package detection
- Repository takeover analysis
- Malicious package simulation

## STANDARD SECURITY TOOLS
- nmap: Network/port scanning (use -sV -sC for version/script detection)
- nikto: Web server vulnerability scanning
- sqlmap: SQL injection testing (use --batch for non-interactive)
- dirb/gobuster: Directory enumeration
- whatweb: Technology fingerprinting
- curl: HTTP testing with custom headers
- ffuf: Fuzzing web applications
- nuclei: Vulnerability scanning with templates

## METHODOLOGY

1. **Reconnaissance**: Identify attack surface, technologies, entry points
2. **Vulnerability Discovery**: Use appropriate tools and exploit modules
3. **Exploitation Testing**: Validate findings with proof-of-concept
4. **Documentation**: Record all findings with severity and evidence
5. **Chaining**: Combine vulnerabilities for maximum impact
{custom_section}
## COLLABORATION
- Check shared findings from other agents
- Avoid duplicate work
- Share critical discoveries immediately

## RULES
- Be methodical and thorough
- Document ALL findings with <write> tags
- Include severity classification
- Provide exploitation proof when possible
- Signal <END!> only when objectives are fully met
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
        """Execute extracted commands"""
        
        for key, command in commands.items():
            if command.startswith("RUN "):
                cmd = command[4:].strip()  # Remove "RUN " prefix
                
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
        
        elapsed_time = 0
        if self.start_time:
            elapsed_time = time.time() - self.start_time
        
        progress = min(100, int((len(self.execution_history) / max(1, 50)) * 100))
        if self.status == "completed":
            progress = 100
        
        return {
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
            "cpu_usage": random.randint(5, 35),
            "memory_usage": random.randint(50, 150),
            "progress": progress
        }
    
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
        """Broadcast model instruction to WebSocket clients"""
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
            
            await manager.broadcast({
                "type": "model_instruction",
                "agent_id": self.agent_id,
                "model_name": self.model_name,
                "instruction": summary,
                "instruction_type": instruction_type,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            # Silent fail for broadcast errors
            pass
