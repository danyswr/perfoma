from agent.manager import AgentManager
from agent.worker import AgentWorker
from agent.executor import CommandExecutor
from agent.queue import QueueManager

_agent_manager_instance = None

def get_agent_manager() -> AgentManager:
    """Get the shared AgentManager singleton instance"""
    global _agent_manager_instance
    if _agent_manager_instance is None:
        _agent_manager_instance = AgentManager()
    return _agent_manager_instance

__all__ = [
    "AgentManager",
    "AgentWorker", 
    "CommandExecutor",
    "QueueManager",
    "get_agent_manager"
]
