#!/usr/bin/env python3
"""
Overmind Production Installer (asennus.py)
Self-hosted dashboard installation script for Linux systems
Version: 1.0.0

This installer:
- Checks all prerequisites (Node.js, Python, npm, ffmpeg)
- Installs dependencies (Node and Python packages)
- Creates .env configuration file
- Tests port availability
- Offers public tunnel setup (ngrok/cloudflared)
- Provides a complete runbook for starting/stopping the server
"""

import subprocess
import sys
import os
import shutil
import json
import socket
from pathlib import Path
from typing import Optional, Tuple, List

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_banner():
    """Print installation banner"""
    banner = f"""
{Colors.BOLD}{Colors.CYAN}╔══════════════════════════════════════════════════════════════╗
║           Overmind Production Installer v1.0.0               ║
║      Self-hosted Dashboard for Linux Systems                 ║
╚══════════════════════════════════════════════════════════════╝{Colors.ENDC}
"""
    print(banner)

def print_step(step_num: int, message: str):
    """Print step header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[Step {step_num}] {message}{Colors.ENDC}")
    print("-" * 60)

def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED}✗ ERROR: {message}{Colors.ENDC}", file=sys.stderr)

def print_warning(message: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠ WARNING: {message}{Colors.ENDC}")

def print_info(message: str):
    """Print info message"""
    print(f"{Colors.CYAN}ℹ {message}{Colors.ENDC}")

def run_command(cmd: List[str], description: str, capture_output: bool = True) -> Optional[subprocess.CompletedProcess]:
    """Run a command with error handling"""
    try:
        result = subprocess.run(
            cmd,
            capture_output=capture_output,
            text=True,
            check=True
        )
        print_success(description)
        return result
    except subprocess.CalledProcessError as e:
        print_error(f"{description} failed")
        if e.stdout:
            print(f"  stdout: {e.stdout}")
        if e.stderr:
            print(f"  stderr: {e.stderr}")
        return None
    except FileNotFoundError:
        print_error(f"Command not found: {cmd[0]}")
        return None

def check_command_exists(command: str) -> bool:
    """Check if a command exists in PATH"""
    return shutil.which(command) is not None

def get_command_version(command: str, args: List[str] = ['--version']) -> Optional[str]:
    """Get version of a command"""
    try:
        result = subprocess.run(
            [command] + args,
            capture_output=True,
            text=True,
            check=True,
            timeout=5
        )
        return result.stdout.strip() or result.stderr.strip()
    except:
        return None

def check_python_version() -> Tuple[bool, str]:
    """Check Python version"""
    version = sys.version_info
    version_str = f"{version.major}.{version.minor}.{version.micro}"
    
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        return False, version_str
    return True, version_str

def check_node_version() -> Tuple[bool, Optional[str]]:
    """Check Node.js version"""
    if not check_command_exists('node'):
        return False, None
    
    version_output = get_command_version('node')
    if not version_output:
        return False, None
    
    version_str = version_output.strip().lstrip('v')
    try:
        major_version = int(version_str.split('.')[0])
        if major_version < 20:
            return False, version_str
        return True, version_str
    except:
        return True, version_str

def check_npm() -> Tuple[bool, Optional[str]]:
    """Check if npm is installed"""
    if not check_command_exists('npm'):
        return False, None
    
    version_output = get_command_version('npm')
    return True, version_output

def check_ffmpeg() -> Tuple[bool, Optional[str]]:
    """Check if ffmpeg is installed"""
    if not check_command_exists('ffmpeg'):
        return False, None
    
    version_output = get_command_version('ffmpeg', ['-version'])
    if version_output:
        # Get first line which contains version
        version_line = version_output.split('\n')[0]
        return True, version_line
    return True, "installed"

def check_disk_space(path: str, required_gb: float = 1.0) -> Tuple[bool, float]:
    """Check available disk space"""
    try:
        stat = os.statvfs(path)
        available_gb = (stat.f_bavail * stat.f_frsize) / (1024 ** 3)
        return available_gb >= required_gb, available_gb
    except:
        return True, 0  # Assume OK if check fails

def is_port_available(port: int, host: str = '0.0.0.0') -> bool:
    """Check if a port is available"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((host, port))
        sock.close()
        return True
    except OSError:
        return False

def find_available_port(start_port: int = 3000, max_tries: int = 100) -> Optional[int]:
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_tries):
        if is_port_available(port):
            return port
    return None

def install_missing_package(package: str, package_manager: str = 'apt') -> bool:
    """Attempt to install a missing package"""
    print_info(f"Attempting to install {package}...")
    
    if package_manager == 'apt':
        cmd = ['sudo', 'apt-get', 'install', '-y', package]
    elif package_manager == 'dnf':
        cmd = ['sudo', 'dnf', 'install', '-y', package]
    elif package_manager == 'yum':
        cmd = ['sudo', 'yum', 'install', '-y', package]
    else:
        print_error(f"Unknown package manager: {package_manager}")
        return False
    
    result = run_command(cmd, f"Install {package}")
    return result is not None

def detect_package_manager() -> Optional[str]:
    """Detect system package manager"""
    for pm in ['apt-get', 'dnf', 'yum', 'pacman']:
        if check_command_exists(pm):
            return pm.replace('-get', '')  # apt-get -> apt
    return None

def create_env_file(project_dir: Path, port: int) -> bool:
    """Create .env configuration file"""
    env_path = project_dir / '.env'
    
    if env_path.exists():
        response = input(f"\n{Colors.YELLOW}.env file already exists. Overwrite? [y/N]: {Colors.ENDC}").strip().lower()
        if response != 'y':
            print_info("Keeping existing .env file")
            return True
    
    # Generate secure secret key
    try:
        secret_key = subprocess.check_output(['openssl', 'rand', '-hex', '32'], text=True).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_warning("openssl not found, generating secret key with Python")
        import secrets
        secret_key = secrets.token_hex(32)
    
    env_content = f"""# Overmind Configuration
# Generated by installer on {subprocess.check_output(['date'], text=True).strip()}

# Server Configuration
PORT={port}
HOST=0.0.0.0
NODE_ENV=production

# OpenAI Configuration (Optional - for AI chat console)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=

# File Browser Configuration
# Leave empty to use home directory
FILE_BROWSER_ROOT=

# Upload Configuration  
MAX_UPLOAD_SIZE=100

# Security
# Generated secure random key (change if needed)
SECRET_KEY={secret_key}

# CORS Configuration (Optional)
# CORS_ORIGIN=https://yourdomain.com
"""
    
    try:
        env_path.write_text(env_content)
        print_success(f"Created .env file at {env_path}")
        return True
    except Exception as e:
        print_error(f"Failed to create .env file: {e}")
        return False

def create_systemd_service(project_dir: Path, port: int) -> bool:
    """Create systemd service file"""
    service_content = f"""[Unit]
Description=Overmind Dashboard Server
After=network.target

[Service]
Type=simple
User={os.getenv('USER', 'overmind')}
WorkingDirectory={project_dir}
ExecStart=/usr/bin/node {project_dir}/backend/serverIntegrated.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=overmind

# Environment
Environment=NODE_ENV=production
Environment=PORT={port}

[Install]
WantedBy=multi-user.target
"""
    
    service_path = project_dir / 'overmind.service'
    
    try:
        service_path.write_text(service_content)
        print_success(f"Created systemd service file at {service_path}")
        print_info("To install the service, run:")
        print(f"  sudo cp {service_path} /etc/systemd/system/")
        print("  sudo systemctl daemon-reload")
        print("  sudo systemctl enable overmind")
        print("  sudo systemctl start overmind")
        return True
    except Exception as e:
        print_error(f"Failed to create service file: {e}")
        return False

def print_runbook(project_dir: Path, port: int, tunnel_url: Optional[str] = None):
    """Print complete runbook for using Overmind"""
    print(f"\n{Colors.BOLD}{Colors.GREEN}╔══════════════════════════════════════════════════════════════╗")
    print("║              INSTALLATION COMPLETED SUCCESSFULLY             ║")
    print(f"╚══════════════════════════════════════════════════════════════╝{Colors.ENDC}\n")
    
    print(f"{Colors.BOLD}📚 OVERMIND RUNBOOK{Colors.ENDC}")
    print("=" * 60)
    
    print(f"\n{Colors.BOLD}🚀 Starting the Server:{Colors.ENDC}")
    print(f"  cd {project_dir}")
    print(f"  npm start")
    print(f"\n  Or with development mode (auto-reload):")
    print(f"  npm run dev")
    
    print(f"\n{Colors.BOLD}🌐 Accessing Overmind:{Colors.ENDC}")
    print(f"  Local:     http://localhost:{port}")
    print(f"  Network:   http://<your-ip>:{port}")
    if tunnel_url:
        print(f"  Public:    {tunnel_url}")
    
    print(f"\n{Colors.BOLD}⚙️  Configuration:{Colors.ENDC}")
    print(f"  Edit {project_dir}/.env to configure:")
    print("  - OpenAI API key (for AI chat)")
    print("  - File browser root directory")
    print("  - Upload size limits")
    print("  - Security settings")
    
    print(f"\n{Colors.BOLD}📊 Server Management:{Colors.ENDC}")
    print("  Using systemd (after installing service):")
    print("    sudo systemctl start overmind")
    print("    sudo systemctl stop overmind")
    print("    sudo systemctl restart overmind")
    print("    sudo systemctl status overmind")
    print("    sudo journalctl -u overmind -f  # View logs")
    
    print("  Using the TUI console:")
    print(f"    python3 {project_dir}/palvelin.py")
    
    print(f"\n{Colors.BOLD}📁 Important Files:{Colors.ENDC}")
    print(f"  Configuration:  {project_dir}/.env")
    print(f"  Data:           {project_dir}/data/*.json")
    print(f"  Logs:           sudo journalctl -u overmind")
    print(f"  Uploads:        {project_dir}/tmp_uploads/")
    print(f"  Recordings:     {project_dir}/recordings/")
    
    print(f"\n{Colors.BOLD}🔒 Security Notes:{Colors.ENDC}")
    print("  - Change the SECRET_KEY in .env")
    print("  - Keep .env file private (chmod 600)")
    print("  - Admin endpoints only work from localhost")
    print("  - Use HTTPS in production (e.g., with nginx)")
    print("  - Regular backups of data/ directory recommended")
    
    print(f"\n{Colors.BOLD}📱 PWA Features:{Colors.ENDC}")
    print("  - Access from mobile browser")
    print("  - Tap 'Add to Home Screen' for app-like experience")
    print("  - Works offline after first visit")
    print("  - Receive push notifications (future)")
    
    print(f"\n{Colors.BOLD}🆘 Troubleshooting:{Colors.ENDC}")
    print("  If server won't start:")
    print(f"    - Check port {port} is available: sudo lsof -i:{port}")
    print("    - Check logs: sudo journalctl -u overmind")
    print("    - Verify Node.js version: node --version (need 20+)")
    
    print("  If features don't work:")
    print("    - Check browser console for errors (F12)")
    print("    - Verify .env configuration")
    print("    - Ensure data/ directory is writable")
    
    print(f"\n{Colors.BOLD}🔗 Useful Commands:{Colors.ENDC}")
    print("  Test server: curl http://localhost:" + str(port) + "/api/health")
    print("  View port usage: sudo netstat -tlnp | grep " + str(port))
    print("  Check disk space: df -h")
    print("  Clear upload cache: rm -rf tmp_uploads/*")
    
    print(f"\n{Colors.BOLD}📚 Documentation:{Colors.ENDC}")
    print(f"  README:        {project_dir}/README.md")
    print("  GitHub:        https://github.com/AnomFIN/Overmind")
    
    print("\n" + "=" * 60)
    print(f"{Colors.CYAN}Happy self-hosting! 🎉{Colors.ENDC}\n")

def main():
    """Main installation flow"""
    print_banner()
    
    # Get project directory
    project_dir = Path(__file__).parent.resolve()
    print(f"Installation directory: {Colors.BOLD}{project_dir}{Colors.ENDC}\n")
    
    # Step 1: System Checks
    print_step(1, "Checking System Requirements")
    
    all_checks_passed = True
    
    # Check Python
    python_ok, python_version = check_python_version()
    if python_ok:
        print_success(f"Python {python_version} (requirement: 3.10+)")
    else:
        print_error(f"Python {python_version} found, but 3.10+ is required")
        print_info("Install Python 3.10+: sudo apt-get install python3")
        all_checks_passed = False
    
    # Check Node.js
    node_ok, node_version = check_node_version()
    if node_ok:
        print_success(f"Node.js {node_version} (requirement: 20+)")
    elif node_version:
        print_error(f"Node.js {node_version} found, but 20+ is required")
        print_info("Install Node.js 20: https://nodejs.org/")
        all_checks_passed = False
    else:
        print_error("Node.js not found")
        print_info("Install Node.js 20: https://nodejs.org/")
        all_checks_passed = False
    
    # Check npm
    npm_ok, npm_version = check_npm()
    if npm_ok:
        print_success(f"npm {npm_version}")
    else:
        print_error("npm not found (comes with Node.js)")
        all_checks_passed = False
    
    # Check ffmpeg (optional for cameras)
    ffmpeg_ok, ffmpeg_version = check_ffmpeg()
    if ffmpeg_ok:
        print_success(f"ffmpeg {ffmpeg_version} (optional, for camera features)")
    else:
        print_warning("ffmpeg not found (optional, needed for camera recording)")
        print_info("Install ffmpeg: sudo apt-get install ffmpeg")
        response = input(f"\n{Colors.YELLOW}Continue without ffmpeg? [Y/n]: {Colors.ENDC}").strip().lower()
        if response == 'n':
            all_checks_passed = False
    
    # Check disk space
    space_ok, available_gb = check_disk_space(str(project_dir), 1.0)
    if space_ok:
        print_success(f"Disk space: {available_gb:.2f} GB available")
    else:
        print_warning(f"Low disk space: {available_gb:.2f} GB available (recommend 1GB+)")
    
    if not all_checks_passed:
        print_error("\nPrerequisite checks failed. Please install missing requirements.")
        sys.exit(1)
    
    # Step 2: Install Dependencies
    print_step(2, "Installing Node.js Dependencies")
    
    if not (project_dir / 'package.json').exists():
        print_error("package.json not found")
        sys.exit(1)
    
    result = run_command(
        ['npm', 'install', '--production'],
        "Node.js packages installed",
        capture_output=False
    )
    
    if not result:
        print_error("Failed to install Node.js dependencies")
        sys.exit(1)
    
    # Step 3: Python dependencies (optional)
    print_step(3, "Installing Python Dependencies")
    
    requirements_file = project_dir / 'requirements.txt'
    if requirements_file.exists():
        result = run_command(
            ['pip3', 'install', '-r', str(requirements_file)],
            "Python packages installed"
        )
        if not result:
            print_warning("Some Python packages failed to install (optional for TUI)")
    else:
        print_info("No requirements.txt found, skipping Python dependencies")
    
    # Step 4: Port Selection
    print_step(4, "Configuring Server Port")
    
    default_port = 3000
    port_available = is_port_available(default_port)
    
    if port_available:
        print_success(f"Port {default_port} is available")
        port = default_port
    else:
        print_warning(f"Port {default_port} is already in use")
        alt_port = find_available_port(3001)
        if alt_port:
            print_info(f"Found available port: {alt_port}")
            response = input(f"\n{Colors.YELLOW}Use port {alt_port}? [Y/n]: {Colors.ENDC}").strip().lower()
            if response != 'n':
                port = alt_port
            else:
                port = int(input("Enter custom port: "))
        else:
            print_error("No available ports found in range 3000-3100")
            port = int(input("Enter custom port: "))
    
    # Step 5: Create Configuration
    print_step(5, "Creating Configuration Files")
    
    if not create_env_file(project_dir, port):
        print_error("Failed to create configuration")
        sys.exit(1)
    
    # Step 6: Create Systemd Service (optional)
    print_step(6, "Creating System Service")
    
    response = input(f"\n{Colors.YELLOW}Create systemd service file? [Y/n]: {Colors.ENDC}").strip().lower()
    if response != 'n':
        create_systemd_service(project_dir, port)
    
    # Step 7: Public Tunnel Setup (optional)
    print_step(7, "Public Tunnel Setup (Optional)")
    
    tunnel_url = None
    response = input(f"\n{Colors.YELLOW}Set up public tunnel (ngrok/cloudflared)? [y/N]: {Colors.ENDC}").strip().lower()
    if response == 'y':
        print_info("Tunnel setup can be done later using tools/ngrok_helper.py")
        print_info("Or manually with: ngrok http " + str(port))
    
    # Print final runbook
    print_runbook(project_dir, port, tunnel_url)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Installation cancelled by user{Colors.ENDC}")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
