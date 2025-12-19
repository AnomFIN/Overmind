#!/usr/bin/env python3
"""
AnomHome Overmind Installation Script
Sets up virtual environment, Python and Node.js dependencies.
Handles errors gracefully and provides clear feedback.
"""

import subprocess
import sys
import os
import shutil
import json
import uuid
from pathlib import Path


def print_banner():
    """Print installation banner."""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║           AnomHome Overmind - Installation Script            ║
║      Self-hosted home dashboard for Linux                    ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)


def print_step(step_num, message):
    """Print a step message."""
    print(f"\n[Step {step_num}] {message}")
    print("-" * 60)


def print_success(message):
    """Print success message."""
    print(f"✓ {message}")


def print_error(message):
    """Print error message."""
    print(f"✗ ERROR: {message}", file=sys.stderr)


def print_warning(message):
    """Print warning message."""
    print(f"⚠ WARNING: {message}")


def run_command(cmd, description, cwd=None, capture_output=False):
    """Run a shell command with error handling."""
    try:
        result = subprocess.run(
            cmd,
            shell=isinstance(cmd, str),
            cwd=cwd,
            capture_output=capture_output,
            text=True,
            check=True
        )
        print_success(description)
        return result
    except subprocess.CalledProcessError as e:
        print_error(f"{description} failed")
        if e.stdout:
            print(f"stdout: {e.stdout}")
        if e.stderr:
            print(f"stderr: {e.stderr}")
        return None
    except FileNotFoundError as e:
        print_error(f"Command not found: {e.filename}")
        return None


def check_python_version():
    """Check if Python version is 3.8 or higher."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print_error(f"Python 3.8+ required. Found: {version.major}.{version.minor}")
        return False
    print_success(f"Python version: {version.major}.{version.minor}.{version.micro}")
    return True


def check_node_version():
    """Check if Node.js 20+ is installed."""
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            check=True
        )
        version_str = result.stdout.strip().lstrip('v')
        major_version = int(version_str.split('.')[0])
        if major_version < 20:
            print_warning(f"Node.js 20+ recommended. Found: {version_str}")
            print_warning("Some features may not work correctly.")
        else:
            print_success(f"Node.js version: {version_str}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("Node.js not found. Please install Node.js 20+")
        print("  Install from: https://nodejs.org/")
        return False
    except (ValueError, IndexError):
        print_warning("Could not parse Node.js version")
        return True


def check_npm():
    """Check if npm is installed."""
    try:
        result = subprocess.run(
            ["npm", "--version"],
            capture_output=True,
            text=True,
            check=True
        )
        print_success(f"npm version: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("npm not found. Please install Node.js with npm")
        return False


def create_venv(project_dir):
    """Create Python virtual environment."""
    # Ask user to choose venv directory name
    print("\nChoose virtual environment directory name:")
    print("  1. venv (default)")
    print("  2. .venv (hidden directory)")
    
    while True:
        venv_choice = input("Enter choice [1/2] (default: 1): ").strip()
        if venv_choice in ['', '1', '2']:
            break
        print_warning("Invalid choice. Please enter 1 or 2.")
    
    venv_name = ".venv" if venv_choice == "2" else "venv"
    venv_path = project_dir / venv_name
    
    if venv_path.exists():
        print_warning(f"Virtual environment '{venv_name}' already exists")
        response = input("Do you want to recreate it? [y/N]: ").strip().lower()
        if response == 'y':
            try:
                shutil.rmtree(venv_path)
                print_success("Removed existing virtual environment")
            except OSError as e:
                print_error(f"Failed to remove existing venv: {e}")
                return None
        else:
            print_success("Using existing virtual environment")
            return venv_path
    
    try:
        import venv
        venv.create(venv_path, with_pip=True)
        print_success(f"Created virtual environment at {venv_path}")
        return venv_path
    except Exception as e:
        print_error(f"Failed to create virtual environment: {e}")
        return None


def get_venv_python(venv_path):
    """Get the Python executable path in the virtual environment."""
    if sys.platform == "win32":
        return venv_path / "Scripts" / "python.exe"
    return venv_path / "bin" / "python"


def install_python_deps(venv_path, project_dir):
    """Install Python dependencies in the virtual environment."""
    python_path = get_venv_python(venv_path)
    requirements_path = project_dir / "requirements.txt"
    
    if not requirements_path.exists():
        print_warning("No requirements.txt found, skipping Python dependencies")
        return True
    
    result = run_command(
        [str(python_path), "-m", "pip", "install", "-r", str(requirements_path)],
        "Installed Python dependencies"
    )
    return result is not None


def install_node_deps(project_dir):
    """Install Node.js dependencies."""
    package_json = project_dir / "package.json"
    
    if not package_json.exists():
        print_error("package.json not found")
        return False
    
    result = run_command(
        ["npm", "install"],
        "Installed Node.js dependencies",
        cwd=str(project_dir)
    )
    return result is not None


def create_directories(project_dir):
    """Create required directories."""
    directories = [
        "backend/data",
        "backend/routes",
        "backend/utils",
        "public/css",
        "public/js",
        "uploads"
    ]
    
    for dir_path in directories:
        full_path = project_dir / dir_path
        try:
            full_path.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            print_error(f"Failed to create directory {dir_path}: {e}")
            return False
    
    print_success("Created required directories")
    return True


def create_env_example(project_dir):
    """Create .env.example file if it doesn't exist."""
    env_example = project_dir / ".env.example"
    
    if env_example.exists():
        print_warning(".env.example already exists")
        return True
    
    env_content = """# AnomHome Overmind Configuration
# Copy this file to .env and fill in your values

# Server Configuration
PORT=3000
HOST=0.0.0.0

# OpenAI Configuration (required for AI chat)
OPENAI_API_KEY=your_openai_api_key_here

# File Browser Configuration
# Root directory for file browser (defaults to home directory)
FILE_BROWSER_ROOT=

# Upload Configuration
# Maximum file size in MB (default: 100)
MAX_UPLOAD_SIZE=100

# Security
# Set a secret key for session management
SECRET_KEY=your_secret_key_here
"""
    
    try:
        env_example.write_text(env_content)
        print_success("Created .env.example")
        return True
    except OSError as e:
        print_error(f"Failed to create .env.example: {e}")
        return False


def ensure_data_directory(project_dir):
    """Ensure the data directory exists."""
    data_dir = project_dir / "backend" / "data"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        return data_dir
    except OSError as e:
        print_error(f"Failed to create data directory: {e}")
        return None


def initialize_data_files(project_dir):
    """Initialize JSON data files if they don't exist."""
    data_dir = ensure_data_directory(project_dir)
    if data_dir is None:
        return False
    
    data_files = {
        "links.json": [],
        "notes.json": [],
        "cameras.json": []
    }
    
    for filename, default_content in data_files.items():
        file_path = data_dir / filename
        if not file_path.exists():
            try:
                with open(file_path, 'w') as f:
                    json.dump(default_content, f, indent=2)
            except OSError as e:
                print_error(f"Failed to create {filename}: {e}")
                return False
    
    print_success("Initialized data files")
    return True


def configure_cameras(project_dir):
    """Interactive camera configuration."""
    print("\nWould you like to configure cameras now?")
    print("  You can add multiple cameras with different connection types:")
    print("  - IP cameras (HTTP/HTTPS)")
    print("  - RTSP cameras")
    print("  - USB webcams")
    print("  - Mobile device cameras (Android/iOS)")
    
    response = input("\nConfigure cameras? [y/N]: ").strip().lower()
    if response != 'y':
        print_warning("Skipping camera configuration. You can add cameras later via the web UI.")
        return True
    
    cameras = []
    data_dir = ensure_data_directory(project_dir)
    if data_dir is None:
        return False
    cameras_file = data_dir / "cameras.json"
    
    # Check if cameras.json already exists
    if cameras_file.exists():
        try:
            with open(cameras_file, 'r') as f:
                cameras = json.load(f)
                # Ensure it's a list
                if not isinstance(cameras, list):
                    cameras = []
        except (json.JSONDecodeError, OSError):
            cameras = []
    
    while True:
        print("\n" + "=" * 60)
        print("Add a new camera")
        print("=" * 60)
        
        print("\nCamera type:")
        print("  1. IP Camera (HTTP/HTTPS)")
        print("  2. RTSP Camera")
        print("  3. USB Webcam")
        print("  4. Mobile Device Camera (Android/iOS)")
        
        cam_type = input("\nSelect camera type [1-4]: ").strip()
        
        # Validate camera type
        if cam_type not in ['1', '2', '3', '4']:
            print_warning("Invalid camera type. Please enter a number between 1 and 4.")
            continue
        
        name = input("Camera name: ").strip()
        if not name:
            print_warning("Camera name is required")
            continue
        
        url = ""
        if cam_type == "1":  # IP Camera
            protocol = input("Protocol [http/https] (default: http): ").strip().lower() or "http"
            # Validate protocol
            if protocol not in ['http', 'https']:
                print_warning(f"Invalid protocol '{protocol}'. Using 'http' instead.")
                protocol = 'http'
            ip = input("IP address: ").strip()
            port = input("Port (default: 80 for http, 443 for https): ").strip()
            if not port:
                port = "443" if protocol == "https" else "80"
            path = input("Path (e.g., /video or /mjpeg, default: /): ").strip() or "/"
            url = f"{protocol}://{ip}:{port}{path}"
            
        elif cam_type == "2":  # RTSP
            ip = input("IP address: ").strip()
            port = input("Port (default: 554): ").strip() or "554"
            path = input("Stream path (e.g., /stream1): ").strip() or "/stream1"
            username = input("Username (optional): ").strip()
            password = input("Password (optional): ").strip()
            
            if username and password:
                url = f"rtsp://{username}:{password}@{ip}:{port}{path}"
            else:
                url = f"rtsp://{ip}:{port}{path}"
                
        elif cam_type == "3":  # USB Webcam
            device = input("Device path (e.g., /dev/video0, default: /dev/video0): ").strip() or "/dev/video0"
            url = device
            
        elif cam_type == "4":  # Mobile Device
            print("\nMobile device camera options:")
            print("  - Use IP Webcam app (Android): http://phone-ip:8080/video")
            print("  - Use DroidCam (Android/iOS): http://phone-ip:4747/video")
            print("  - Use iVCam (iOS): http://phone-ip:port/video")
            
            ip = input("\nMobile device IP address: ").strip()
            port = input("Port (e.g., 8080 for IP Webcam, 4747 for DroidCam): ").strip()
            path = input("Path (default: /video): ").strip() or "/video"
            url = f"http://{ip}:{port}{path}"
        else:
            print_warning("Invalid camera type")
            continue
        
        if not url:
            print_warning("Camera URL/path is required")
            continue
        
        # Create camera entry
        camera = {
            "id": str(uuid.uuid4()),
            "name": name,
            "rtspUrl": url,
            "enabled": True,
            "sensitivity": 12,
            "minMotionSeconds": 2,
            "cooldownSeconds": 3,
            "outputDir": f"recordings/{name.lower().replace(' ', '_')}",
            "audio": False
        }
        
        cameras.append(camera)
        print_success(f"Added camera: {name}")
        
        another = input("\nAdd another camera? [y/N]: ").strip().lower()
        if another != 'y':
            break
    
    # Save cameras
    if cameras:
        try:
            with open(cameras_file, 'w') as f:
                json.dump(cameras, f, indent=2)
            print_success(f"Saved {len(cameras)} camera(s) to {cameras_file}")
        except OSError as e:
            print_error(f"Failed to save cameras: {e}")
            return False
    
    return True


def print_windows_ftp_instructions():
    """Print instructions for Windows + FTP deployment."""
    instructions = """
╔══════════════════════════════════════════════════════════════╗
║          Windows + FTP Deployment Instructions               ║
╚══════════════════════════════════════════════════════════════╝

If you're developing on Windows and deploying to a Linux server:

1. SETUP FTP CLIENT:
   
   Option A: FileZilla (Recommended)
   - Download from https://filezilla-project.org/
   - Install and configure your Linux server connection:
     * Host: Your Linux server IP
     * Port: 21 (FTP) or 22 (SFTP/SSH)
     * Protocol: SFTP (SSH File Transfer Protocol) recommended
     * User: Your Linux username
     * Password: Your Linux password
   
   Option B: WinSCP
   - Download from https://winscp.net/
   - Similar configuration to FileZilla
   
   Option C: Web-based FTP clients
   - net2ftp (https://www.net2ftp.com/)
   - MonstaFTP (if installed on your server)

2. TRANSFER FILES:
   - Upload the entire Overmind directory to your Linux server
   - Recommended location: /home/your-username/Overmind
   - Ensure file permissions are preserved (especially for .py files)

3. CONNECT TO SERVER:
   - Use SSH client like PuTTY or Windows Terminal with SSH
   - Connect to your Linux server:
     ssh your-username@server-ip

4. RUN INSTALLATION:
   - Navigate to the Overmind directory:
     cd ~/Overmind
   
   - Make installation script executable:
     chmod +x install.py
   
   - Run the installer:
     python3 install.py

5. START THE APPLICATION:
   - Follow the completion message instructions
   - Use the startup method you selected during installation

6. ACCESS FROM WINDOWS:
   - Open browser to: http://server-ip:3000
   - For local network access, use the server's local IP
   - For internet access, configure port forwarding or use ngrok

TROUBLESHOOTING:
- If files won't upload, check FTP/SFTP server is running on Linux
- If permissions denied, ensure your Linux user owns the files
- For line ending issues, configure your editor to use LF (Unix) not CRLF (Windows)
"""
    print(instructions)


def ask_startup_preference():
    """Ask user for preferred startup method."""
    print("\n" + "=" * 60)
    print("Choose your preferred startup method:")
    print("=" * 60)
    print("\nOption 1: npm start")
    print("  - Starts the Node.js server directly")
    print("  - Simple and straightforward")
    print("  - Good for development and testing")
    print("  - Command: npm start")
    
    print("\nOption 2: palvelin.py (Server Management TUI)")
    print("  - Terminal-based GUI for server management")
    print("  - Real-time monitoring (CPU, RAM, disk, visitors)")
    print("  - Service control (start, stop, restart)")
    print("  - View logs and manage uploads")
    print("  - Requires Python dependencies")
    print("  - Command: python3 palvelin.py")
    
    choice = input("\nSelect startup method [1/2] (default: 1): ").strip()
    return "palvelin" if choice == "2" else "npm"


def print_completion_message(project_dir, startup_method="npm"):
    """Print installation completion message."""
    print("\n" + "=" * 60)
    print("✓ Installation completed successfully!")
    print("=" * 60)
    print("\nNext steps:")
    print(f"  1. Copy .env.example to .env and configure your settings:")
    print(f"     cp .env.example .env")
    print(f"  2. Edit .env and add your OpenAI API key (optional)")
    
    if startup_method == "palvelin":
        print(f"  3. Start the server management TUI:")
        print(f"     python3 palvelin.py")
        print(f"\n     Keyboard shortcuts in palvelin.py:")
        print(f"       S - Start service")
        print(f"       T - Stop service")
        print(f"       R - Restart service")
        print(f"       C - Run cleanup")
        print(f"       L - View logs")
        print(f"       Q - Quit")
    else:
        print(f"  3. Start the server:")
        print(f"     npm start")
        print(f"\n     For development with auto-reload:")
        print(f"     npm run dev")
    
    print(f"  4. Open your browser to http://localhost:3000")
    
    print("\nAlternative startup methods:")
    if startup_method == "npm":
        print("  - Server management TUI: python3 palvelin.py")
    else:
        print("  - Direct start: npm start")
        print("  - Development mode: npm run dev")
    
    print("\n" + "=" * 60)


def main():
    """Main installation function."""
    print_banner()
    
    # Get project directory
    project_dir = Path(__file__).parent.resolve()
    print(f"Project directory: {project_dir}")
    
    # Step 1: Check prerequisites
    print_step(1, "Checking prerequisites")
    
    if not check_python_version():
        sys.exit(1)
    
    if not check_node_version():
        sys.exit(1)
    
    if not check_npm():
        sys.exit(1)
    
    # Step 2: Show Windows + FTP instructions if needed
    print_step(2, "Deployment Options")
    print("\nAre you deploying from Windows to a Linux server via FTP?")
    show_ftp = input("Show Windows + FTP instructions? [y/N]: ").strip().lower()
    if show_ftp == 'y':
        print_windows_ftp_instructions()
        input("\nPress Enter to continue with installation...")
    
    # Step 3: Create directories
    print_step(3, "Creating directories")
    if not create_directories(project_dir):
        sys.exit(1)
    
    # Step 4: Create virtual environment
    print_step(4, "Setting up Python virtual environment")
    venv_path = create_venv(project_dir)
    if venv_path is None:
        print_warning("Continuing without virtual environment")
    
    # Step 5: Install Python dependencies
    print_step(5, "Installing Python dependencies")
    if venv_path:
        install_python_deps(venv_path, project_dir)
    else:
        print_warning("Skipping Python dependencies (no venv)")
    
    # Step 6: Install Node.js dependencies
    print_step(6, "Installing Node.js dependencies")
    if not install_node_deps(project_dir):
        print_error("Failed to install Node.js dependencies")
        sys.exit(1)
    
    # Step 7: Create configuration files
    print_step(7, "Creating configuration files")
    create_env_example(project_dir)
    
    # Step 8: Initialize data files
    print_step(8, "Initializing data files")
    if not initialize_data_files(project_dir):
        print_warning("Some data files could not be initialized")
    
    # Step 9: Camera configuration
    print_step(9, "Camera Configuration")
    configure_cameras(project_dir)
    
    # Step 10: Ask for startup preference
    print_step(10, "Startup Preference")
    startup_method = ask_startup_preference()
    
    # Print completion message
    print_completion_message(project_dir, startup_method)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInstallation cancelled by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
