"""
Comprehensive list of allowed tools and commands for autonomous agents
Organized by category for efficient vulnerability assessment and penetration testing
"""

ALLOWED_TOOLS = {
    # Network Reconnaissance & Scanning
    "network_recon": {
        "nmap", "rustscan", "masscan", "zmap", "naabu", "scapy", "hping3", "nping",
        "arp-scan", "netdiscover", "fping", "dnsrecon", "dnsenum", "dnsmap", "dnswalk",
        "altdns", "amass", "subfinder", "assetfinder", "findomain", "httprobe", "httpx",
        "waybackurls", "gau", "gospider", "katana", "dnsx", "massdns", "puredns",
        "shuffledns", "gotator", "ripgen", "whoami", "whois", "dig", "nslookup",
    },
    
    # Web Application Scanning
    "web_scanning": {
        "nikto", "sqlmap", "dirb", "gobuster", "wfuzz", "ffuf", "aquatone", "eyewitness",
        "gowitness", "whatweb", "wappalyzer-cli", "webanalyze", "cmseek", "cmsmap",
        "droopescan", "joomscan", "wpscan", "drupwn", "burpsuite", "zaproxy",
        "nuclei", "masscan", "curl", "wget", "httpx", "wafw00f", "cmsploit",
    },
    
    # Vulnerability Scanning
    "vuln_scanning": {
        "trivy", "grype", "snyk", "sonarqube", "clair", "anchore", "semgrep",
        "checkov", "terrascan", "tfsec", "fusionex", "openscap", "lynis",
        "aide", "osquery", "auditd", "ossec", "zeek", "suricata",
    },
    
    # Exploitation & Post-Exploitation
    "exploitation": {
        "metasploit", "msfvenom", "msfconsole", "searchsploit", "exploit-db",
        "routersploit", "commix", "joomlavs", "droopescan", "joomscan",
        "wpscan", "sqlmap", "hydra", "medusa", "hashcat", "john",
    },
    
    # Credential Attacks
    "credential_attacks": {
        "hydra", "medusa", "ncrack", "hashcat", "john", "mimikatz", "hashicorp-vault",
        "lastpass-cli", "1password-cli", "bitwarden-cli", "keepass", "pass",
        "aircrack-ng", "cowpatty", "hashcat-gui", "ophcrack",
    },
    
    # Social Engineering & Phishing
    "social_engineering": {
        "gophish", "evilginx2", "phishlabs", "sendgrid", "mailchimp",
        "socphisher", "setoolkit", "shellphish", "weevely", "weevely3",
    },
    
    # Wireless Attacks
    "wireless": {
        "aircrack-ng", "airmon-ng", "aireplay-ng", "airodump-ng", "airsnort",
        "kismet", "wireshark", "tcpdump", "wavemon", "wifite", "hashcat",
        "cowpatty", "asleap", "coWPAtty", "wesside-ng", "pyrit",
    },
    
    # Forensics & Memory Analysis
    "forensics": {
        "volatility", "volatility3", "binwalk", "strings", "file", "exiftool",
        "sleuthkit", "autopsy", "foremost", "scalpel", "ddrescue", "dcfldd",
        "hashdeep", "md5deep", "sha256deep", "photorec", "testdisk",
    },
    
    # Privilege Escalation
    "privesc": {
        "sudo", "su", "runas", "privilege-escalation-awesome-scripts-suite",
        "windows-privesc-check", "winpeas", "linpeas", "pspy", "gtfobins",
        "lolbas", "applocker-bypass", "uac-bypass", "cve-scripts",
    },
    
    # Container & Kubernetes
    "container": {
        "docker", "docker-compose", "podman", "kubectl", "kubeadm", "kube-bench",
        "kube-hunter", "kubeaudit", "trivy", "falco", "cdk", "peirates",
        "kubesec", "kube-score", "polaris", "kube-linter", "kubeseal",
    },
    
    # Cloud Security (AWS/Azure/GCP)
    "cloud_security": {
        "aws-cli", "aws-shell", "awsume", "aws-vault", "pacu", "cloudmapper",
        "cloudgoat", "scout2", "prowler", "parliament", "checkov", "dome9",
        "az", "azpowershell", "microburst", "stormspotter", "roadrecon",
        "gcloud", "gsutil", "gcp-iam-analyzer", "cloudsplaining",
    },
    
    # Active Directory & Kerberos
    "active_directory": {
        "crackmapexec", "impacket", "bloodhound", "sharphound", "rubeus",
        "pypykatz", "mimikatz", "secretsdump", "ntlmrelayx", "smbrelayx",
        "evil-winrm", "ldapdomaindump", "adidnsdump", "kerbrute", "kerberoast",
    },
    
    # Windows Exploitation
    "windows_tools": {
        "mimikatz", "powershell", "psexec", "wmiexec", "dcomexec", "wmic",
        "eventvwr", "tasklist", "taskkill", "schtasks", "reg", "wevtutil",
        "bcdedit", "certutil", "cipher", "compact", "cipher", "defrag",
    },
    
    # Network Monitoring & Analysis
    "network_monitoring": {
        "wireshark", "tcpdump", "tshark", "netstat", "ss", "iftop", "nethogs",
        "nettop", "vnstat", "iptraf", "bmon", "slurm", "nagios", "prometheus",
        "grafana", "elk", "splunk", "suricata", "zeek", "snort",
    },
    
    # Static Analysis & Reverse Engineering
    "reverse_engineering": {
        "ghidra", "ida", "radare2", "r2", "binary-ninja", "objdump", "nm",
        "strings", "file", "readelf", "otool", "class-dump", "jadx", "apktool",
        "dex2jar", "jd-gui", "procyon", "cfr", "decompiler", "uncompyle6",
    },
    
    # Malware Analysis
    "malware_analysis": {
        "cuckoo", "hybrid-analysis", "any.run", "virustotal", "intezer", "yara",
        "yara-scanner", "strings", "file", "binwalk", "volatility", "wireshark",
        "dnschef", "fakedns", "fakednsproxy", "tcpdump", "strace", "ltrace",
    },
    
    # Payload Generation
    "payload_generation": {
        "msfvenom", "donut", "scarecrow", "weevely", "webshell", "c99shell",
        "nc", "ncat", "netcat", "socat", "bash", "perl", "python",
        "ruby", "php", "jsp", "asp", "aspx",
    },
    
    # Fuzzing & Testing
    "fuzzing": {
        "afl", "libfuzzer", "honggfuzz", "radamsa", "dharma", "wfuzz", "ffuf",
        "burpsuite", "zaproxy", "owasp-zap", "ratproxy", "proxystrike",
    },
    
    # API Security
    "api_security": {
        "postman", "insomnia", "apigee", "swagger-ui", "openapi-generator",
        "owasp-apiscan", "burpsuite", "zaproxy", "vaurien", "mitmproxy",
    },
    
    # Security Compliance
    "compliance": {
        "openscap", "inspec", "compliance-operator", "osquery", "falco",
        "auditd", "aide", "aide2", "tripwire", "samhain", "chkrootkit",
    },
    
    # Development Tools
    "dev_tools": {
        "git", "curl", "wget", "python", "python3", "pip", "npm", "node",
        "java", "javac", "gcc", "make", "cmake", "docker", "docker-compose",
        "vim", "nano", "sed", "awk", "grep", "sort", "uniq", "cat",
    },
    
    # System Information & Enumeration
    "system_info": {
        "uname", "whoami", "hostname", "ifconfig", "ip", "route", "netstat",
        "ss", "ps", "top", "htop", "lsof", "lsb_release", "cat", "ls", "id",
        "groups", "sudo", "sudoedit", "dmesg", "dumpdb", "dumpstate",
    },

    # OSINT Tools
    "osint": {
        "recon-ng", "theHarvester", "shodan", "censys", "whois", "asn",
        "aiodns", "pycurl", "requests", "selenium", "scrapy", "beautifulsoup",
        "lxml", "xpath", "csv", "json",
    },

    # Database Tools
    "database": {
        "sqlmap", "sqlninja", "jsql", "sqlplus", "mysql", "postgresql", "sqlite3",
        "mongosh", "redis-cli", "cassandra-cli", "elasticsearch", "kibana",
    },
}

# Flatten to a single set for quick lookup
ALL_ALLOWED_TOOLS = set()
for tools in ALLOWED_TOOLS.values():
    ALL_ALLOWED_TOOLS.update(tools)

def is_tool_allowed(tool_name: str) -> bool:
    """Check if a tool is in the allowed list"""
    # Extract just the tool name (first word before any flags/args)
    tool = tool_name.split()[0] if tool_name else ""
    
    # Handle common patterns
    if tool.startswith("RUN "):
        tool = tool[4:].split()[0]
    
    return tool.lower() in ALL_ALLOWED_TOOLS

def get_allowed_tools_by_category() -> dict:
    """Get all allowed tools organized by category"""
    return ALLOWED_TOOLS

def get_tool_category(tool_name: str) -> str:
    """Get category of a tool"""
    tool = tool_name.split()[0].lower()
    if tool.startswith("RUN "):
        tool = tool[4:].split()[0].lower()
    
    for category, tools in ALLOWED_TOOLS.items():
        if tool in tools:
            return category
    return "unknown"

# List of FORBIDDEN tools and commands (explicit blocklist for safety)
FORBIDDEN_PATTERNS = {
    "rm -rf",  # Dangerous recursive delete
    "mkfs",    # Format filesystem
    "dd if=/dev/zero",  # Wipe disk
    "chmod 777 /",  # Change root permissions
    "chown root /",  # Change root ownership
    "kill -9 1",  # Kill init process
    "reboot",  # System reboot
    "shutdown",  # System shutdown
    "halt",  # System halt
    "init 0",  # Change runlevel
    "telinit 0",  # Change runlevel
    ":(){:|:&};:",  # Fork bomb
    "while true;",  # Infinite loop
    "$(", # Command substitution - too open
}

def is_dangerous_command(command: str) -> bool:
    """Check if command matches dangerous patterns"""
    for pattern in FORBIDDEN_PATTERNS:
        if pattern.lower() in command.lower():
            return True
    return False
