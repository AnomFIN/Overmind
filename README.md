# AnomHome Overmind

A self-hosted home dashboard that runs on Linux and keeps all data local. Think of it as your personal command center combining an AI console, link shortener, temp file drop, file browser, camera wall, and mind-map note board - all in one sleek, dark-themed web UI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20%2B-green.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)

## ✨ Features

- **🤖 AI Console** - Chat with OpenAI models, conversation history stored locally
- **🔗 Link Shortener** - Create short URLs with optional expiry and hit tracking
- **📁 Temp Uploads** - Anonymous file uploads with 15-minute TTL (configurable)
- **🗂️ File Browser** - Read-only view of a configured directory with download support
- **📹 Camera Wall** - View your home cameras (HTTP MJPEG, HLS streams)
- **📝 Notes Board** - Mind-map style notes with tags and shareable links

### Design Philosophy

- **Privacy First**: All data stored locally in JSON files
- **Minimal Dependencies**: Only essential, stable packages
- **Self-Contained**: No external databases required
- **Mobile Ready**: Works great as an iPhone Home Screen app

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** ([Download](https://nodejs.org))
- **Python 3.10+** ([Download](https://python.org))
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AnomFIN/Overmind.git
   cd Overmind
   ```

2. **Run the installer**
   ```bash
   python3 install.py
   ```
   
   The installer will:
   - Verify your Python and Node.js versions
   - Install npm dependencies
   - Create necessary directories
   - Set up your `.env` file from `.env.example`
   - Initialize data files

3. **Configure your environment**
   ```bash
   # Edit .env with your settings
   nano .env
   ```
   
   Key settings:
   - `OPENAI_API_KEY`: Your OpenAI API key for the AI console
   - `PORT`: Server port (default: 3000)
   - `HOME_STORAGE_PATH`: Directory for the file browser

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📖 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `BASE_URL` | Public URL for links | `http://localhost:3000` |
| `OPENAI_API_KEY` | OpenAI API key | *(required for AI)* |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `ENABLE_OPENAI` | Enable AI console | `true` |
| `ENABLE_LINKS` | Enable link shortener | `true` |
| `ENABLE_UPLOADS` | Enable temp uploads | `true` |
| `ENABLE_FILES` | Enable file browser | `true` |
| `ENABLE_CAMERAS` | Enable camera wall | `true` |
| `ENABLE_NOTES` | Enable notes board | `true` |
| `HOME_STORAGE_PATH` | File browser root | `./uploads` |
| `UPLOAD_MAX_SIZE_MB` | Max upload size | `50` |
| `UPLOAD_TTL_MINUTES` | Upload expiry time | `15` |

## 🛠️ Usage

### AI Console

Chat with OpenAI directly from your dashboard. Your conversation history is stored locally and can be cleared at any time.

**Note**: You must set `OPENAI_API_KEY` in `.env` for this feature to work.

### Link Shortener

1. Click **+ New** in the Links panel
2. Enter the long URL
3. Optionally set a custom code and expiry
4. Click **Create Link**

The short URL is automatically copied to your clipboard. Access links at:
```
http://your-server/r/your-code
```

### Temp Uploads

1. Drag and drop a file onto the upload zone, or click to browse
2. The file URL is automatically copied
3. Files expire after 15 minutes (configurable)

### File Browser

Navigate the configured `HOME_STORAGE_PATH` directory. Click files to download them.

**Security**: Path traversal is prevented - you can only access files within the configured directory.

### Camera Wall

1. Click **+ Add** in the Cameras panel
2. Enter camera name and stream URL
3. Select stream type (HTTP MJPEG, HLS, or RTSP)

**Supported Formats**:
- HTTP MJPEG streams display directly
- HLS streams display directly
- RTSP streams show a placeholder (requires server-side transcoding)

### Notes Board

1. Click **+ New** to create a note
2. Add title, content, and tags
3. Click notes to edit them

Each note gets a shareable link: `http://your-server/?note=id`

## 📁 Project Structure

```
Overmind/
├── src/
│   ├── server.js         # Main Express server
│   ├── storage.js        # JSON storage layer
│   ├── routes/
│   │   └── api.js        # API endpoints
│   └── services/
│       ├── openai.js     # OpenAI integration
│       └── cleanup.js    # Expired file cleanup
├── public/
│   └── GUI.html          # Dashboard frontend
├── data/                  # JSON data storage
├── uploads/               # Temporary file uploads
├── install.py            # Installation script
├── package.json          # Node.js dependencies
└── .env.example          # Configuration template
```

## 🔒 Security

- API keys are **never exposed** to the frontend
- File browser prevents **directory traversal**
- Uploads are **automatically cleaned up**
- All data stored **locally** - no cloud dependency

## 🧑‍💻 Development

```bash
# Start with auto-reload
npm run dev

# View logs
tail -f logs/*.log
```

## 📄 API Reference

### Config
- `GET /api/config` - Get feature flags and configuration

### Chat
- `POST /api/chat` - Send message to AI
- `GET /api/chat/history` - Get conversation history
- `DELETE /api/chat/history` - Clear history

### Links
- `GET /api/links` - List all links
- `POST /api/links` - Create short link
- `DELETE /api/links/:code` - Delete link

### Uploads
- `GET /api/uploads` - List active uploads
- `POST /api/uploads` - Upload file
- `DELETE /api/uploads/:id` - Delete upload

### Files
- `GET /api/files?path=` - Browse directory
- `GET /api/files/download?path=` - Download file

### Cameras
- `GET /api/cameras` - List cameras
- `POST /api/cameras` - Add camera
- `PUT /api/cameras/:id` - Update camera
- `DELETE /api/cameras/:id` - Delete camera

### Notes
- `GET /api/notes` - List notes
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
