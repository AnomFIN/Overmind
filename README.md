# AnomHome Overmind 🧠

A powerful self-hosted home dashboard for Linux that brings together essential tools in one beautiful interface.

![Dashboard Preview](https://img.shields.io/badge/Node.js-20+-green) ![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **🤖 AI Chat Console** - Integrated OpenAI chat for quick questions and assistance
- **🔗 Link Shortener** - Fast URL shortening with custom codes and click tracking
- **📤 Temp File Uploads** - Share files that automatically expire after 15 minutes
- **📁 File Browser** - Browse and preview local files with search functionality
- **📷 Camera Wall** - Monitor IP cameras with MJPEG/HLS stream support
- **🗺️ Mind Map Notes** - Visual note-taking with shareable mind maps

## Quick Start

### Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **Python 3.8+** - For the install script

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AnomFIN/Overmind.git
   cd Overmind
   ```

2. Run the installation script:
   ```bash
   python3 install.py
   ```

   This will:
   - Check prerequisites
   - Create necessary directories
   - Set up a Python virtual environment
   - Install Node.js dependencies
   - Initialize configuration files

3. Configure your settings:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open http://localhost:3000 in your browser

### Manual Installation

If you prefer manual setup:

```bash
# Install Node.js dependencies
npm install

# Create required directories
mkdir -p backend/data uploads

# Copy environment file
cp .env.example .env

# Start the server
npm start
```

## Configuration

Edit `.env` file to customize your setup:

```env
# Server
PORT=3000
HOST=0.0.0.0

# OpenAI (for AI Chat feature)
OPENAI_API_KEY=your_api_key_here

# File Browser root directory (default: home directory)
FILE_BROWSER_ROOT=/path/to/browse

# Max upload size in MB
MAX_UPLOAD_SIZE=100
```

## API Endpoints

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Health | `GET /api/health` | Server status |
| System | `GET /api/system` | System information |
| Chat | `POST /api/chat` | Send message to AI |
| Links | `GET/POST /api/links` | Manage short links |
| Uploads | `POST /api/uploads` | Upload temp files |
| Files | `GET /api/files` | Browse local files |
| Cameras | `GET/POST /api/cameras` | Manage cameras |
| Notes | `GET/POST /api/notes` | Manage mind maps |

### Short Links

- Create: `POST /api/links` with `{ "url": "https://...", "customCode": "optional" }`
- Access: `GET /s/:code` redirects to original URL

### Temporary Uploads

Files uploaded to `/api/uploads` expire after 15 minutes. The cleanup service runs automatically.

### Mind Map Notes

Create visual mind maps with drag-and-drop nodes. Share publicly with unique codes:
- Public URL: `/share/:code`

## Development

```bash
# Run with auto-reload
npm run dev

# Run tests
npm test
```

## Project Structure

```
Overmind/
├── backend/
│   ├── server.js          # Express server
│   ├── routes/            # API route handlers
│   │   ├── chat.js        # OpenAI chat
│   │   ├── links.js       # Link shortener
│   │   ├── uploads.js     # Temp file uploads
│   │   ├── files.js       # File browser
│   │   ├── cameras.js     # Camera wall
│   │   └── notes.js       # Mind map notes
│   ├── utils/             # Utilities
│   │   ├── database.js    # JSON file database
│   │   └── cleanup.js     # Upload cleanup service
│   └── data/              # JSON data storage
├── public/
│   ├── GUI.html           # Main dashboard
│   ├── css/style.css      # Styles
│   └── js/app.js          # Frontend JavaScript
├── uploads/               # Temporary file storage
├── install.py             # Installation script
├── package.json           # Node.js dependencies
└── .env.example           # Configuration template
```

## Tech Stack

- **Backend**: Node.js 20, Express.js
- **Database**: JSON files (lightweight, no external DB required)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, jQuery (optional, via CDN)
- **Additional**: Multer (uploads), UUID (unique IDs), CORS

## Security Notes

- The file browser is restricted to a configurable root directory
- Uploaded files auto-delete after 15 minutes
- Camera passwords are not exposed in API responses
- OpenAI API key is never sent to the frontend

## License

MIT License - See [LICENSE](LICENSE) file

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ by [AnomFIN](https://github.com/AnomFIN)
