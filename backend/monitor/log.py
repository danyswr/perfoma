import os
import json
from datetime import datetime
from typing import Dict, Any, List
from server.config import settings
import aiofiles
import logging

def setup_logging():
    """Setup Python's built-in logging system"""
    log_dir = settings.LOG_DIR
    log_file = os.path.join(
        log_dir,
        f"system_{datetime.now().strftime('%Y%m%d')}.log"
    )
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    
    logger = logging.getLogger(__name__)
    logger.info("Logging system initialized")
    return logger


class Logger:
    """Logging system for all agent activities"""
    
    def __init__(self):
        self.log_dir = settings.LOG_DIR
        self.findings_dir = settings.FINDINGS_DIR
        
    async def log_event(
        self,
        message: str,
        event_type: str = "info",
        metadata: Dict[str, Any] = None
    ):
        """Log an event to file"""
        
        timestamp = datetime.now().isoformat()
        
        log_entry = {
            "timestamp": timestamp,
            "type": event_type,
            "message": message,
            "metadata": metadata or {}
        }
        
        # Main log file
        log_file = os.path.join(
            self.log_dir,
            f"agent_system_{datetime.now().strftime('%Y%m%d')}.log"
        )
        
        async with aiofiles.open(log_file, 'a') as f:
            await f.write(json.dumps(log_entry) + "\n")
    
    async def write_finding(self, agent_id: str, content: str):
        """Write finding to findings file"""
        
        findings_file = os.path.join(
            self.findings_dir,
            f"findings_{datetime.now().strftime('%Y%m%d')}.txt"
        )
        
        timestamp = datetime.now().isoformat()
        
        async with aiofiles.open(findings_file, 'a') as f:
            await f.write(f"\n[{timestamp}] [{agent_id}]\n")
            await f.write(content + "\n")
            await f.write("-" * 80 + "\n")


class ReportGenerator:
    """Generate reports from findings"""
    
    def __init__(self, shared_knowledge: Dict):
        self.shared_knowledge = shared_knowledge
        self.findings_dir = settings.FINDINGS_DIR
        
    async def generate_pdf(self) -> str:
        """Generate PDF report (placeholder - requires reportlab)"""
        
        filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(self.findings_dir, filename)
        
        # TODO: Implement PDF generation with reportlab
        # For now, just create a placeholder
        
        return filepath
    
    async def generate_html(self) -> str:
        """Generate HTML report"""
        
        filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        filepath = os.path.join(self.findings_dir, filename)
        
        findings = self.shared_knowledge.get("findings", [])
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Cyber Security Assessment Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        h1 {{ color: #333; }}
        .finding {{ border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }}
        .critical {{ border-left: 5px solid #dc3545; }}
        .high {{ border-left: 5px solid #fd7e14; }}
        .medium {{ border-left: 5px solid #ffc107; }}
        .low {{ border-left: 5px solid #28a745; }}
        .info {{ border-left: 5px solid #17a2b8; }}
        .meta {{ color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <h1>Cyber Security Assessment Report</h1>
    <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    <p>Total Findings: {len(findings)}</p>
    
    <h2>Findings</h2>
"""
        
        for finding in findings:
            severity = finding.get("severity", "Info").lower()
            html_content += f"""
    <div class="finding {severity}">
        <strong>{finding.get("severity", "Info")}</strong>
        <p>{finding.get("content", "")}</p>
        <div class="meta">
            Agent: {finding.get("agent_id", "Unknown")} | 
            Target: {finding.get("target", "Unknown")} | 
            Time: {finding.get("timestamp", "Unknown")}
        </div>
    </div>
"""
        
        html_content += """
</body>
</html>
"""
        
        async with aiofiles.open(filepath, 'w') as f:
            await f.write(html_content)
        
        return filepath
    
    async def export_json(self) -> str:
        """Export findings as JSON"""
        
        filename = f"findings_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(self.findings_dir, filename)
        
        data = {
            "timestamp": datetime.now().isoformat(),
            "findings": self.shared_knowledge.get("findings", []),
            "messages": self.shared_knowledge.get("messages", [])
        }
        
        async with aiofiles.open(filepath, 'w') as f:
            await f.write(json.dumps(data, indent=2))
        
        return filepath
