import random
import string
from typing import Dict, List
import hashlib

class TrafficObfuscator:
    """Traffic obfuscation techniques to avoid pattern detection"""
    
    def __init__(self):
        self.dummy_params = self._generate_dummy_params()
        
    def _generate_dummy_params(self) -> List[str]:
        """Generate realistic-looking dummy parameter names"""
        return [
            "utm_source", "utm_medium", "utm_campaign",
            "ref", "source", "campaign_id", "gclid", "fbclid",
            "session_id", "timestamp", "nonce", "cache_buster",
            "client_id", "user_id", "tracking_id", "request_id"
        ]
    
    def add_dummy_parameters(self, url: str, count: int = None) -> str:
        """
        Add dummy parameters to URL to obfuscate real intent
        
        Args:
            url: Original URL
            count: Number of dummy params to add (random if None)
        """
        if '?' not in url:
            url += '?'
        elif not url.endswith('&'):
            url += '&'
        
        if count is None:
            count = random.randint(1, 3)
        
        params = []
        for _ in range(count):
            param_name = random.choice(self.dummy_params)
            param_value = self._generate_random_value()
            params.append(f"{param_name}={param_value}")
        
        return url + '&'.join(params)
    
    def _generate_random_value(self) -> str:
        """Generate realistic random parameter value"""
        value_types = [
            lambda: ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)),
            lambda: str(random.randint(100000, 999999)),
            lambda: hashlib.md5(str(random.random()).encode()).hexdigest()[:16],
        ]
        return random.choice(value_types)()
    
    def randomize_parameter_order(self, url: str) -> str:
        """Randomize the order of URL parameters"""
        if '?' not in url:
            return url
        
        base_url, params = url.split('?', 1)
        param_list = params.split('&')
        random.shuffle(param_list)
        
        return base_url + '?' + '&'.join(param_list)
    
    def add_random_headers(self, base_headers: Dict[str, str]) -> Dict[str, str]:
        """Add random but realistic headers"""
        additional_headers = {}
        
        # Random referer
        if random.random() > 0.5:
            referers = [
                "https://www.google.com/",
                "https://www.bing.com/",
                "https://duckduckgo.com/",
                "https://github.com/",
            ]
            additional_headers["Referer"] = random.choice(referers)
        
        # Random viewport size
        if random.random() > 0.7:
            widths = [1920, 1366, 1440, 2560, 1280]
            heights = [1080, 768, 900, 1440, 720]
            additional_headers["Viewport-Width"] = str(random.choice(widths))
            additional_headers["Viewport-Height"] = str(random.choice(heights))
        
        return {**base_headers, **additional_headers}
    
    def generate_realistic_cookies(self) -> Dict[str, str]:
        """Generate realistic-looking cookies"""
        cookies = {}
        
        # Session cookie
        cookies["session_id"] = hashlib.sha256(
            str(random.random()).encode()
        ).hexdigest()[:32]
        
        # Tracking cookies
        if random.random() > 0.5:
            cookies["_ga"] = f"GA1.2.{random.randint(100000000, 999999999)}.{random.randint(1000000000, 9999999999)}"
        
        if random.random() > 0.6:
            cookies["_gid"] = f"GA1.2.{random.randint(100000000, 999999999)}.{random.randint(1000000000, 9999999999)}"
        
        return cookies
