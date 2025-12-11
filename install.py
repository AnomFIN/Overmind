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
    venv_path = project_dir / "venv"
    
    if venv_path.exists():
        print_warning("Virtual environment already exists")
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


def initialize_data_files(project_dir):
    """Initialize JSON data files if they don't exist."""
    data_dir = project_dir / "backend" / "data"
    
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


def print_completion_message(project_dir):
    """Print installation completion message."""
    print("\n" + "=" * 60)
    print("✓ Installation completed successfully!")
    print("=" * 60)
    print("\nNext steps:")
    print(f"  1. Copy .env.example to .env and configure your settings:")
    print(f"     cp .env.example .env")
    print(f"  2. Edit .env and add your OpenAI API key (optional)")
    print(f"  3. Start the server:")
    print(f"     npm start")
    print(f"  4. Open your browser to http://localhost:3000")
    print("\nFor development with auto-reload:")
    print(f"  npm run dev")
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
    
    # Step 2: Create directories
    print_step(2, "Creating directories")
    if not create_directories(project_dir):
        sys.exit(1)
    
    # Step 3: Create virtual environment
    print_step(3, "Setting up Python virtual environment")
    venv_path = create_venv(project_dir)
    if venv_path is None:
        print_warning("Continuing without virtual environment")
    
    # Step 4: Install Python dependencies
    print_step(4, "Installing Python dependencies")
    if venv_path:
        install_python_deps(venv_path, project_dir)
    else:
        print_warning("Skipping Python dependencies (no venv)")
    
    # Step 5: Install Node.js dependencies
    print_step(5, "Installing Node.js dependencies")
    if not install_node_deps(project_dir):
        print_error("Failed to install Node.js dependencies")
        sys.exit(1)
    
    # Step 6: Create configuration files
    print_step(6, "Creating configuration files")
    create_env_example(project_dir)
    
    # Step 7: Initialize data files
    print_step(7, "Initializing data files")
    if not initialize_data_files(project_dir):
        print_warning("Some data files could not be initialized")
    
    # Print completion message
    print_completion_message(project_dir)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInstallation cancelled by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
