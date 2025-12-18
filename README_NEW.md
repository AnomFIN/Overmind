# Overmind Dashboard v1.0.0

**Overmind** is a production-ready, self-hosted personal dashboard that keeps everything on your own machine. Built for Linux-first deployment with enterprise-grade security and real-time capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## 🌟 Features

### Core Capabilities

- **🔐 User Authentication** - Secure registration and login with PBKDF2 password hashing
- **👥 Friends System** - Send and accept friend requests, manage connections
- **💬 Real-time Chat** - WebSocket-powered messaging with typing indicators
- **📱 Progressive Web App** - Install as mobile/desktop app, works offline
- **🤖 OpenAI Console** - Chat interface backed by OpenAI API
- **🔗 Link Shortener** - Create short codes with optional expiry
- **📤 Temp File Uploads** - 15-minute TTL uploads with automatic cleanup
- **📁 File Browser** - Safe, read-only local file browsing
- **📷 Camera Wall** - Motion-triggered recording with RTSP support
- **🗺️ Mind-Map Notes** - Visual note-taking with shareable boards

### Security & Production Features

- **Rate Limiting** - Protect against abuse (auth: 5/15min, chat: 30/min, API: 60/min)
- **Audit Logging** - Track all security-relevant events
- **Session Management** - Secure httpOnly cookies with 7-day expiration
- **Input Validation** - Comprehensive validation across all endpoints
- **Admin Protection** - Admin endpoints restricted to localhost
- **PWA Support** - Offline-capable with service worker caching

---

## 🚀 Quick Start

### Option 1: Production Installer (Recommended)

The production installer (`asennus.py`) handles everything automatically:

```bash
# Clone the repository
git clone https://github.com/AnomFIN/Overmind.git
cd Overmind

# Run the production installer
python3 asennus.py
```

The installer will:
- ✅ Check all prerequisites (Node.js 20+, Python 3.10+, npm, ffmpeg)
- ✅ Install all dependencies
- ✅ Configure your server (port selection, .env creation)
- ✅ Generate systemd service file
- ✅ Provide a complete runbook

### Option 2: Manual Installation

```bash
# Install dependencies
npm install

# Create configuration
cp .env.example .env
nano .env  # Edit configuration

# Start the server
npm start

# Or with auto-reload for development
npm run dev
```

### Prerequisites

- **Linux** (Ubuntu 20.04+, Debian 11+, or similar)
- **Node.js** 20 LTS or higher
- **Python** 3.10+ (for installer and management tools)
- **npm** (comes with Node.js)
- **ffmpeg** (optional, for camera features)

---

## 📖 Installation Paths

### Linux / Self-Hosted (Node.js)

**Perfect for**: Home servers, VPS, dedicated machines

**Features**: Full feature set including cameras, file browser, WebSocket

**Install**: Use `python3 asennus.py`

**Requirements**:
- Node.js 20+
- Python 3.10+
- npm
- ffmpeg (optional)

### Web Hosting (PHP) - Coming Soon

**Perfect for**: Shared hosting, cPanel, traditional web hosts

**Features**: Auth, chat, friends, mindmap, shortlinks (no cameras/file browser)

**Install**: Upload and run `asennus.php` (planned for Phase 6)

**Requirements**:
- PHP 8.0+
- MySQL 5.7+
- PDO, OpenSSL, Sodium extensions

---

## 🏗️ Architecture

### Backend Structure

```
backend/
├── adapters/           # Storage abstraction (JSON, MySQL)
├── middleware/         # Auth, rate limiting
├── routes/            # API endpoints
├── services/          # Business logic
├── utils/             # Utilities
└── serverIntegrated.js # Main server
```

### Storage Options

- **JSON Files** (default) - Zero configuration, perfect for single user
- **MySQL** (planned) - For scaling and multi-user deployments

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

#### Friends
- `GET /api/friends` - List friends
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept` - Accept request

#### Chat
- `GET /api/chatmessages/threads` - Get conversations
- `GET /api/chatmessages/messages` - Get messages
- `POST /api/chatmessages/send` - Send message
- `WS /ws/chat?token=SESSION` - Real-time connection

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete details.

---

## 🔒 Security

### Built-in Security Features

- **PBKDF2 Password Hashing** (100,000 iterations, SHA-512)
- **Secure Session Tokens** (64-byte random hex)
- **httpOnly Cookies** (SameSite=Lax, CSRF protection)
- **Rate Limiting** (per-endpoint limits)
- **Input Validation** (all endpoints)
- **Audit Logging** (all security events)
- **Admin Endpoint Protection** (localhost only)

### Production Deployment Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Enable HTTPS (nginx + Let's Encrypt)
- [ ] Set `CORS_ORIGIN` to your domain
- [ ] Configure firewall (ufw, iptables)
- [ ] Set `NODE_ENV=production`
- [ ] Regular backups of `data/` directory
- [ ] Monitor audit logs
- [ ] Update dependencies regularly

See [docs/SECURITY.md](docs/SECURITY.md) for complete security documentation.

---

## 📱 Progressive Web App

Overmind works as a native app on mobile and desktop:

1. Open Overmind in your browser
2. Tap "Add to Home Screen" (iOS) or install prompt (Android/Desktop)
3. Launch from home screen like a native app
4. Works offline after first visit

**Features**:
- Offline support with service worker
- App-like experience (no browser chrome)
- Install prompt with custom UI
- Update notifications
- Background sync (prepared for future)

---

## 🛠️ Management & Operations

### Starting the Server

```bash
# Using npm
npm start

# Using systemd (after running asennus.py)
sudo systemctl start overmind
sudo systemctl status overmind

# View logs
sudo journalctl -u overmind -f
```

### Server Management TUI

Use the built-in Terminal UI for monitoring:

```bash
python3 palvelin.py
```

**Features**:
- Real-time status and uptime
- Resource monitoring (CPU, RAM, disk)
- Online visitors tracking
- Upload management
- Automatic cleanup
- Service control (start/stop/restart)

**Keyboard Shortcuts**:
- **S** - Start service
- **T** - Stop service  
- **R** - Restart service
- **C** - Run cleanup now
- **L** - View logs
- **Q** - Quit

### Configuration

Edit `.env` file:

```bash
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Optional: OpenAI API key
OPENAI_API_KEY=sk-...

# Optional: File browser root
FILE_BROWSER_ROOT=/home/user/Documents

# Security
SECRET_KEY=<generated-by-installer>
```

---

## 📷 Camera Features

### Setup

1. Configure cameras in `data/cameras.json`:

```json
[
  {
    "id": "front_door",
    "name": "Front Door",
    "rtspUrl": "rtsp://camera-ip:554/stream",
    "enabled": true,
    "sensitivity": 0.02,
    "minMotionSeconds": 2,
    "cooldownSeconds": 30,
    "outputDir": "recordings/front_door",
    "audio": false
  }
]
```

2. Ensure ffmpeg is installed:

```bash
sudo apt-get install ffmpeg
```

3. Test the camera:

```bash
curl http://localhost:3000/api/cameras/front_door/test
```

### How It Works

- Motion detection using ffmpeg scene change heuristics
- 5-second ring buffer captures pre-motion footage
- Recordings: `recordings/<cameraId>/YYYY-MM-DD/HHMMSS__motion.mp4`
- Metadata in `data/recordings.json`

---

## 🌐 Public Access

### Option 1: ngrok (Quick & Easy)

```bash
python3 tools/ngrok_helper.py
```

### Option 2: nginx Reverse Proxy (Production)

```nginx
server {
    listen 443 ssl http2;
    server_name overmind.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

---

## 📊 Tech Stack

- **Backend**: Node.js 20 LTS, Express, WebSocket (ws)
- **Storage**: JSON files (MySQL adapter planned)
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **PWA**: Service Worker, Web App Manifest
- **Security**: crypto (PBKDF2), httpOnly cookies, rate limiting
- **Management**: Python 3.10+ (installer, TUI console)

---

## 📚 Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture and design
- [SECURITY.md](docs/SECURITY.md) - Security policy and threat model
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [API Documentation](docs/API.md) - Complete API reference (coming soon)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install
pip3 install -r requirements.txt

# Run in development mode
npm run dev

# Run tests (coming soon)
npm test
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with ❤️ by AnomFIN
- Thanks to the open-source community
- Inspired by self-hosted movement

---

## 🆘 Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
sudo lsof -i:3000

# Check logs
sudo journalctl -u overmind -xe

# Verify Node.js version
node --version  # Should be 20+
```

### WebSocket Connection Fails

- Check firewall allows WebSocket connections
- Verify nginx WebSocket proxy configuration
- Ensure session token is valid

### Features Not Working

- Check browser console (F12) for errors
- Verify `.env` configuration
- Ensure `data/` directory is writable
- Check server logs

### Need Help?

- Open an issue on [GitHub](https://github.com/AnomFIN/Overmind/issues)
- Check existing issues and documentation
- Include logs and error messages

---

**Made with 🧠 by AnomFIN**

*Self-host everything. Own your data. Stay in control.*
