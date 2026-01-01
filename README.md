# AnomHome Overmind

**Version 1.1** - End-to-End Encrypted Chat, Enterprise Authentication, and Mobile Optimization

**AnomHome Overmind** is a self-hosted personal dashboard that works on both Linux servers and standard web hosting.

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

**Two Deployment Options:**
1. **Linux Server** - Full-featured Node.js deployment (original method)
2. **Web Hosting** - PHP/MySQL deployment for standard shared hosting (NEW!)

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

## 🌐 Installation Guide

Choose your deployment method:

### Option 1: Web Hosting (PHP/MySQL) - Super Easy! 🎉

**Perfect for:** Shared hosting, cPanel, Plesk, or any hosting with PHP and MySQL support.

**Requirements:**
- PHP 7.4 or higher
- MySQL 5.7 or higher  
- At least 100MB disk space
- Apache with mod_rewrite (or equivalent)

#### Step-by-Step Installation (So Easy a 6-Year-Old Can Do It!)

**On Your Windows Computer:**

1. **Download the Repository**
   - Download this repository as a ZIP file
   - Extract it to a folder on your computer
   - Open the folder in Windows Explorer

2. **Prepare Files for Upload**
   - Double-click `install.bat` 
   - Wait for it to finish (it creates a `webhotel_deploy` folder)
   - Read the `UPLOAD_INSTRUCTIONS.txt` file created in `webhotel_deploy`

3. **Upload to Your Web Host**
   - Using your hosting's file manager or FTP client (like FileZilla):
   - Upload **ALL files** from the `webhotel_deploy` folder to your website's root folder
   - Usually this is called `public_html`, `www`, or `htdocs`

**On Your Web Hosting (in your browser):**

4. **Configure Database Credentials**
   - Log into your hosting control panel (cPanel/Plesk)
   - Create a new MySQL database (write down the database name)
   - Create a MySQL user (write down the username and password)
   - Give the user full access to the database

5. **Run the Installation Wizard**
   - Open your website in a browser: `http://yourwebsite.com/install.php`
   - Follow the step-by-step wizard:
     - **Step 1:** System checks (automatic)
     - **Step 2:** Enter your database details
     - **Step 3:** Create your admin account
     - **Step 4:** Done! 🎉

6. **Security Final Steps**
   - Delete the `install.php` file from your server (via file manager or FTP)
   - Log in to your website
   - Go to Settings and **change your admin password**

**That's it! Your dashboard is now live! 🚀**

#### Setting Folder Permissions

If you see permission errors, you need to make some folders writable:

**Via cPanel File Manager:**
1. Right-click on the folder → Change Permissions
2. Set these folders to `755` or `777`:
   - `uploads`
   - `tmp_uploads`
   - `data`

**Via FTP (FileZilla):**
1. Right-click on the folder → File Permissions
2. Set to `755` or `777` for the folders above

#### Optional: Enable OpenAI Chat

1. Get an API key from https://platform.openai.com/api-keys
2. Edit `php/config.php` on your server
3. Add your API key: `define('OPENAI_API_KEY', 'your-key-here');`

#### Optional: Enhanced Installer Security

For additional security, protect the installer with a token:

1. Set environment variable `INSTALL_TOKEN` to a random string in your hosting control panel
2. Access installer with: `http://yoursite.com/install.php?token=your-token`
3. Without the correct token, the installer will be blocked

**Note:** This is optional and only needed if you want extra protection during installation.

---

### Option 2: Linux Server (Node.js) - Full Features

**Perfect for:** VPS, dedicated servers, or local Linux machines with full control.

**Requirements:**
- Linux machine (Ubuntu or similar)
- Node.js **20 LTS**
- npm

#### Quick Start

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

#### First Login

1. Navigate to `http://localhost:3000`
2. You'll be redirected to the login page
3. Login with the default admin credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
4. **⚠️ IMPORTANT**: Change the default password immediately in Settings!

#### Environment Variables

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

#### Production Deployment

For production environments:

1. Set `NODE_ENV=production` in your `.env`
2. Change the default admin password
3. Use HTTPS (configure via reverse proxy like nginx)
4. Set a strong `SECRET_KEY`
5. Configure CORS if needed with `CORS_ORIGIN`

---

## 🔧 Troubleshooting

### Web Hosting Installation Issues

**Problem: "Database connection failed"**
- Check your database credentials in Step 2 of the installer
- Make sure the database exists in your hosting control panel
- Try `localhost` or `127.0.0.1` as the database host
- Contact your hosting provider to verify MySQL is enabled

**Problem: "Permission denied" or "Cannot write to folder"**
- Set folder permissions to `755` or `777` for: `uploads`, `tmp_uploads`, `data`
- Use your hosting file manager or FTP client to change permissions
- See "Setting Folder Permissions" section above

**Problem: "PHP extension missing"**
- Contact your hosting provider to enable missing PHP extensions
- Required: `mysqli`, `json`, `session`, `mbstring`
- Most hosting providers have these enabled by default

**Problem: "Internal Server Error (500)"**
- Check PHP error logs in your hosting control panel
- Make sure `.htaccess` file was uploaded
- Verify PHP version is 7.4 or higher
- Try renaming `.htaccess` to `htaccess.txt` temporarily to test

**Problem: "404 Not Found for API calls"**
- Ensure `.htaccess` file exists in root directory
- Check if `mod_rewrite` is enabled (ask your hosting provider)
- Verify all files were uploaded to the correct directory

### Linux Server Installation Issues

**Problem: Node.js version too old**
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Problem: "EADDRINUSE" - Port already in use**
- Change the PORT in `.env` file
- Or kill the process using: `sudo lsof -ti:3000 | xargs kill -9`

**Problem: "Module not found"**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

---

## 📋 Features Comparison

| Feature | Web Hosting (PHP) | Linux Server (Node.js) |
|---------|-------------------|------------------------|
| User Authentication | ✅ | ✅ |
| Link Shortener | ✅ | ✅ |
| File Uploads (15-min) | ✅ | ✅ |
| Mind Map Notes | ✅ | ✅ |
| Settings Management | ✅ | ✅ |
| AI Personas | ✅ | ✅ |
| OpenAI Chat | ✅ | ✅ |
| Local File Browser | ❌ | ✅ |
| Camera Wall | ❌ | ✅ |
| Motion Recording | ❌ | ✅ |
| WebSocket Support | ❌ | ✅ |

---

## Clone and install

```bash
git clone https://github.com/<your-org>/anomhome-overmind.git
cd anomhome-overmind
python3 install.py
```

### Security Configuration

**Important**: The settings endpoint (`/api/settings`) is protected by token-based authentication to prevent unauthorized access to sensitive configuration like API keys.

To secure your installation:
### Security notes

**⚠️ Important: Protect your .env file**

- The `.env` file contains sensitive credentials (API keys, session secrets)
- This file is automatically excluded from git via `.gitignore`
- **Never commit the `.env` file to version control**
- Use `.env.example` as a template for sharing configuration structure
### Environment setup

**Important:** Before running the application, you must configure your environment variables:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Generate a secure admin token:
   ```bash
   openssl rand -hex 32
   ```

3. Add the token to your `.env` file:
   ```
   ADMIN_TOKEN=your_generated_token_here
   ```

4. Use this token in the Settings panel UI to view and modify system settings.

**Note**: Without setting `ADMIN_TOKEN`, the settings endpoint will return a 503 error with setup instructions.
2. Edit `.env` and fill in your values:
   - `AI_PROVIDER` - The AI provider to use for chat (for example, `openai`)
   - `OPENAI_API_KEY` - Your OpenAI API key (required for AI chat when `AI_PROVIDER` is set to `openai`)
   - `SECRET_KEY` - A random, secure string for session management
   - Other optional settings as needed

3. **Security notice:**
   - The `.env` file is already in `.gitignore` to prevent accidental commits
   - Never commit `.env` files to version control
   - Keep your API keys and secrets secure
   - Use strong, random values for `SECRET_KEY` in production

### Running the application

```bash
npm start
```

Access the dashboard at `http://localhost:3000`

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
