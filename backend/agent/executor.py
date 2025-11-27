import asyncio
import subprocess
import random
import time
from typing import Optional
from server.config import settings
from stealth.user_agent import UserAgentRotator
from stealth.proxy import ProxyChain
from stealth.timing import TimingRandomizer
from stealth.obfuscation import TrafficObfuscator
from stealth.fingerprint import FingerprintRandomizer

class CommandExecutor:
    """Executes security tool commands with advanced stealth capabilities"""
    
    def __init__(self, agent_id: str, stealth_mode: bool = False, stealth_config: dict = None):
        self.agent_id = agent_id
        self.stealth_mode = stealth_mode
        self.stealth_config = stealth_config or {}
        
        self.user_agent_rotator = UserAgentRotator(
            strategy=self.stealth_config.get("ua_strategy", "random")
        )
        self.proxy_chain = ProxyChain(
            proxy_list=self.stealth_config.get("proxies", [])
        )
        self.timing_randomizer = TimingRandomizer(
            min_delay=self.stealth_config.get("min_delay", 2.0),
            max_delay=self.stealth_config.get("max_delay", 8.0),
            strategy=self.stealth_config.get("timing_strategy", "human_like")
        )
        self.traffic_obfuscator = TrafficObfuscator()
        self.fingerprint_randomizer = FingerprintRandomizer()
        
        self.last_execution_time = 0
        self.error_count = 0
        
    async def execute(self, command: str) -> str:
        """Execute command with advanced stealth and return output"""
        
        if self.stealth_mode:
            await self._apply_stealth_delay()
        
        if self.stealth_mode:
            command = self._apply_advanced_stealth(command)
        
        try:
            # Execute command with timeout
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                shell=True
            )
            
            # Wait for completion with timeout
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=600.0  # 10 minute timeout
                )
                
                output = stdout.decode('utf-8', errors='ignore')
                error = stderr.decode('utf-8', errors='ignore')
                
                self.error_count = 0  # Reset error count on success
                self.last_execution_time = time.time()
                
                if error:
                    return f"Output:\n{output}\n\nErrors:\n{error}"
                return output
                
            except asyncio.TimeoutError:
                process.kill()
                return "Command execution timed out after 10 minutes"
                
        except Exception as e:
            self.error_count += 1
            return f"Execution error: {str(e)}"
    
    def _apply_advanced_stealth(self, command: str) -> str:
        """Apply comprehensive stealth modifications to command"""
        
        user_agent = self.user_agent_rotator.get_user_agent()
        
        proxy = self.proxy_chain.get_proxy() if self.proxy_chain.working_proxies else None
        
        # HTTP-based tools: nikto, dirb, curl, wget, whatweb
        if any(tool in command.lower() for tool in ['nikto', 'dirb', 'curl', 'wget', 'whatweb']):
            # User agent
            if 'nikto' in command.lower():
                if '-useragent' not in command.lower():
                    command += f' -useragent "{user_agent}"'
                # Add delay between requests
                if '-Pause' not in command:
                    pause = random.randint(2, 5)
                    command += f' -Pause {pause}'
                # Add proxy if available
                if proxy and '-useproxy' not in command.lower():
                    command += f' -useproxy {proxy}'
                    
            elif 'curl' in command.lower():
                if '-A' not in command and '--user-agent' not in command.lower():
                    command += f' -A "{user_agent}"'
                # Add random referer
                if '--referer' not in command.lower():
                    referers = ["https://www.google.com/", "https://www.bing.com/"]
                    command += f' --referer "{random.choice(referers)}"'
                # Add proxy
                if proxy and '-x' not in command and '--proxy' not in command.lower():
                    command += f' -x {proxy}'
                # Connection timing
                if '--connect-timeout' not in command:
                    command += ' --connect-timeout 30'
                    
            elif 'wget' in command.lower():
                if '-U' not in command and '--user-agent' not in command.lower():
                    command += f' -U "{user_agent}"'
                # Random wait between requests
                if '--wait' not in command and '--random-wait' not in command:
                    command += f' --random-wait --wait={random.randint(2,5)}'
                # Add proxy
                if proxy:
                    proxy_env = f'http_proxy={proxy} https_proxy={proxy} '
                    command = proxy_env + command
        
        # Nmap stealth configuration
        if 'nmap' in command.lower():
            # Timing template
            if '-T' not in command:
                # T2 = Polite, T3 = Normal
                timing = random.choice(['-T2', '-T3']) if self.stealth_mode else '-T3'
                command += f' {timing}'
            
            # Fragmentation
            if '-f' not in command and random.random() > 0.5:
                command += ' -f'  # Fragment packets
            
            # Decoy scans
            if '-D' not in command and random.random() > 0.6:
                # Generate random decoy IPs
                decoys = self._generate_decoy_ips(3)
                command += f' -D {",".join(decoys)},ME'
            
            # Source port randomization
            if '--source-port' not in command and random.random() > 0.5:
                port = random.choice([53, 80, 443, 8080])
                command += f' --source-port {port}'
            
            # Randomize target order
            if '--randomize-hosts' not in command:
                command += ' --randomize-hosts'
            
            # Proxy support (through proxychains)
            if proxy and 'proxychains' not in command:
                command = f'proxychains4 {command}'
        
        # SQLMap stealth
        if 'sqlmap' in command.lower():
            # Random user agent
            if '--user-agent' not in command and '--random-agent' not in command:
                command += f' --user-agent="{user_agent}"'
            
            # Delays
            if '--delay' not in command:
                command += f' --delay={random.randint(2, 5)}'
            
            # Randomize parameter value
            if '--randomize' not in command:
                command += ' --randomize=param'
            
            # Proxy
            if proxy and '--proxy' not in command:
                command += f' --proxy={proxy}'
        
        # Gobuster/Dirb stealth
        if any(tool in command.lower() for tool in ['gobuster', 'dirb', 'ffuf']):
            if 'gobuster' in command.lower():
                # User agent
                if '-a' not in command and '--useragent' not in command:
                    command += f' -a "{user_agent}"'
                # Delay
                if '--delay' not in command:
                    delay = f'{random.randint(500, 2000)}ms'
                    command += f' --delay {delay}'
                # Proxy
                if proxy and '-p' not in command and '--proxy' not in command:
                    command += f' --proxy {proxy}'
        
        return command
    
    def _generate_decoy_ips(self, count: int) -> list:
        """Generate random decoy IP addresses"""
        decoys = []
        for _ in range(count):
            ip = f"{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}"
            decoys.append(ip)
        return decoys
    
    async def _apply_stealth_delay(self):
        """Apply intelligent delay based on stealth configuration and error history"""
        
        if self.error_count > 0:
            delay = self.timing_randomizer.get_adaptive_delay(error_occurred=True)
        else:
            delay = self.timing_randomizer.get_delay()
        
        # Additional jitter
        if self.last_execution_time > 0:
            elapsed = time.time() - self.last_execution_time
            if elapsed < delay:
                await asyncio.sleep(delay - elapsed)
        else:
            await asyncio.sleep(delay)
