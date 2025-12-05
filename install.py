#!/usr/bin/env python3
"""
AnomHome Overmind Installation Script

This script sets up the development environment for AnomHome Overmind.
It handles virtual environment creation, dependency installation, and validation.

Requirements:
- Python 3.10+
- Node.js 20+
- npm
"""

import os
import sys
import subprocess
import shutil
import platform
from pathlib import Path

# Version requirements
MIN_PYTHON_VERSION = (3, 10)
MIN_NODE_VERSION = 20

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(msg):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{msg.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.FAIL}✗ {msg}{Colors.ENDC}")

def print_warning(msg):
    print(f"{Colors.WARNING}⚠ {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ {msg}{Colors.ENDC}")

def print_step(msg):
    print(f"{Colors.BLUE}→ {msg}{Colors.ENDC}")

def run_command(cmd, capture_output=True, check=True, shell=False, cwd=None):
    """Run a command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=capture_output,
            text=True,
            check=check,
            shell=shell,
            cwd=cwd
        )
        return result
    except subprocess.CalledProcessError as e:
        return e
    except FileNotFoundError:
        return None

def get_node_version():
    """Get the installed Node.js version."""
    result = run_command(['node', '--version'], check=False)
    if result is None or isinstance(result, subprocess.CalledProcessError):
        return None
    try:
        version_str = result.stdout.strip().lstrip('v')
        major = int(version_str.split('.')[0])
        return major
    except (ValueError, IndexError):
        return None

def get_npm_version():
    """Check if npm is available."""
    result = run_command(['npm', '--version'], check=False)
    if result is None or isinstance(result, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()

def check_python_version():
    """Check if Python version meets requirements."""
    print_step("Checking Python version...")
    current = sys.version_info[:2]
    
    if current < MIN_PYTHON_VERSION:
        print_error(f"Python {current[0]}.{current[1]} detected, but {MIN_PYTHON_VERSION[0]}.{MIN_PYTHON_VERSION[1]}+ is required.")
        print_info("How to fix:")
        print_info("  1. Install Python 3.10 or newer from https://python.org")
        print_info("  2. Or use pyenv: pyenv install 3.10.0 && pyenv local 3.10.0")
        print_info("  3. Re-run: python3 install.py")
        return False
    
    print_success(f"Python {current[0]}.{current[1]} detected - OK")
    return True

def check_node_version():
    """Check if Node.js version meets requirements."""
    print_step("Checking Node.js version...")
    version = get_node_version()
    
    if version is None:
        print_error("Node.js is not installed or not in PATH.")
        print_info("How to fix:")
        print_info("  1. Install Node.js 20 LTS from https://nodejs.org")
        print_info("  2. Or use nvm: nvm install 20 && nvm use 20")
        print_info("  3. Re-run: python3 install.py")
        return False
    
    if version < MIN_NODE_VERSION:
        print_error(f"Node.js v{version} detected, but v{MIN_NODE_VERSION}+ is required.")
        print_info("How to fix:")
        print_info("  1. Update Node.js from https://nodejs.org")
        print_info("  2. Or use nvm: nvm install 20 && nvm use 20")
        print_info("  3. Re-run: python3 install.py")
        return False
    
    print_success(f"Node.js v{version} detected - OK")
    return True

def check_npm():
    """Check if npm is available."""
    print_step("Checking npm...")
    version = get_npm_version()
    
    if version is None:
        print_error("npm is not installed or not in PATH.")
        print_info("How to fix:")
        print_info("  1. npm usually comes with Node.js. Reinstall Node.js.")
        print_info("  2. Re-run: python3 install.py")
        return False
    
    print_success(f"npm v{version} detected - OK")
    return True

def setup_virtual_env():
    """Set up Python virtual environment if needed."""
    print_step("Setting up Python virtual environment...")
    venv_path = Path('.venv')
    
    # Check if requirements.txt has any actual requirements
    req_file = Path('requirements.txt')
    has_requirements = False
    if req_file.exists():
        with open(req_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    has_requirements = True
                    break
    
    if not has_requirements:
        print_info("No Python dependencies required - skipping virtual environment")
        return True
    
    if not venv_path.exists():
        print_info("Creating virtual environment...")
        try:
            import venv
            venv.create('.venv', with_pip=True)
            print_success("Virtual environment created at .venv/")
        except Exception as e:
            print_error(f"Failed to create virtual environment: {e}")
            print_info("How to fix:")
            print_info("  1. Ensure python3-venv is installed")
            print_info("  2. On Ubuntu/Debian: sudo apt install python3-venv")
            print_info("  3. Re-run: python3 install.py")
            return False
    else:
        print_info("Virtual environment already exists")
    
    # Install pip requirements
    print_info("Installing Python dependencies...")
    
    # Determine pip path based on OS
    if platform.system() == 'Windows':
        pip_path = venv_path / 'Scripts' / 'pip'
    else:
        pip_path = venv_path / 'bin' / 'pip'
    
    result = run_command([str(pip_path), 'install', '-r', 'requirements.txt'], check=False)
    
    if isinstance(result, subprocess.CalledProcessError):
        print_error(f"Failed to install Python dependencies")
        print_info(f"Error: {result.stderr}")
        print_info("How to fix:")
        print_info("  1. Check requirements.txt for invalid packages")
        print_info("  2. Ensure you have internet connection")
        print_info("  3. Re-run: python3 install.py")
        return False
    
    print_success("Python dependencies installed")
    return True

def install_npm_packages():
    """Install Node.js dependencies using npm."""
    print_step("Installing Node.js dependencies...")
    
    if not Path('package.json').exists():
        print_error("package.json not found!")
        print_info("This script must be run from the project root directory.")
        return False
    
    result = run_command(['npm', 'install'], check=False)
    
    if isinstance(result, subprocess.CalledProcessError) or result is None:
        print_error("npm install failed!")
        if result and hasattr(result, 'stderr'):
            print_info(f"Error: {result.stderr}")
        print_info("How to fix:")
        print_info("  1. Check package.json for invalid packages")
        print_info("  2. Ensure you have internet connection")
        print_info("  3. Try: npm cache clean --force")
        print_info("  4. Re-run: python3 install.py")
        return False
    
    print_success("Node.js dependencies installed")
    return True

def create_directories():
    """Create necessary directories for the application."""
    print_step("Creating data directories...")
    
    directories = ['data', 'uploads', 'public']
    
    for dir_name in directories:
        dir_path = Path(dir_name)
        if not dir_path.exists():
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
                print_info(f"Created directory: {dir_name}/")
            except OSError as e:
                print_error(f"Failed to create directory {dir_name}: {e}")
                return False
    
    print_success("Data directories ready")
    return True

def create_env_file():
    """Create .env file from .env.example if it doesn't exist."""
    print_step("Checking environment configuration...")
    
    env_file = Path('.env')
    example_file = Path('.env.example')
    
    if env_file.exists():
        print_info(".env file already exists")
        return True
    
    if example_file.exists():
        try:
            shutil.copy(example_file, env_file)
            print_success("Created .env from .env.example")
            print_warning("Remember to update .env with your actual configuration!")
        except OSError as e:
            print_error(f"Failed to create .env file: {e}")
            return False
    else:
        print_warning(".env.example not found - you'll need to create .env manually")
    
    return True

def initialize_data_files():
    """Create initial JSON data files if they don't exist."""
    print_step("Initializing data files...")
    
    data_files = {
        'data/links.json': '[]',
        'data/uploads.json': '[]',
        'data/notes.json': '[]',
        'data/cameras.json': '[]',
        'data/chat_history.json': '[]'
    }
    
    for file_path, default_content in data_files.items():
        path = Path(file_path)
        if not path.exists():
            try:
                path.parent.mkdir(parents=True, exist_ok=True)
                with open(path, 'w') as f:
                    f.write(default_content)
                print_info(f"Created: {file_path}")
            except OSError as e:
                print_error(f"Failed to create {file_path}: {e}")
                return False
    
    print_success("Data files initialized")
    return True

def ask_retry():
    """Ask user if they want to retry the installation."""
    print()
    try:
        response = input(f"{Colors.CYAN}Would you like to try again? (y/n): {Colors.ENDC}").strip().lower()
        return response in ('y', 'yes')
    except (KeyboardInterrupt, EOFError):
        print()
        return False

def main():
    """Main installation function."""
    print_header("AnomHome Overmind Installer")
    
    # Change to script directory
    script_dir = Path(__file__).parent.resolve()
    os.chdir(script_dir)
    print_info(f"Working directory: {script_dir}")
    
    while True:
        success = True
        
        # Step 1: Check Python version
        if not check_python_version():
            success = False
        
        # Step 2: Check Node.js version
        if success and not check_node_version():
            success = False
        
        # Step 3: Check npm
        if success and not check_npm():
            success = False
        
        # Step 4: Setup virtual environment (if needed)
        if success and not setup_virtual_env():
            success = False
        
        # Step 5: Install npm packages
        if success and not install_npm_packages():
            success = False
        
        # Step 6: Create directories
        if success and not create_directories():
            success = False
        
        # Step 7: Create .env file
        if success and not create_env_file():
            success = False
        
        # Step 8: Initialize data files
        if success and not initialize_data_files():
            success = False
        
        if success:
            print_header("Installation Complete!")
            print_success("AnomHome Overmind is ready to use!")
            print()
            print_info("Next steps:")
            print_info("  1. Edit .env with your configuration (especially OPENAI_API_KEY)")
            print_info("  2. Start the server: npm start")
            print_info("  3. Open in browser: http://localhost:3000")
            print()
            print_info("For development with auto-reload: npm run dev")
            print()
            return 0
        else:
            print()
            print_error("Installation encountered errors.")
            if not ask_retry():
                print_info("Installation cancelled. Fix the errors above and run again:")
                print_info("  python3 install.py")
                return 1

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_warning("Installation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        print_info("Please report this issue with the full error message.")
        sys.exit(1)
