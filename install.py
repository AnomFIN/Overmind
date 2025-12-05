#!/usr/bin/env python3
"""
AnomHome Overmind - Installation Script

This script handles the installation of all dependencies for the Overmind dashboard:
- Node.js dependencies via npm
- Python virtual environment setup (optional)
- Configuration file generation

Requirements:
- Python 3.6+
- Node.js 20+
- npm

Usage:
    python install.py [--skip-npm] [--skip-venv] [--help]
"""

import os
import sys
import subprocess
import shutil
import argparse


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


def run_command(cmd, description, cwd=None):
    """
    Run a shell command with error handling.
    
    Args:
        cmd: Command to run (list of strings)
        description: Human-readable description of the command
        cwd: Working directory for the command
    
    Returns:
        True if successful, False otherwise
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"{description} failed")
        if e.stdout:
            print(f"  stdout: {e.stdout}")
        if e.stderr:
            print(f"  stderr: {e.stderr}")
        return False
    except FileNotFoundError:
        print_error(f"Command not found: {cmd[0]}")
        return False


def check_node_version():
    """Check if Node.js is installed and meets minimum version requirements."""
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
            print_success(f"Node.js version {version_str} detected")
            return True
        else:
            print_error(f"Node.js version {version_str} is below minimum (20.x required)")
            return False
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("Node.js is not installed or not in PATH")
        print("  Please install Node.js 20+ from https://nodejs.org/")
        return False


def check_npm():
    """Check if npm is installed."""
    try:
        result = subprocess.run(
            ['npm', '--version'],
            capture_output=True,
            text=True,
            check=True
        )
        print_success(f"npm version {result.stdout.strip()} detected")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("npm is not installed or not in PATH")
        return False


def check_python_version():
    """Check if Python version meets requirements."""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 6:
        print_success(f"Python version {version.major}.{version.minor}.{version.micro} detected")
        return True
    else:
        print_error(f"Python {version.major}.{version.minor} is below minimum (3.6+ required)")
        return False


def install_npm_dependencies(project_dir):
    """Install Node.js dependencies using npm."""
    print_step("NPM", "Installing Node.js dependencies...")
    
    if not os.path.exists(os.path.join(project_dir, 'package.json')):
        print_error("package.json not found in project directory")
        return False
    
    if run_command(['npm', 'install'], "npm install", cwd=project_dir):
        print_success("Node.js dependencies installed successfully")
        return True
    return False


def setup_virtual_environment(project_dir):
    """Set up Python virtual environment."""
    print_step("VENV", "Setting up Python virtual environment...")
    
    venv_path = os.path.join(project_dir, 'venv')
    
    # Create virtual environment
    if os.path.exists(venv_path):
        print_warning("Virtual environment already exists, skipping creation")
        return True
    
    try:
        import venv
        venv.create(venv_path, with_pip=True)
        print_success("Python virtual environment created")
        return True
    except Exception as e:
        print_error(f"Failed to create virtual environment: {e}")
        return False


def create_env_file(project_dir):
    """Create .env file from .env.example if it doesn't exist."""
    print_step("ENV", "Setting up environment configuration...")
    
    env_example = os.path.join(project_dir, '.env.example')
    env_file = os.path.join(project_dir, '.env')
    
    if os.path.exists(env_file):
        print_warning(".env file already exists, skipping")
        return True
    
    if not os.path.exists(env_example):
        print_warning(".env.example not found, creating default .env")
        default_env = """# AnomHome Overmind Configuration
PORT=3000
HOST=0.0.0.0
OPENAI_API_KEY=your_openai_api_key_here
MAX_FILE_SIZE_MB=50
UPLOAD_CLEANUP_HOURS=24
BASE_URL=http://localhost:3000
"""
        try:
            with open(env_file, 'w') as f:
                f.write(default_env)
            print_success(".env file created with defaults")
            return True
        except IOError as e:
            print_error(f"Failed to create .env file: {e}")
            return False
    
    try:
        shutil.copy(env_example, env_file)
        print_success(".env file created from .env.example")
        return True
    except IOError as e:
        print_error(f"Failed to copy .env.example: {e}")
        return False


def create_directories(project_dir):
    """Create required directories if they don't exist."""
    print_step("DIRS", "Creating required directories...")
    
    directories = ['data', 'uploads', 'public']
    
    for dir_name in directories:
        dir_path = os.path.join(project_dir, dir_name)
        if not os.path.exists(dir_path):
            try:
                os.makedirs(dir_path)
                print_success(f"Created directory: {dir_name}/")
            except OSError as e:
                print_error(f"Failed to create {dir_name}/: {e}")
                return False
        else:
            print_warning(f"Directory already exists: {dir_name}/")
    
    return True


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
    success = True
    
    # Step 1: Check prerequisites
    print(f"{Colors.BOLD}Checking prerequisites...{Colors.END}\n")
    
    if not check_python_version():
        success = False
    
    if not args.skip_npm:
        if not check_node_version():
            success = False
        if not check_npm():
            success = False
    
    if not success:
        print_error("\nPrerequisite checks failed. Please fix the issues above and try again.")
        sys.exit(1)
    
    print()
    
    # Step 2: Create directories
    print(f"{Colors.BOLD}Setting up project structure...{Colors.END}\n")
    
    if not create_directories(project_dir):
        print_error("Failed to create directories")
        sys.exit(1)
    
    print()
    
    # Step 3: Install npm dependencies
    if not args.skip_npm:
        print(f"{Colors.BOLD}Installing dependencies...{Colors.END}\n")
        
        if not install_npm_dependencies(project_dir):
            print_error("Failed to install npm dependencies")
            sys.exit(1)
        
        print()
    
    # Step 4: Setup virtual environment (optional)
    if not args.skip_venv:
        print(f"{Colors.BOLD}Setting up Python environment...{Colors.END}\n")
        
        if not setup_virtual_environment(project_dir):
            print_warning("Virtual environment setup failed (non-critical)")
        
        print()
    
    # Step 5: Create .env file
    print(f"{Colors.BOLD}Configuring environment...{Colors.END}\n")
    
    if not create_env_file(project_dir):
        print_warning("Environment configuration had issues (non-critical)")
    
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
   - Adjust PORT, MAX_FILE_SIZE_MB, etc. as needed

2. Start the server:
   {Colors.GREEN}npm start{Colors.END}

3. Open your browser and navigate to:
   {Colors.BLUE}http://localhost:3000{Colors.END}

{Colors.BOLD}Available features:{Colors.END}
- AI Chat Console (requires OpenAI API key)
- Link Shortener
- Temporary File Upload

For more information, see README.md
""")


if __name__ == '__main__':
    main()
