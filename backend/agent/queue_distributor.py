"""Per-agent queue distributor for task management"""
from typing import Dict, List, Any
import json

class QueueDistributor:
    """Distributes model predictions to agent-specific queues"""
    
    def __init__(self):
        self.agent_queues: Dict[str, List[Dict]] = {}
    
    def parse_model_batches(self, response: str) -> List[Dict[str, str]]:
        """Parse model response to extract 3 instruction batches"""
        batches = []
        
        # Try to extract JSON batches from response
        import re
        json_pattern = r'\{[^}]*"(?:\d+|agent[^"]*)":\s*"RUN[^}]+\}'
        matches = re.findall(json_pattern, response, re.DOTALL)
        
        for match in matches[:3]:  # Take up to 3 batches
            try:
                batch = json.loads(match)
                batches.append(batch)
            except json.JSONDecodeError:
                pass
        
        return batches if batches else [{}]
    
    def distribute_to_agents(self, batches: List[Dict[str, str]], agent_ids: List[str]):
        """Distribute batches to agent-specific queues"""
        for idx, agent_id in enumerate(agent_ids):
            if idx < len(batches):
                batch = batches[idx]
                if agent_id not in self.agent_queues:
                    self.agent_queues[agent_id] = []
                
                # Convert batch to individual instructions with agent key "1"
                if batch:
                    commands = []
                    for cmd in batch.values():
                        if isinstance(cmd, str) and cmd.startswith("RUN"):
                            commands.append({"key": "1", "command": cmd})
                    
                    if commands:
                        self.agent_queues[agent_id].extend(commands)
    
    def get_agent_queue(self, agent_id: str) -> List[Dict]:
        """Get next instruction for agent"""
        if agent_id in self.agent_queues and self.agent_queues[agent_id]:
            return self.agent_queues[agent_id]
        return []
    
    def pop_agent_instruction(self, agent_id: str) -> Dict:
        """Pop next instruction for agent"""
        if agent_id in self.agent_queues and self.agent_queues[agent_id]:
            return self.agent_queues[agent_id].pop(0)
        return {}
    
    def add_instruction(self, agent_id: str, command: str):
        """Add instruction to agent queue"""
        if agent_id not in self.agent_queues:
            self.agent_queues[agent_id] = []
        self.agent_queues[agent_id].append({"key": "1", "command": command})
