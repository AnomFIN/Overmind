"""
System metrics and online user tracking
Provides real-time CPU, RAM, disk, load average, and online visitor statistics.
"""

import psutil
import time
from typing import Dict, Any
from pathlib import Path
import json


class MetricsCollector:
    """Collects system metrics and online statistics"""
    
    def __init__(self, data_dir: Path = None):
        self.data_dir = data_dir or Path(__file__).parent.parent / "data"
        self.start_time = time.time()
        
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system resource metrics"""
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        load_avg = psutil.getloadavg()
        
        return {
            "cpu_percent": cpu_percent,
            "memory": {
                "total": mem.total,
                "used": mem.used,
                "available": mem.available,
                "percent": mem.percent
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent
            },
            "load_avg": {
                "1min": load_avg[0],
                "5min": load_avg[1],
                "15min": load_avg[2]
            }
        }
    
    def get_uploads_disk_usage(self, uploads_dir: Path) -> Dict[str, int]:
        """Get disk usage for uploads directory"""
        total_size = 0
        file_count = 0
        
        if uploads_dir.exists():
            for file_path in uploads_dir.iterdir():
                if file_path.is_file() and not file_path.name.endswith('.meta.json'):
                    try:
                        total_size += file_path.stat().st_size
                        file_count += 1
                    except (OSError, PermissionError):
                        pass
        
        return {
            "total_bytes": total_size,
            "file_count": file_count
        }
    
    def get_uptime_seconds(self) -> float:
        """Get server uptime in seconds"""
        return time.time() - self.start_time
    
    def get_version_info(self) -> Dict[str, str]:
        """Get application version information"""
        try:
            package_json = Path(__file__).parent.parent / "package.json"
            if package_json.exists():
                with open(package_json) as f:
                    data = json.load(f)
                    return {
                        "version": data.get("version", "unknown"),
                        "name": data.get("name", "overmind")
                    }
        except Exception:
            pass
        
        return {
            "version": "1.0.0",
            "name": "overmind"
        }
    
    def format_bytes(self, bytes_val: int) -> str:
        """Format bytes to human-readable string"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_val < 1024.0:
                return f"{bytes_val:.2f} {unit}"
            bytes_val /= 1024.0
        return f"{bytes_val:.2f} PB"
