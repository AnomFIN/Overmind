#!/usr/bin/env python3
"""
install.py – smart installer for AnomHome Overmind

Requirements:
- Python 3.10+
- Node.js 20+
- Must NOT crash with an unreadable traceback.
- Must:
  - create a virtual environment (.venv) if needed
  - install Python dependencies from requirements.txt (if it exists)
  - run `npm install`
  - detect common errors and print clear, human-friendly messages
  - offer to retry failed steps

Usage:
    python install.py [--skip-npm] [--skip-venv] [--help]
"""

import os
import sys
import subprocess
import shutil
import argparse
from pathlib import Path


class Colors:
    """ANSI color codes for terminal output."""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'


def print_header():
    """Print the installation header."""
    print(f"""
{Colors.BLUE}{Colors.BOLD}
╔════════════════════════════════════════════════════════╗
║           AnomHome Overmind Installer                  ║
║                                                        ║
║  A self-hosted home dashboard for Linux                ║
╚════════════════════════════════════════════════════════╝
{Colors.END}
""")


def print_step(step, message):
    """Print a step message."""
    print(f"{Colors.BLUE}[{step}]{Colors.END} {message}")


def print_success(message):
    """Print a success message."""
    print(f"{Colors.GREEN}✓{Colors.END} {message}")


def print_warning(message):
    """Print a warning message."""
    print(f"{Colors.YELLOW}⚠{Colors.END} {message}")


def print_error(message):
    """Print an error message."""
    print(f"{Colors.RED}✗ Error:{Colors.END} {message}")


def ask_retry(action_name):
    """Ask user if they want to retry a failed action.
    
    Returns:
        bool: True if user wants to retry, False otherwise
    """
    try:
        response = input(f"\n{Colors.YELLOW}Would you like to retry {action_name}? [y/N]: {Colors.END}").strip().lower()
        return response in ('y', 'yes')
    except (EOFError, KeyboardInterrupt):
        print()
        return False


def check_python_version():
    """Check if Python version meets requirements.
    
    Returns:
        tuple: (ok: bool, message: str)
    """
    version = sys.version_info
    version_str = f"{version.major}.{version.minor}.{version.micro}"
    
    if version.major >= 3 and version.minor >= 10:
        return (True, f"Python version {version_str} detected")
    elif version.major >= 3 and version.minor >= 6:
        return (True, f"Python version {version_str} detected (3.10+ recommended)")
    else:
        return (False, f"Python {version_str} is below minimum (3.10+ required). "
                       f"Install Python from https://www.python.org/downloads/")


def check_node_version():
    """Check if Node.js is installed and meets minimum version requirements.
    
    Returns:
        tuple: (ok: bool, message: str)
    """
    try:
        result = subprocess.run(
            ['node', '--version'],
            capture_output=True,
            text=True,
            check=True
        )
        version_str = result.stdout.strip().lstrip('v')
        major_version = int(version_str.split('.')[0])
        
        if major_version >= 20:
            return (True, f"Node.js version {version_str} detected")
        else:
            return (False, f"Node.js version {version_str} is below minimum (20.x required). "
                          f"Install Node.js 20+ from https://nodejs.org/en/download")
    except subprocess.CalledProcessError:
        return (False, "Node.js returned an error. Try reinstalling from https://nodejs.org/en/download")
    except FileNotFoundError:
        return (False, "Node.js 20+ not found. Install Node from https://nodejs.org/en/download "
                       "and re-run python install.py")


def check_npm():
    """Check if npm is installed.
    
    Returns:
        tuple: (ok: bool, message: str)
    """
    try:
        result = subprocess.run(
            ['npm', '--version'],
            capture_output=True,
            text=True,
            check=True
        )
        return (True, f"npm version {result.stdout.strip()} detected")
    except subprocess.CalledProcessError:
        return (False, "npm returned an error. Try reinstalling Node.js from https://nodejs.org/en/download")
    except FileNotFoundError:
        return (False, "npm not found. npm comes bundled with Node.js. "
                       "Install Node.js from https://nodejs.org/en/download")


def run_npm_install(project_dir):
    """Install Node.js dependencies using npm.
    
    Returns:
        tuple: (ok: bool, message: str)
    """
    package_json = os.path.join(project_dir, 'package.json')
    
    if not os.path.exists(package_json):
        return (False, "package.json not found in project directory")
    
    try:
        result = subprocess.run(
            ['npm', 'install'],
            cwd=project_dir,
            capture_output=True,
            text=True,
            check=True
        )
        return (True, "Node.js dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        error_msg = "npm install failed"
        if 'ENOENT' in str(e.stderr):
            error_msg += ". A required file or directory was not found"
        elif 'EACCES' in str(e.stderr):
            error_msg += ". Permission denied - try running with appropriate permissions"
        elif 'ETIMEDOUT' in str(e.stderr) or 'network' in str(e.stderr).lower():
            error_msg += ". Network issue - check your internet connection"
        else:
            error_msg += f". {e.stderr[:200] if e.stderr else 'Unknown error'}"
        return (False, error_msg)
    except FileNotFoundError:
        return (False, "npm command not found. Install Node.js from https://nodejs.org/en/download")


def run_pip_install(project_dir, venv_path=None):
    """Install Python dependencies from requirements.txt if it exists.
    
    Returns:
        tuple: (ok: bool, message: str)
    """
    requirements_file = os.path.join(project_dir, 'requirements.txt')
    
    if not os.path.exists(requirements_file):
        return (True, "No requirements.txt found, skipping Python dependencies")
    
    # Determine pip command
    if venv_path and os.path.exists(venv_path):
        if sys.platform == 'win32':
            pip_cmd = os.path.join(venv_path, 'Scripts', 'pip')
        else:
            pip_cmd = os.path.join(venv_path, 'bin', 'pip')
    else:
        pip_cmd = 'pip'
    
    try:
        result = subprocess.run(
            [pip_cmd, 'install', '-r', requirements_file],
            cwd=project_dir,
            capture_output=True,
            text=True,
            check=True
        )
        return (True, "Python dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        error_msg = "pip install failed"
        if 'network' in str(e.stderr).lower() or 'connection' in str(e.stderr).lower():
            error_msg += ". Network issue - check your internet connection"
        else:
            error_msg += f". {e.stderr[:200] if e.stderr else 'Unknown error'}"
        return (False, error_msg)
    except FileNotFoundError:
        return (False, f"pip not found at {pip_cmd}")


def create_or_use_venv(project_dir):
    """Create or use existing Python virtual environment.
    
    Returns:
        tuple: (ok: bool, message: str, venv_path: str or None)
    """
    venv_path = os.path.join(project_dir, '.venv')
    
    if os.path.exists(venv_path):
        # Check if it's a valid venv
        if sys.platform == 'win32':
            python_path = os.path.join(venv_path, 'Scripts', 'python.exe')
        else:
            python_path = os.path.join(venv_path, 'bin', 'python')
        
        if os.path.exists(python_path):
            return (True, "Using existing virtual environment", venv_path)
        else:
            # Invalid venv, remove and recreate
            try:
                shutil.rmtree(venv_path)
            except OSError as e:
                return (False, f"Failed to remove invalid venv: {e}", None)
    
    try:
        import venv
        venv.create(venv_path, with_pip=True)
        return (True, "Python virtual environment created", venv_path)
    except Exception as e:
        return (False, f"Failed to create virtual environment: {e}", None)


def create_env_file(project_dir):
    """Create .env file from .env.example if it doesn't exist.
    
    Returns:
        tuple: (ok: bool, message: str)
    """
    env_example = os.path.join(project_dir, '.env.example')
    env_file = os.path.join(project_dir, '.env')
    
    if os.path.exists(env_file):
        return (True, ".env file already exists")
    
    if not os.path.exists(env_example):
        default_env = """# AnomHome Overmind Configuration
PORT=3000
HOST=0.0.0.0
BASE_URL=http://localhost:3000

OPENAI_API_KEY=your_openai_api_key_here

MAX_FILE_SIZE_MB=50
UPLOAD_CLEANUP_MINUTES=15
TEMP_UPLOAD_DIR=./tmp_uploads

HOME_STORAGE_PATH=/path/to/your/files
"""
        try:
            with open(env_file, 'w') as f:
                f.write(default_env)
            return (True, ".env file created with defaults")
        except IOError as e:
            return (False, f"Failed to create .env file: {e}")
    
    try:
        shutil.copy(env_example, env_file)
        return (True, ".env file created from .env.example")
    except IOError as e:
        return (False, f"Failed to copy .env.example: {e}")


def create_directories(project_dir):
    """Create required directories if they don't exist.
    
    Returns:
        tuple: (ok: bool, message: str)
    """
    directories = ['data', 'tmp_uploads', 'public']
    created = []
    
    for dir_name in directories:
        dir_path = os.path.join(project_dir, dir_name)
        if not os.path.exists(dir_path):
            try:
                os.makedirs(dir_path)
                created.append(dir_name)
            except OSError as e:
                return (False, f"Failed to create {dir_name}/: {e}")
    
    if created:
        return (True, f"Created directories: {', '.join(created)}")
    return (True, "All required directories already exist")


def run_step_with_retry(step_name, step_func, *args, max_retries=3):
    """Run a step function with retry capability.
    
    Args:
        step_name: Human-readable name of the step
        step_func: Function to call (should return tuple)
        *args: Arguments to pass to step_func
        max_retries: Maximum number of retry attempts
    
    Returns:
        tuple: Final (ok, message) result
    """
    attempts = 0
    while attempts < max_retries:
        result = step_func(*args)
        
        # Handle functions returning 2 or 3 values
        if len(result) == 2:
            ok, message = result
        else:
            ok, message = result[0], result[1]
        
        if ok:
            return result
        
        print_error(message)
        attempts += 1
        
        if attempts < max_retries:
            if ask_retry(step_name):
                print(f"\n{Colors.BLUE}Retrying {step_name}...{Colors.END}\n")
                continue
        
        return result
    
    return result


def main():
    """Main installation function."""
    parser = argparse.ArgumentParser(
        description='AnomHome Overmind Installation Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python install.py              # Full installation
    python install.py --skip-npm   # Skip npm dependency installation
    python install.py --skip-venv  # Skip virtual environment setup
        """
    )
    parser.add_argument(
        '--skip-npm',
        action='store_true',
        help='Skip npm dependency installation'
    )
    parser.add_argument(
        '--skip-venv',
        action='store_true',
        help='Skip Python virtual environment setup'
    )
    
    args = parser.parse_args()
    
    print_header()
    
    # Get project directory (directory containing this script)
    project_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Project directory: {project_dir}\n")
    
    # Track overall success
    all_ok = True
    venv_path = None
    
    # Step 1: Check prerequisites
    print(f"{Colors.BOLD}Checking prerequisites...{Colors.END}\n")
    
    # Check Python
    ok, message = check_python_version()
    if ok:
        print_success(message)
    else:
        print_error(message)
        all_ok = False
    
    # Check Node.js (if not skipping npm)
    if not args.skip_npm:
        ok, message = check_node_version()
        if ok:
            print_success(message)
        else:
            print_error(message)
            all_ok = False
        
        ok, message = check_npm()
        if ok:
            print_success(message)
        else:
            print_error(message)
            all_ok = False
    
    if not all_ok:
        print_error("\nPrerequisite checks failed. Please fix the issues above and re-run python install.py")
        sys.exit(1)
    
    print()
    
    # Step 2: Create directories
    print(f"{Colors.BOLD}Setting up project structure...{Colors.END}\n")
    
    ok, message = create_directories(project_dir)
    if ok:
        print_success(message)
    else:
        print_error(message)
        sys.exit(1)
    
    print()
    
    # Step 3: Setup virtual environment (optional)
    if not args.skip_venv:
        print(f"{Colors.BOLD}Setting up Python environment...{Colors.END}\n")
        
        result = run_step_with_retry("virtual environment setup", create_or_use_venv, project_dir)
        ok, message = result[0], result[1]
        if len(result) > 2:
            venv_path = result[2]
        
        if ok:
            print_success(message)
        else:
            print_warning(f"Virtual environment setup failed (non-critical): {message}")
        
        # Install Python requirements if they exist
        if venv_path:
            ok, message = run_pip_install(project_dir, venv_path)
            if ok:
                print_success(message)
            else:
                print_warning(f"Python dependencies: {message}")
        
        print()
    
    # Step 4: Install npm dependencies
    if not args.skip_npm:
        print(f"{Colors.BOLD}Installing Node.js dependencies...{Colors.END}\n")
        
        result = run_step_with_retry("npm install", run_npm_install, project_dir)
        ok, message = result
        
        if ok:
            print_success(message)
        else:
            print_error(f"npm install failed: {message}")
            print(f"\n{Colors.YELLOW}You can try running 'npm install' manually or re-run this script.{Colors.END}")
            sys.exit(1)
        
        print()
    
    # Step 5: Create .env file
    print(f"{Colors.BOLD}Configuring environment...{Colors.END}\n")
    
    ok, message = create_env_file(project_dir)
    if ok:
        print_success(message)
    else:
        print_warning(f"Environment configuration: {message}")
    
    print()
    
    # Print completion message
    print(f"""
{Colors.GREEN}{Colors.BOLD}
╔════════════════════════════════════════════════════════╗
║           Installation Complete!                       ║
╚════════════════════════════════════════════════════════╝
{Colors.END}

{Colors.BOLD}Next steps:{Colors.END}

1. Configure your settings in {Colors.BLUE}.env{Colors.END}:
   - Set your OPENAI_API_KEY for AI chat functionality
   - Set HOME_STORAGE_PATH for the file browser
   - Adjust PORT, UPLOAD_CLEANUP_MINUTES, etc. as needed

2. Start the server:
   {Colors.GREEN}npm start{Colors.END}

3. Open your browser and navigate to:
   {Colors.BLUE}http://localhost:3000{Colors.END}

{Colors.BOLD}Available features:{Colors.END}
- 🧠 AI Chat Console (requires OpenAI API key)
- 🔗 Link Shortener
- 📁 15-minute Temp File Upload
- 🗂️ Local File Browser
- 📷 Camera Wall
- 🧩 Mind-Map Notes

{Colors.BOLD}iPhone Home Screen:{Colors.END}
- Open the dashboard URL in Safari
- Tap "Share" → "Add to Home Screen"
- The app will feel like a full-screen web app on iOS

For more information, see README.md
""")


if __name__ == '__main__':
    main()
