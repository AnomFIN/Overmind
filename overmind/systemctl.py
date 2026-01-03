"""
System service control wrapper
Provides methods to start, stop, and restart the Overmind service.
"""

import subprocess
import sys
from typing import Tuple, Optional


class ServiceController:
    """Controls Overmind service via systemctl or process management"""
    
    def __init__(self, service_name: str = "overmind"):
        self.service_name = service_name
        self.use_systemctl = self._check_systemctl_available()
    
    def _check_systemctl_available(self) -> bool:
        """Check if systemctl is available on the system"""
        try:
            result = subprocess.run(
                ["systemctl", "--version"],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def get_status(self) -> Tuple[str, str]:
        """Get service status
        
        Returns:
            Tuple of (status, message)
            status: "RUNNING" | "STOPPED" | "DEGRADED" | "UNKNOWN"
        """
        if not self.use_systemctl:
            return "UNKNOWN", "systemctl not available"
        
        try:
            result = subprocess.run(
                ["systemctl", "is-active", self.service_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            status_text = result.stdout.strip()
            
            if status_text == "active":
                return "RUNNING", "Service is active and running"
            elif status_text == "inactive":
                return "STOPPED", "Service is stopped"
            elif status_text == "failed":
                return "DEGRADED", "Service has failed"
            else:
                return "UNKNOWN", f"Unknown status: {status_text}"
                
        except subprocess.TimeoutExpired:
            return "UNKNOWN", "Status check timed out"
        except Exception as e:
            return "UNKNOWN", f"Error checking status: {str(e)}"
    
    def start(self) -> Tuple[bool, str]:
        """Start the service
        
        Returns:
            Tuple of (success, message)
        """
        if not self.use_systemctl:
            return False, "systemctl not available - use 'npm start' manually"
        
        try:
            result = subprocess.run(
                ["sudo", "systemctl", "start", self.service_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return True, "Service started successfully"
            else:
                return False, f"Failed to start: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, "Start command timed out"
        except Exception as e:
            return False, f"Error starting service: {str(e)}"
    
    def stop(self) -> Tuple[bool, str]:
        """Stop the service
        
        Returns:
            Tuple of (success, message)
        """
        if not self.use_systemctl:
            return False, "systemctl not available - use Ctrl+C to stop manually"
        
        try:
            result = subprocess.run(
                ["sudo", "systemctl", "stop", self.service_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return True, "Service stopped successfully"
            else:
                return False, f"Failed to stop: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, "Stop command timed out"
        except Exception as e:
            return False, f"Error stopping service: {str(e)}"
    
    def restart(self) -> Tuple[bool, str]:
        """Restart the service
        
        Returns:
            Tuple of (success, message)
        """
        if not self.use_systemctl:
            return False, "systemctl not available - restart manually"
        
        try:
            result = subprocess.run(
                ["sudo", "systemctl", "restart", self.service_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return True, "Service restarted successfully"
            else:
                return False, f"Failed to restart: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, "Restart command timed out"
        except Exception as e:
            return False, f"Error restarting service: {str(e)}"
    
    def get_logs(self, lines: int = 50) -> Optional[str]:
        """Get service logs
        
        Args:
            lines: Number of recent log lines to retrieve
            
        Returns:
            Log content or None if unavailable
        """
        if not self.use_systemctl:
            return None
        
        try:
            result = subprocess.run(
                ["journalctl", "-u", self.service_name, "-n", str(lines), "--no-pager"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return None
                
        except (subprocess.TimeoutExpired, Exception):
            return None
