import random
import asyncio
from typing import List, Optional, Dict
import aiohttp

class ProxyChain:
    """Advanced proxy chain management with rotation and validation"""
    
    def __init__(self, proxy_list: List[str] = None):
        """
        Initialize proxy chain manager
        
        Args:
            proxy_list: List of proxy URLs (e.g., ['http://proxy1:8080', 'socks5://proxy2:1080'])
        """
        self.proxy_list = proxy_list or []
        self.working_proxies: List[str] = []
        self.failed_proxies: List[str] = []
        self.current_index = 0
        self.proxy_performance: Dict[str, Dict] = {}  # Track success rate and latency
        
    async def validate_proxy(self, proxy: str, timeout: int = 10) -> bool:
        """Validate if proxy is working"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "http://httpbin.org/ip",
                    proxy=proxy,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    if response.status == 200:
                        return True
        except Exception:
            return False
        
        return False
    
    async def validate_all_proxies(self):
        """Validate all proxies in the list"""
        tasks = []
        for proxy in self.proxy_list:
            tasks.append(self.validate_proxy(proxy))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for proxy, is_working in zip(self.proxy_list, results):
            if is_working:
                self.working_proxies.append(proxy)
                self.proxy_performance[proxy] = {
                    "success_count": 0,
                    "fail_count": 0,
                    "avg_latency": 0
                }
            else:
                self.failed_proxies.append(proxy)
    
    def get_proxy(self, strategy: str = "random") -> Optional[str]:
        """
        Get next proxy based on strategy
        
        Args:
            strategy: 'random', 'round_robin', or 'performance'
        """
        if not self.working_proxies:
            return None
        
        if strategy == "round_robin":
            proxy = self.working_proxies[self.current_index % len(self.working_proxies)]
            self.current_index += 1
            return proxy
        elif strategy == "performance":
            # Select proxy with best success rate
            best_proxy = min(
                self.working_proxies,
                key=lambda p: self.proxy_performance.get(p, {}).get("fail_count", 0)
            )
            return best_proxy
        else:  # random
            return random.choice(self.working_proxies)
    
    def get_proxy_chain(self, chain_length: int = 2) -> List[str]:
        """Get a chain of proxies for multi-hop routing"""
        if len(self.working_proxies) < chain_length:
            return self.working_proxies.copy()
        
        return random.sample(self.working_proxies, chain_length)
    
    def report_success(self, proxy: str, latency: float):
        """Report successful proxy usage"""
        if proxy in self.proxy_performance:
            perf = self.proxy_performance[proxy]
            perf["success_count"] += 1
            # Update running average latency
            total = perf["success_count"] + perf["fail_count"]
            perf["avg_latency"] = (perf["avg_latency"] * (total - 1) + latency) / total
    
    def report_failure(self, proxy: str):
        """Report proxy failure"""
        if proxy in self.proxy_performance:
            perf = self.proxy_performance[proxy]
            perf["fail_count"] += 1
            
            # Remove from working list if failure rate too high
            total = perf["success_count"] + perf["fail_count"]
            if total >= 10 and perf["fail_count"] / total > 0.5:
                self.working_proxies.remove(proxy)
                self.failed_proxies.append(proxy)
    
    def add_tor_support(self, tor_port: int = 9050):
        """Add TOR as a proxy option"""
        tor_proxy = f"socks5://127.0.0.1:{tor_port}"
        if tor_proxy not in self.proxy_list:
            self.proxy_list.append(tor_proxy)
