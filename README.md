# AnomHome Overmind

A self-hosted home dashboard for Linux integrating Node.js Express backend and HTML5 frontend with features like AI chat, link shortener, temporary file uploads, and more.

## Features

### Current MVP Features

- **OpenAI Chat Console** - AI-powered chat interface with secure API key handling via server-side proxy
- **Link Shortener** - Create and manage shortened URLs with click tracking
- **Temporary File Upload** - Upload files with automatic expiration and cleanup

### Planned Features

- File Browser
- Camera Wall
- Mind Mapping

## Requirements

- **Node.js 20+** - [Download from nodejs.org](https://nodejs.org/)
- **npm** - Included with Node.js
- **Python 3.6+** - For installation script (optional)
- **Linux/macOS/Windows** - Cross-platform compatible

## Quick Start

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AnomFIN/Overmind.git
   cd Overmind
   ```

2. **Run the installation script:**
   ```bash
   python install.py
   ```

   Or manually install dependencies:
   ```bash
   npm install
   cp .env.example .env
   ```

3. **Configure your settings:**
   Edit the `.env` file to set your OpenAI API key and other options:
   ```
   PORT=3000
   HOST=0.0.0.0
   OPENAI_API_KEY=your_openai_api_key_here
   MAX_FILE_SIZE_MB=50
   UPLOAD_CLEANUP_HOURS=24
   BASE_URL=http://localhost:3000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## Installation Script Options

The `install.py` script supports several options:

```bash
python install.py              # Full installation
python install.py --skip-npm   # Skip npm dependency installation
python install.py --skip-venv  # Skip Python virtual environment setup
python install.py --help       # Show help message
```

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
│   └── uploads.json    # Upload metadata
└── uploads/            # Temporary file storage
```

## API Reference

### OpenAI Chat Console

**Send a message:**
```
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "model": "gpt-3.5-turbo"  // optional, defaults to gpt-3.5-turbo
}

Response:
{
  "reply": "I'm doing well, thank you!",
  "model": "gpt-3.5-turbo"
}
```

### Link Shortener

**Create a short link:**
```
POST /api/links
Content-Type: application/json

{
  "url": "https://example.com/very/long/url",
  "customSlug": "mylink"  // optional
}

Response:
{
  "slug": "mylink",
  "shortUrl": "http://localhost:3000/s/mylink",
  "originalUrl": "https://example.com/very/long/url"
}
```

**Get all links:**
```
GET /api/links

Response:
{
  "mylink": {
    "url": "https://example.com/very/long/url",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "clicks": 5
  }
}
```

**Delete a link:**
```
DELETE /api/links/:slug
```

**Redirect (use a short link):**
```
GET /s/:slug
→ Redirects to original URL
```

### File Upload

**Upload a file:**
```
POST /api/upload
Content-Type: multipart/form-data
Body: file=<file>

Response:
{
  "id": "abc123",
  "downloadUrl": "http://localhost:3000/uploads/abc123.pdf",
  "originalName": "document.pdf",
  "size": 102400,
  "expiresAt": "2025-01-02T00:00:00.000Z"
}
```

**Get all uploads:**
```
GET /api/uploads

Response:
[
  {
    "id": "abc123",
    "filename": "abc123.pdf",
    "originalName": "document.pdf",
    "size": 102400,
    "mimetype": "application/pdf",
    "uploadedAt": "2025-01-01T00:00:00.000Z",
    "expiresAt": "2025-01-02T00:00:00.000Z"
  }
]
```

**Delete an upload:**
```
DELETE /api/uploads/:id
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `OPENAI_API_KEY` | - | OpenAI API key for chat functionality |
| `MAX_FILE_SIZE_MB` | 50 | Maximum upload file size in MB |
| `UPLOAD_CLEANUP_HOURS` | 24 | Hours before uploaded files expire |
| `BASE_URL` | http://localhost:3000 | Base URL for generated links |

## Security Notes

- **API Keys**: The OpenAI API key is stored server-side and never exposed to the frontend
- **File Uploads**: Files are automatically deleted after the configured expiration period
- **Local Data**: All data is stored locally in JSON files under the `data/` directory
- **.env File**: Never commit your `.env` file to version control

## Development

Start the development server:
```bash
npm run dev
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
