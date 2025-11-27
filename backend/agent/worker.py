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
        stealth_config: Optional[Dict] = None
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
        
        self.executor = CommandExecutor(agent_id, stealth_mode, stealth_config)
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
            {"agent_number": self.agent_number, "target": self.target}
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
        
        prompt = f"""You are an autonomous cyber security agent (Agent #{self.agent_number}) conducting security assessment.

Target: {self.target}
Category: {self.category}
Mode: {"Stealth" if self.stealth_mode else "Aggressive" if self.aggressive_mode else "Normal"}

Your capabilities:
1. Execute security tools using: RUN <command>
   Example: RUN nmap -sV {self.target}
   
2. Save important findings using: <write>content</write>
   Example: <write>Found open port 80 on {self.target}</write>
   
3. Signal completion using: <END!>
   When you believe the objective is complete, include <END!> in your response.

4. Collaborate with other agents:
   - You can see findings from other agents in the shared knowledge base
   - Share your discoveries to help the team
   - Avoid duplicate work by checking what others have done

Available tools:
- nmap: Network scanning
- nikto: Web server scanner
- sqlmap: SQL injection testing
- dirb/dirbuster: Directory enumeration
- whatweb: Web technology identification
- And other standard security tools

{"Custom Instruction: " + self.custom_instruction if self.custom_instruction else ""}
Remember:
- Be thorough but efficient
- Document all findings
- Coordinate with other agents
- Signal <END!> when objectives are met
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
        
        return {
            "agent_id": self.agent_id,
            "agent_number": self.agent_number,
            "status": self.status,
            "target": self.target,
            "model": self.model_name,
            "elapsed_time": elapsed_time,
            "last_execute": self.last_execute,
            "execution_count": len(self.execution_history),
            "findings_count": len([f for f in self.shared_knowledge.get("findings", []) if f["agent_id"] == self.agent_id]),
            "stealth_mode": self.stealth_mode,
            "aggressive_mode": self.aggressive_mode
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
