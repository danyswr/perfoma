import random
from typing import List

class UserAgentRotator:
    """Advanced user agent rotation with realistic browser fingerprints"""
    
    # Comprehensive user agent database
    USER_AGENTS = {
        "chrome_windows": [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        ],
        "firefox_windows": [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        ],
        "chrome_mac": [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        ],
        "safari_mac": [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        ],
        "chrome_linux": [
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        ],
        "firefox_linux": [
            "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
        ],
        "mobile_android": [
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
        ],
        "mobile_ios": [
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        ]
    }
    
    def __init__(self, strategy: str = "random"):
        """
        Initialize user agent rotator
        
        Args:
            strategy: 'random', 'weighted', or 'sequential'
        """
        self.strategy = strategy
        self.current_index = 0
        self.all_agents = self._flatten_agents()
        
    def _flatten_agents(self) -> List[str]:
        """Flatten all user agents into single list"""
        agents = []
        for category_agents in self.USER_AGENTS.values():
            agents.extend(category_agents)
        return agents
    
    def get_user_agent(self, category: str = None) -> str:
        """Get next user agent based on strategy"""
        
        if category and category in self.USER_AGENTS:
            agents = self.USER_AGENTS[category]
        else:
            agents = self.all_agents
        
        if self.strategy == "sequential":
            agent = agents[self.current_index % len(agents)]
            self.current_index += 1
            return agent
        elif self.strategy == "weighted":
            # Weight towards more common browsers (Chrome/Windows)
            weights = [3 if "Chrome" in ua and "Windows" in ua else 1 for ua in agents]
            return random.choices(agents, weights=weights)[0]
        else:  # random
            return random.choice(agents)
    
    def get_headers(self, include_extra: bool = True) -> dict:
        """Get realistic HTTP headers with random user agent"""
        
        user_agent = self.get_user_agent()
        
        headers = {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": random.choice([
                "en-US,en;q=0.9",
                "en-GB,en;q=0.9",
                "en-US,en;q=0.5",
            ]),
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
        
        if include_extra:
            # Add random extra headers for realism
            extra_headers = {
                "Sec-Fetch-Dest": random.choice(["document", "empty"]),
                "Sec-Fetch-Mode": random.choice(["navigate", "cors"]),
                "Sec-Fetch-Site": random.choice(["none", "same-origin", "cross-site"]),
                "Cache-Control": random.choice(["max-age=0", "no-cache"]),
            }
            headers.update(extra_headers)
        
        return headers
