import random
import asyncio
from typing import Tuple, Optional
import math

class TimingRandomizer:
    """Advanced timing randomization to avoid detection patterns"""
    
    def __init__(
        self,
        min_delay: float = 1.0,
        max_delay: float = 5.0,
        strategy: str = "exponential"
    ):
        """
        Initialize timing randomizer
        
        Args:
            min_delay: Minimum delay in seconds
            max_delay: Maximum delay in seconds
            strategy: 'uniform', 'exponential', 'gaussian', or 'human_like'
        """
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.strategy = strategy
        self.request_count = 0
        
    def get_delay(self) -> float:
        """Get next delay based on strategy"""
        
        self.request_count += 1
        
        if self.strategy == "uniform":
            return random.uniform(self.min_delay, self.max_delay)
        
        elif self.strategy == "exponential":
            # Exponential distribution - more short delays, fewer long delays
            rate = 1.0 / ((self.min_delay + self.max_delay) / 2)
            delay = random.expovariate(rate)
            return max(self.min_delay, min(delay, self.max_delay))
        
        elif self.strategy == "gaussian":
            # Gaussian/normal distribution around midpoint
            mean = (self.min_delay + self.max_delay) / 2
            std_dev = (self.max_delay - self.min_delay) / 6  # 99.7% within range
            delay = random.gauss(mean, std_dev)
            return max(self.min_delay, min(delay, self.max_delay))
        
        elif self.strategy == "human_like":
            # Simulate human behavior with occasional pauses
            if random.random() < 0.1:  # 10% chance of longer pause
                return random.uniform(self.max_delay * 2, self.max_delay * 4)
            else:
                return random.uniform(self.min_delay, self.max_delay)
        
        else:
            return random.uniform(self.min_delay, self.max_delay)
    
    async def wait(self):
        """Async wait with calculated delay"""
        delay = self.get_delay()
        await asyncio.sleep(delay)
    
    def get_adaptive_delay(self, error_occurred: bool = False) -> float:
        """
        Get adaptive delay that increases after errors (like rate limiting)
        
        Args:
            error_occurred: Whether an error occurred (e.g., rate limit hit)
        """
        if error_occurred:
            # Exponential backoff
            backoff_factor = min(2 ** (self.request_count % 5), 32)
            return min(self.max_delay * backoff_factor, 300)  # Max 5 minutes
        
        return self.get_delay()
    
    def get_jittered_interval(self, base_interval: float, jitter: float = 0.3) -> float:
        """
        Add jitter to a base interval to avoid predictable patterns
        
        Args:
            base_interval: Base time interval
            jitter: Jitter factor (0.0 to 1.0)
        """
        jitter_amount = base_interval * jitter
        return base_interval + random.uniform(-jitter_amount, jitter_amount)
