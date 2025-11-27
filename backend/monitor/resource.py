import psutil
import asyncio
from typing import Dict, Any
from datetime import datetime

class ResourceMonitor:
    """Monitor system and agent resource usage"""
    
    def __init__(self):
        self.agent_resources: Dict[str, Dict] = {}
        
    def get_system_resources(self) -> Dict[str, Any]:
        """Get overall system resource usage"""
        
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Network I/O
        net_io = psutil.net_io_counters()
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent
            },
            "network": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def get_agent_resources(self) -> Dict[str, Dict]:
        """Get resource usage for all agents"""
        return self.agent_resources
    
    async def get_agent_resource(self, agent_id: str) -> Dict[str, Any]:
        """Get resource usage for specific agent"""
        
        if agent_id not in self.agent_resources:
            # Initialize with default values
            self.agent_resources[agent_id] = {
                "cpu_percent": 0.0,
                "memory_mb": 0.0,
                "memory_percent": 0.0,
                "network_sent": 0,
                "network_recv": 0
            }
        
        # In a real implementation, you'd track actual process resources
        # For now, return simulated/estimated values
        return self.agent_resources[agent_id]
    
    async def update_agent_resource(self, agent_id: str, pid: int):
        """Update resource usage for an agent process"""
        
        try:
            process = psutil.Process(pid)
            
            self.agent_resources[agent_id] = {
                "cpu_percent": process.cpu_percent(interval=0.1),
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "memory_percent": process.memory_percent(),
                "network_sent": 0,  # Would need more advanced tracking
                "network_recv": 0,
                "timestamp": datetime.now().isoformat()
            }
        except psutil.NoSuchProcess:
            pass
    
    def check_resource_limits(self) -> Dict[str, bool]:
        """Check if resource usage exceeds limits"""
        
        from server.config import settings
        
        system = self.get_system_resources()
        
        return {
            "memory_ok": system["memory"]["percent"] < settings.MAX_MEMORY_PERCENT,
            "cpu_ok": system["cpu"]["percent"] < settings.MAX_CPU_PERCENT,
            "memory_percent": system["memory"]["percent"],
            "cpu_percent": system["cpu"]["percent"]
        }
