import random
from typing import Dict, Tuple

class FingerprintRandomizer:
    """Randomize browser fingerprints to avoid tracking"""
    
    def __init__(self):
        self.current_fingerprint = self._generate_fingerprint()
    
    def _generate_fingerprint(self) -> Dict:
        """Generate a realistic browser fingerprint"""
        
        # Screen resolutions
        resolutions = [
            (1920, 1080), (1366, 768), (1440, 900),
            (2560, 1440), (1280, 720), (1600, 900)
        ]
        screen_width, screen_height = random.choice(resolutions)
        
        # Color depths
        color_depth = random.choice([24, 32])
        
        # Timezones
        timezones = [-8, -7, -5, -4, 0, 1, 2, 8, 9]  # Common timezones
        
        # Languages
        languages = [
            "en-US", "en-GB", "en-CA",
            "de-DE", "fr-FR", "es-ES"
        ]
        
        # Platform
        platforms = [
            "Win32", "MacIntel", "Linux x86_64"
        ]
        
        fingerprint = {
            "screen_width": screen_width,
            "screen_height": screen_height,
            "color_depth": color_depth,
            "timezone_offset": random.choice(timezones) * 60,
            "language": random.choice(languages),
            "platform": random.choice(platforms),
            "hardware_concurrency": random.choice([2, 4, 8, 12, 16]),
            "device_memory": random.choice([4, 8, 16, 32]),
            "do_not_track": random.choice(["1", "0", None]),
        }
        
        return fingerprint
    
    def get_fingerprint(self) -> Dict:
        """Get current fingerprint"""
        return self.current_fingerprint.copy()
    
    def rotate_fingerprint(self):
        """Generate new fingerprint"""
        self.current_fingerprint = self._generate_fingerprint()
    
    def apply_to_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """Apply fingerprint data to HTTP headers where possible"""
        
        headers = headers.copy()
        
        if self.current_fingerprint.get("do_not_track"):
            headers["DNT"] = self.current_fingerprint["do_not_track"]
        
        headers["Accept-Language"] = self.current_fingerprint["language"]
        
        return headers
