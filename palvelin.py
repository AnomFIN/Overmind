#!/usr/bin/env python3
"""
Palvelin.py - Overmind Server Management Terminal GUI
A reactive TUI for managing the Overmind dashboard server.
"""

import sys
import os
import subprocess
import json
from pathlib import Path
from datetime import datetime, timedelta
import asyncio
import httpx

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical, VerticalScroll
from textual.widgets import Header, Footer, Static, Button, Label, DataTable
from textual.reactive import reactive
from textual import work
from rich.text import Text

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from overmind.metrics import MetricsCollector
from overmind.uploads import UploadManager
from overmind.systemctl import ServiceController


class StatusCard(Static):
    """Widget for displaying status information"""
    
    def __init__(self, title: str, value: str = "", classes: str = ""):
        super().__init__(classes=classes)
        self.title = title
        self.value_text = value
    
    def compose(self) -> ComposeResult:
        yield Label(self.title, classes="card-title")
        yield Label(self.value_text, id=f"value-{self.title.lower().replace(' ', '-')}", classes="card-value")
    
    def update_value(self, value: str):
        """Update the displayed value"""
        self.value_text = value
        value_label = self.query_one(f"#value-{self.title.lower().replace(' ', '-')}")
        value_label.update(value)


class MetricsPanel(Static):
    """Panel for displaying system metrics"""
    
    cpu_percent = reactive(0.0)
    memory_used = reactive(0)
    memory_total = reactive(0)
    memory_percent = reactive(0.0)
    disk_used = reactive(0)
    disk_total = reactive(0)
    disk_percent = reactive(0.0)
    load_1 = reactive(0.0)
    load_5 = reactive(0.0)
    load_15 = reactive(0.0)
    
    def compose(self) -> ComposeResult:
        yield Label("System Resources", classes="panel-title")
        yield Label("", id="cpu-metric", classes="metric-line")
        yield Label("", id="memory-metric", classes="metric-line")
        yield Label("", id="disk-metric", classes="metric-line")
        yield Label("", id="load-metric", classes="metric-line")
    
    def watch_cpu_percent(self, value: float):
        self.query_one("#cpu-metric").update(f"CPU: {value:.1f}%")
    
    def watch_memory_percent(self, value: float):
        mem_gb_used = self.memory_used / (1024**3)
        mem_gb_total = self.memory_total / (1024**3)
        self.query_one("#memory-metric").update(
            f"RAM: {mem_gb_used:.2f} GB / {mem_gb_total:.2f} GB ({value:.1f}%)"
        )
    
    def watch_disk_percent(self, value: float):
        disk_gb_used = self.disk_used / (1024**3)
        disk_gb_total = self.disk_total / (1024**3)
        self.query_one("#disk-metric").update(
            f"Disk: {disk_gb_used:.2f} GB / {disk_gb_total:.2f} GB ({value:.1f}%)"
        )
    
    def watch_load_1(self, value: float):
        self.query_one("#load-metric").update(
            f"Load: {self.load_1:.2f} / {self.load_5:.2f} / {self.load_15:.2f}"
        )


class OnlinePanel(Static):
    """Panel for displaying online visitors"""
    
    online_now = reactive(0)
    peak_today = reactive(0)
    requests_per_min = reactive(0.0)
    
    def compose(self) -> ComposeResult:
        yield Label("Online Visitors", classes="panel-title")
        yield Label("", id="online-now", classes="metric-line")
        yield Label("", id="peak-today", classes="metric-line")
        yield Label("", id="requests-per-min", classes="metric-line")
    
    def watch_online_now(self, value: int):
        self.query_one("#online-now").update(f"Online Now: {value}")
    
    def watch_peak_today(self, value: int):
        self.query_one("#peak-today").update(f"Peak Today: {value}")
    
    def watch_requests_per_min(self, value: float):
        self.query_one("#requests-per-min").update(f"Requests/min: {value:.1f}")


class UploadsPanel(Static):
    """Panel for displaying uploads information"""
    
    total_bytes = reactive(0)
    max_bytes = reactive(5 * 1024**3)
    file_count = reactive(0)
    expiring_soon = reactive(0)
    
    def compose(self) -> ComposeResult:
        yield Label("Uploads Status", classes="panel-title")
        yield Label("", id="uploads-size", classes="metric-line")
        yield Label("", id="uploads-count", classes="metric-line")
        yield Label("", id="uploads-expiring", classes="metric-line")
    
    def watch_total_bytes(self, value: int):
        used_gb = value / (1024**3)
        max_gb = self.max_bytes / (1024**3)
        percent = (value / self.max_bytes * 100) if self.max_bytes > 0 else 0
        
        # Add warning if over 90%
        warning = " ⚠️ " if percent > 90 else ""
        self.query_one("#uploads-size").update(
            f"Size: {used_gb:.2f} GB / {max_gb:.2f} GB ({percent:.1f}%){warning}"
        )
    
    def watch_file_count(self, value: int):
        self.query_one("#uploads-count").update(f"Files: {value}")
    
    def watch_expiring_soon(self, value: int):
        self.query_one("#uploads-expiring").update(f"Expiring Soon (< 5 min): {value}")


class PalvelinApp(App):
    """Overmind Server Management TUI"""
    
    CSS = """
    Screen {
        background: $surface;
    }
    
    .panel-title {
        text-style: bold;
        color: $accent;
        margin: 1 0;
    }
    
    .card-title {
        text-style: bold;
        color: $primary;
    }
    
    .card-value {
        color: $text;
        margin: 0 0 1 0;
    }
    
    .metric-line {
        color: $text;
        margin: 0 0 0 2;
    }
    
    .status-running {
        background: $success;
        color: $text;
        padding: 1 2;
        margin: 1;
    }
    
    .status-stopped {
        background: $error;
        color: $text;
        padding: 1 2;
        margin: 1;
    }
    
    .status-unknown {
        background: $warning;
        color: $text;
        padding: 1 2;
        margin: 1;
    }
    
    Button {
        margin: 0 1;
    }
    
    #main-container {
        height: 100%;
    }
    
    #status-bar {
        height: 5;
        border: solid $primary;
        margin: 1;
    }
    
    #metrics-container {
        height: auto;
    }
    
    #left-panel {
        width: 1fr;
        border: solid $primary;
        margin: 1;
        padding: 1;
    }
    
    #right-panel {
        width: 1fr;
        border: solid $primary;
        margin: 1;
        padding: 1;
    }
    
    #controls {
        height: 5;
        border: solid $primary;
        margin: 1;
        padding: 1;
    }
    
    #message-bar {
        height: 3;
        background: $panel;
        color: $text;
        padding: 1;
    }
    """
    
    BINDINGS = [
        ("s", "start_service", "Start"),
        ("t", "stop_service", "Stop"),
        ("r", "restart_service", "Restart"),
        ("c", "cleanup", "Cleanup"),
        ("l", "view_logs", "Logs"),
        ("q", "quit", "Quit"),
    ]
    
    def __init__(self):
        super().__init__()
        self.project_root = Path(__file__).parent
        self.uploads_dir = self.project_root / "uploads"
        
        # Initialize managers
        self.metrics_collector = MetricsCollector()
        self.upload_manager = UploadManager(self.uploads_dir)
        self.service_controller = ServiceController()
        
        # API configuration
        self.api_base_url = "http://localhost:3000"
        self.message = ""
    
    def compose(self) -> ComposeResult:
        yield Header()
        
        with VerticalScroll(id="main-container"):
            # Status bar
            with Container(id="status-bar"):
                yield Label("Service Status: Loading...", id="service-status")
                yield Label("Uptime: --", id="uptime")
                yield Label("Version: --", id="version")
            
            # Metrics panels
            with Horizontal(id="metrics-container"):
                with Vertical(id="left-panel"):
                    yield MetricsPanel(id="metrics")
                    yield OnlinePanel(id="online")
                
                with Vertical(id="right-panel"):
                    yield UploadsPanel(id="uploads")
            
            # Message bar
            yield Label("", id="message-bar")
        
        yield Footer()
    
    def on_mount(self) -> None:
        """Start updating metrics when app starts"""
        self.update_metrics()
    
    @work(exclusive=True)
    async def update_metrics(self):
        """Background worker to update all metrics"""
        while True:
            try:
                # Update system metrics
                sys_metrics = self.metrics_collector.get_system_metrics()
                metrics_panel = self.query_one("#metrics", MetricsPanel)
                metrics_panel.cpu_percent = sys_metrics["cpu_percent"]
                metrics_panel.memory_used = sys_metrics["memory"]["used"]
                metrics_panel.memory_total = sys_metrics["memory"]["total"]
                metrics_panel.memory_percent = sys_metrics["memory"]["percent"]
                metrics_panel.disk_used = sys_metrics["disk"]["used"]
                metrics_panel.disk_total = sys_metrics["disk"]["total"]
                metrics_panel.disk_percent = sys_metrics["disk"]["percent"]
                metrics_panel.load_1 = sys_metrics["load_avg"]["1min"]
                metrics_panel.load_5 = sys_metrics["load_avg"]["5min"]
                metrics_panel.load_15 = sys_metrics["load_avg"]["15min"]
                
                # Update service status
                status, status_msg = self.service_controller.get_status()
                status_label = self.query_one("#service-status")
                status_label.update(f"Service Status: {status}")
                
                # Get metrics from API
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(f"{self.api_base_url}/api/admin/metrics", timeout=2.0)
                        if response.status_code == 200:
                            api_metrics = response.json()
                            
                            # Update online panel
                            online_panel = self.query_one("#online", OnlinePanel)
                            online_panel.online_now = api_metrics.get("onlineNow", 0)
                            online_panel.peak_today = api_metrics.get("peakToday", 0)
                            online_panel.requests_per_min = api_metrics.get("requestsPerMinute", 0)
                            
                            # Update uptime and version
                            uptime_sec = api_metrics.get("uptimeSeconds", 0)
                            uptime_str = self.format_uptime(uptime_sec)
                            self.query_one("#uptime").update(f"Uptime: {uptime_str}")
                            self.query_one("#version").update(f"Version: {api_metrics.get('version', 'unknown')}")
                except httpx.RequestError:
                    # Server might not be running
                    pass
                
                # Update uploads info
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(f"{self.api_base_url}/api/admin/uploads", timeout=2.0)
                        if response.status_code == 200:
                            uploads_data = response.json()
                            uploads_panel = self.query_one("#uploads", UploadsPanel)
                            uploads_panel.total_bytes = uploads_data.get("totalBytes", 0)
                            uploads_panel.max_bytes = uploads_data.get("maxBytes", 5 * 1024**3)
                            uploads_panel.file_count = uploads_data.get("fileCount", 0)
                            uploads_panel.expiring_soon = uploads_data.get("expiringSoon", 0)
                except httpx.RequestError:
                    pass
                
            except Exception as e:
                self.show_message(f"Error updating metrics: {str(e)}", error=True)
            
            await asyncio.sleep(1)  # Update every second
    
    def format_uptime(self, seconds: int) -> str:
        """Format uptime in human-readable format"""
        days = seconds // 86400
        hours = (seconds % 86400) // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m {secs}s"
    
    def show_message(self, message: str, error: bool = False):
        """Show a message in the message bar"""
        msg_bar = self.query_one("#message-bar")
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = "ERROR" if error else "INFO"
        msg_bar.update(f"[{timestamp}] {prefix}: {message}")
    
    def action_start_service(self):
        """Start the Overmind service"""
        success, message = self.service_controller.start()
        self.show_message(f"Start service: {message}", error=not success)
    
    def action_stop_service(self):
        """Stop the Overmind service"""
        success, message = self.service_controller.stop()
        self.show_message(f"Stop service: {message}", error=not success)
    
    def action_restart_service(self):
        """Restart the Overmind service"""
        success, message = self.service_controller.restart()
        self.show_message(f"Restart service: {message}", error=not success)
    
    def action_cleanup(self):
        """Run cleanup now"""
        self.run_cleanup()
    
    @work(exclusive=True)
    async def run_cleanup(self):
        """Run cleanup in background"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{self.api_base_url}/api/admin/cleanup", timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    self.show_message(
                        f"Cleanup completed: {data.get('filesRemaining', 0)} files remaining"
                    )
                else:
                    self.show_message("Cleanup failed", error=True)
        except httpx.RequestError as e:
            self.show_message(f"Cleanup error: {str(e)}", error=True)
    
    def action_view_logs(self):
        """View service logs"""
        import tempfile
        
        logs = self.service_controller.get_logs(50)
        if logs:
            # Create a temporary file to view logs
            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='_overmind_logs.txt', delete=False) as f:
                    log_file = Path(f.name)
                    f.write(logs)
                
                self.show_message(f"Logs saved to {log_file}")
                # Open in less viewer
                subprocess.run(["less", str(log_file)])
                
                # Clean up the temporary file after viewing
                try:
                    log_file.unlink()
                except Exception:
                    pass  # Best effort cleanup
                    
            except Exception as e:
                self.show_message(f"Error saving logs: {str(e)}", error=True)
        else:
            self.show_message("Logs not available - systemctl not configured", error=True)


def main():
    """Entry point for palvelin.py"""
    app = PalvelinApp()
    app.run()


if __name__ == "__main__":
    main()
