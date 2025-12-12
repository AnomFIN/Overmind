"""Minimal ngrok TUI for Overmind exposure."""
import json
import os
import shutil
import subprocess
import json
import os
import shutil
import subprocess
from pathlib import Path

CONFIG_PATH = Path('data/ngrok.json')


def load_config():
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text())
    return {}


def save_config(config):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, indent=2))


def ensure_ngrok():
    if shutil.which('ngrok'):
        return True
    print('ngrok not found. Install from https://ngrok.com/download')
    return False


def run_tunnel(port, authtoken=None):
    env = os.environ.copy()
    if authtoken:
        env['NGROK_AUTHTOKEN'] = authtoken
    cmd = ['ngrok', 'http', str(port)]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    try:
        for line in proc.stdout:
            print(line.strip())
    except KeyboardInterrupt:
        proc.terminate()


def main():
    print('== Overmind ngrok helper ==')
    if not ensure_ngrok():
        return
    config = load_config()
    token = input(f"Auth token [{config.get('token','')}]: ") or config.get('token')
    port = input(f"Port to expose [3000]: ") or '3000'
    config['token'] = token
    config['port'] = port
    save_config(config)
    print('Starting tunnel... Press Ctrl+C to stop.')
    run_tunnel(port, token)


if __name__ == '__main__':
    main()
