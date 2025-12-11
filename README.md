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

---

## Features (MVP)

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
- Python **3.10+**
- npm

### Clone and install

```bash
git clone https://github.com/<your-org>/anomhome-overmind.git
cd anomhome-overmind
python3 install.py
