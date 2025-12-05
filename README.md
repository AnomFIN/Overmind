# AnomHome Overmind

**AnomHome Overmind** is a self-hosted, Linux-first personal dashboard that keeps everything on your own machine.

It combines:

- 🧠 An OpenAI console
- 🔗 A fast link shortener
- 📁 15-minute temp file uploads
- 🗂️ A simple local file browser
- 📷 A camera wall
- 🧩 A shareable mind-map note board

All wrapped into a single, ultra-polished web UI served from your Linux box.

## Features (MVP)

- **OpenAI console**
  - Chat interface backed by OpenAI API.
  - API key is configured via `.env`, never exposed directly in the bundle.

- **Link shortener**
  - Create short codes for any URL.
  - JSON-based storage with click tracking.
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
  - Configurable HTTP/MJPEG endpoints via the dashboard.
  - Tile-based overview of home cameras.
  - Designed for local networks.

- **Mind-map notes**
  - Notes stored in JSON.
  - Visual board for ideas with drag-and-drop positioning.
  - Each note is shareable via unique URL.

## Tech Stack

- **Backend**
  - Node.js 20 LTS
  - Express
  - JSON file storage (`data/*.json`)

- **Frontend**
  - HTML5 (`GUI.html`)
  - CSS (responsive layout, dark theme)
  - Vanilla JavaScript

- **Installer**
  - `install.py` (Python 3.10+)
  - Sets up Node dependencies and explains errors clearly with retry support.

## Getting Started

### Prerequisites

- Linux machine (Ubuntu or similar)
- Node.js **20 LTS**
- Python **3.10+**
- npm

### Clone and Install

```bash
git clone https://github.com/AnomFIN/Overmind.git
cd Overmind
python3 install.py
```

`install.py` will:
- Check your Python and Node versions.
- Create a virtual environment (.venv) if needed.
- Run `npm install`.
- Print clear instructions if something fails and how to fix it.
- Offer to retry failed steps.

### Configuration

Copy `.env.example` to `.env` and set your values:

```env
PORT=3000
HOST=0.0.0.0
BASE_URL=http://localhost:3000

OPENAI_API_KEY=sk-...

MAX_FILE_SIZE_MB=50
UPLOAD_CLEANUP_MINUTES=15
TEMP_UPLOAD_DIR=./tmp_uploads

HOME_STORAGE_PATH=/path/to/your/files
```

### Start the Server

```bash
npm start
```

Then open: http://localhost:3000

You should see the AnomHome Overmind dashboard with panels for AI, links, uploads, files, cameras and notes.

### iPhone Home Screen

- Open the dashboard URL in Safari.
- Tap "Share" → "Add to Home Screen".
- The app is designed to feel like a full-screen web app on iOS.

## Project Structure

```
Overmind/
├── server.js           # Main Express server
├── package.json        # Node.js dependencies
├── install.py          # Python installation script
├── .env.example        # Environment configuration template
├── .env                # Your local configuration (git ignored)
├── public/
│   └── GUI.html        # Main dashboard frontend
├── data/
│   ├── links.json      # Link shortener data
│   ├── uploads.json    # Upload metadata
│   ├── cameras.json    # Camera configurations
│   └── notes.json      # Mind-map notes
└── tmp_uploads/        # Temporary file storage (15-min TTL)
```

## API Reference

### OpenAI Chat Console

```http
POST /api/chat
Content-Type: application/json

{"message": "Hello!", "model": "gpt-3.5-turbo"}
```

### Link Shortener

```http
POST /api/links        # Create short link
GET /api/links         # List all links
DELETE /api/links/:slug
GET /s/:slug           # Redirect to original URL
```

### File Upload (15-min TTL)

```http
POST /api/upload       # Upload file (multipart/form-data)
GET /api/uploads       # List all uploads
DELETE /api/uploads/:id
```

### File Browser

```http
GET /api/files?path=   # List files in directory
GET /api/files/download?path=  # Download file
```

### Camera Wall

```http
GET /api/cameras       # List all cameras
POST /api/cameras      # Add camera {"name": "...", "url": "..."}
DELETE /api/cameras/:id
```

### Mind-Map Notes

```http
GET /api/notes         # List all notes
GET /api/notes/:id     # Get single note
POST /api/notes        # Create note {"title": "...", "content": "...", "color": "#58a6ff"}
PUT /api/notes/:id     # Update note position/content
DELETE /api/notes/:id
GET /note/:id          # Shareable note page
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `BASE_URL` | http://localhost:3000 | Base URL for generated links |
| `OPENAI_API_KEY` | - | OpenAI API key for chat |
| `MAX_FILE_SIZE_MB` | 50 | Maximum upload file size |
| `UPLOAD_CLEANUP_MINUTES` | 15 | Minutes before uploads expire |
| `TEMP_UPLOAD_DIR` | ./tmp_uploads | Upload storage directory |
| `HOME_STORAGE_PATH` | - | Path for file browser (read-only) |

## Security Notes

- **API Keys**: OpenAI key stored server-side, never exposed to frontend
- **File Uploads**: Automatically deleted after expiration (default 15 min)
- **File Browser**: Read-only with path traversal protection
- **Local Data**: All data stored locally in JSON files
- **.env File**: Never commit to version control

## Roadmap

- Better mind-map visualization and drag-and-drop
- Optional local GGUF / llama.cpp adapter via HTTP
- Authentication and user profiles (optional, opt-in)
- More camera integrations and layouts

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
