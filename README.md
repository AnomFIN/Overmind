# AnomHome Overmind

**Version 1.1** - End-to-End Encrypted Chat, Enterprise Authentication, and Mobile Optimization

**AnomHome Overmind** is a self-hosted, Linux-first personal dashboard that keeps everything on your own machine.

It combines:

- 🔐 **User Authentication** - Secure login with bcrypt password hashing
- 💬 **Secure Chat** - End-to-end encrypted messaging with friends
- ⚙️ **Settings Management** - AI personas, branding, camera sources (Admin only)
- 🧠 **OpenAI Console** - Configurable AI personas with custom system prompts
- 🔗 **Link Shortener** - Fast URL shortening with click tracking
- 📁 **15-Minute Temp Uploads** - Anonymous file sharing with auto-expiry
- 🗂️ **Local File Browser** - Safe read-only access to local files
- 📷 **Camera Wall** - Motion-triggered recording and live streaming
- 🗺️ **Mobile-Optimized MindMap** - Touch-enabled, zoomable mind mapping

All wrapped into a single, ultra-polished web UI served from your Linux box.

---

## What's New in v1.1

### 🔐 End-to-End Encrypted Chat
- **Zero-Knowledge Encryption**: Messages encrypted client-side before reaching server
- **RSA + AES Encryption**: 2048-bit RSA key pairs with AES-256-GCM for messages
- **Encrypted File Sharing**: Share files up to 10MB with full encryption
- **Real-Time Updates**: WebSocket-powered instant message delivery
- **Typing Indicators**: See when friends are typing (without revealing content)
- **Read Receipts**: Know when messages are delivered and read
- **Message Deletion**: Delete messages for yourself or for everyone
- **Friends System**: Only chat with approved friends for added security
- **WhatsApp-Style UI**: Modern, familiar chat interface with dark mode support
- **Mobile Responsive**: Full chat experience on mobile devices

See [CHAT_SECURITY.md](./CHAT_SECURITY.md) for detailed security documentation.

### 🔐 Authentication & Security
- **User Management**: Register/login with username or email
- **Role-Based Access**: Admin and user roles with granular permissions
- **Secure Sessions**: httpOnly cookies with bcrypt password hashing (12 rounds)
- **Rate Limiting**: Protection against brute-force attacks
- **Default Admin**: Auto-created on first startup (username: `admin`, password: `admin123`)

### ⚙️ Admin Settings
- **AI Personas**: Create and manage AI personality profiles with custom system prompts
- **Branding**: Customize logo, background, app name, and primary color
- **Camera Sources**: Add and manage HTTP/HTTPS camera endpoints

### 📱 Mobile Experience
- **Responsive MindMap**: Works perfectly on mobile devices (tested on iPhone 390px width)
- **Touch Controls**: Pinch-to-zoom and pan gestures
- **Zoom Buttons**: +, -, and "Fit to Screen" controls
- **Mobile Chat**: Full-featured chat interface optimized for mobile

---

## Features

- **Secure Chat** (NEW!)
  - End-to-end encrypted messaging between friends
  - Messages encrypted with RSA-OAEP (2048-bit) + AES-256-GCM
  - Real-time delivery via WebSocket connections
  - Encrypted file attachments (up to 10MB)
  - Typing indicators and read receipts
  - Message history with full persistence
  - WhatsApp/Messenger-style modern UI
  - Zero-knowledge server architecture

- **OpenAI console**
  - Chat interface backed by OpenAI API.
  - Messages stored locally in JSON files.
  - API key is configured via `.env`, never exposed directly in the bundle.

- **Link shortener**
  - Create short codes for any URL.
  - JSON-based storage with optional expiry.
  - Redirect endpoint and basic click stats.

- **15-minute temp uploads**
  - Anonymous file uploads with default 15-minute TTL.
  - Files stored under a temp directory.
  - Background cleanup for expired files.
  - Each file gets a shareable URL.

- **Local file browser**
  - Read-only view into a configured directory on disk.
  - Safe path handling (no directory traversal).
  - Download files from the browser.

- **Camera wall**
  - Configurable RTSP/HTTP endpoints via JSON.
  - Tile-based overview of home cameras.
  - Designed for local networks.

- **Mind-map notes**
  - Notes and relations stored in JSON.
  - Visual board for ideas and links.
  - Each note is shareable via unique URL.

---

## Tech stack

- **Backend**
  - Node.js 20 LTS
  - Express
  - JSON file storage (`data/*.json`)

- **Frontend**
  - HTML5 (`GUI.html`)
  - CSS (responsive layout, dark theme)
  - Vanilla JavaScript + optional jQuery (CDN)

- **Installer**
  - `install.py` (Python 3.10+)
  - Sets up Python and Node dependencies and explains errors clearly.

---

## Getting started

### Prerequisites

- Linux machine (Ubuntu or similar)
- Node.js **20 LTS**
- npm

### Quick Start

```bash
# Clone the repository
git clone https://github.com/AnomFIN/Overmind.git
cd Overmind

# Install dependencies
npm install

# (Optional) Configure environment variables
cp .env.example .env
# Edit .env with your OpenAI API key and other settings

# Start the server
npm start
```

The server will start at `http://localhost:3000`

### First Login

1. Navigate to `http://localhost:3000`
2. You'll be redirected to the login page
3. Login with the default admin credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
4. **⚠️ IMPORTANT**: Change the default password immediately in Settings!

### Using Secure Chat

1. **Add Friends**: Before chatting, you need to add friends:
   - Navigate to Friends section in the dashboard
   - Send friend requests to other users
   - Wait for them to accept your request

2. **Start Chatting**:
   - Click on "🔐 Secure Chat" in the navigation menu
   - Select a friend from your contacts list
   - Start sending encrypted messages!

3. **Key Generation**: 
   - Encryption keys are automatically generated on first use
   - Keys are stored securely in your browser's IndexedDB
   - Your private key is also backed up (encrypted) on the server

4. **Sending Files**:
   - Click the 📎 attachment button
   - Select a file (max 10MB)
   - File is automatically encrypted before upload

**Note**: All messages are end-to-end encrypted. Even the server administrator cannot read your messages. See [CHAT_SECURITY.md](./CHAT_SECURITY.md) for details.

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development  # Set to 'production' in production

# OpenAI Configuration (required for AI chat)
OPENAI_API_KEY=your_openai_api_key_here

# Admin User (optional - overrides defaults)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123  # Change this!
ADMIN_EMAIL=admin@overmind.local

# File Browser (optional)
FILE_BROWSER_ROOT=/path/to/browse

# Security (optional - auto-generated if not provided)
SECRET_KEY=your_random_secret_key
```

### Production Deployment

For production environments:

1. Set `NODE_ENV=production` in your `.env`
2. Change the default admin password
3. Use HTTPS (configure via reverse proxy like nginx)
4. Set a strong `SECRET_KEY`
5. Configure CORS if needed with `CORS_ORIGIN`

---

## Clone and install

```bash
git clone https://github.com/<your-org>/anomhome-overmind.git
cd anomhome-overmind
python3 install.py

## Cameras: motion recorder
- Configure cameras in `data/cameras.json` (`id`, `name`, `rtspUrl`, `enabled`, `sensitivity`, `minMotionSeconds`, `cooldownSeconds`, `outputDir`, `audio`).
- Motion detection uses ffmpeg scene change heuristics with a 5s ring buffer to capture pre/post footage.
- Recordings land under `recordings/<cameraId>/YYYY-MM-DD/HHMMSS__motion.mp4` and are indexed in `data/recordings.json`.
- Use `/api/cameras/:id/test` to capture a 3s diagnostic clip.
- Requires `ffmpeg` on the host; OpenCV is optional.

## Public exposure with ngrok
- Run `python3 tools/ngrok_helper.py` to set the auth token and expose port 3000 (or your custom port).
- The helper saves config to `data/ngrok.json` and streams the tunnel logs.
- Use the printed public URL for quick sharing; pair with the built-in link shortener for nicer URLs.

## Server Console (palvelin.py)

**palvelin.py** is a terminal-based GUI (TUI) for managing the Overmind server. It provides real-time monitoring and control capabilities.

### Features

- **Status Dashboard**: View service status, uptime, and version information
- **Resource Monitoring**: Real-time CPU, RAM, disk usage, and load averages
- **Online Visitors**: Track active sessions, peak visitors, and requests per minute
- **Uploads Management**: Monitor upload directory size, file count, and expiring files
- **Automatic Cleanup**: 
  - **TTL Policy**: Files automatically expire after 15 minutes
  - **Capacity Cap**: 5 GB maximum - oldest files deleted first when limit reached
- **Service Control**: Start, stop, and restart the Overmind service (requires systemctl)

### Installation

Install Python dependencies for the TUI:

```bash
pip3 install -r requirements.txt
```

### Usage

Start the server management console:

```bash
python3 palvelin.py
```

### Keyboard Shortcuts

- **S** - Start service (requires systemctl)
- **T** - Stop service (requires systemctl)
- **R** - Restart service (requires systemctl)
- **C** - Run cleanup now (removes expired and over-capacity files)
- **L** - View service logs (requires systemctl/journalctl)
- **Q** - Quit the console

### Upload Retention Policy

The system manages uploads with a dual approach:

1. **15-Minute TTL**: All uploads expire 15 minutes after creation
2. **5 GB Capacity Cap**: When total uploads exceed 5 GB, oldest files are deleted first (LRU)

Both cleanup operations run automatically every 60 seconds and can be triggered manually with **C** key.

### Admin API Endpoints

The following admin endpoints are available for the TUI:

- `GET /api/admin/metrics` - System and application metrics
- `GET /api/admin/uploads` - Upload directory information
- `POST /api/admin/cleanup` - Trigger manual cleanup

### Security

Admin endpoints are **restricted to localhost only** by default. Any requests from non-localhost IPs will be rejected with a 403 error.

**For production deployments**, consider these additional security measures:
- Add rate limiting (e.g., using `express-rate-limit`)
- Implement authentication tokens for admin access
- Use HTTPS with client certificates
- Run behind a reverse proxy with IP whitelisting
- Monitor access logs for suspicious activity

**Important**: Never expose admin endpoints to the public internet without proper authentication and encryption.

## Why this design
- Local-first: recordings stay on disk and JSON metadata avoids DB setup.
- Resilient: ffmpeg segmenter auto-restarts on drops; concat keeps files portable.
- Secure by default: sanitized paths, RTSP URLs stay server-side.
- Minimal dependencies: vanilla Express + ffmpeg CLI + optional ngrok binary.
