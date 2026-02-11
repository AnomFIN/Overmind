# AnomHome Overmind

**AnomHome Overmind** is a self-hosted, Linux-first personal dashboard that keeps everything on your own machine.

It combines:

- 🧠 An AI chat console (local llama-server)
- 🔗 A fast link shortener
- 📁 15-minute temp file uploads
- 🗂️ A simple local file browser
- 📷 Motion-triggered camera recorder (local-first)
- 🧩 A shareable mind-map note board
- 🚗 Finnish car listing scraper (Nettiauto)

All wrapped into a single, ultra-polished web UI served from your Linux box.

---

## Features (MVP)

- **AI chat console**
  - Chat interface backed by local llama-server (CMake-built binary).
  - Messages stored locally in JSON files.
  - No cloud dependencies - fully self-hosted AI.

- **Link shortener**
  - Create short codes for any URL.
- JSON-based storage with optional expiry.
  - Redirect endpoint and basic click stats.

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
```

### Run commands

```bash
# install (Linux/macOS)
python3 install.py

# dev server
npm start

# tests
python3 -m unittest discover -s tests
```

### Local AI (Windows + LM Studio bridge)

When you want Windows + LM Studio (OpenAI-compatible REST API) to power chat in `http://localhost:3000/gui.html`, run the local proxy and point Overmind to it.

1. **Start LM Studio** and enable the OpenAI-compatible server (`http://localhost:1234/v1/...`).
2. **Set environment variables** in your `.env`:

```env
AI_PROVIDER=local
LOCAL_SERVER_PORT=8081
```

3. **Run the proxy** from PowerShell:

```powershell
python .\\local_ai.py --listen-port 8081 --lm-studio-base http://localhost:1234
```

4. **Start Overmind**:

```powershell
npm start
```

#### Verify

```powershell
# Quick health check
curl http://localhost:8081/health

# Smoke test LM Studio proxy
echo '{"messages":[{"role":"user","content":"Ping"}]}' | python .\\local_ai.py --stdin
```

Expected: `{\"status\":200,\"data\":...}` and Overmind chat responds in the UI.

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

## Why this design
- Local-first: recordings stay on disk and JSON metadata avoids DB setup.
- Resilient: ffmpeg segmenter auto-restarts on drops; concat keeps files portable.
- Secure by default: sanitized paths, RTSP URLs stay server-side.
- Minimal dependencies: vanilla Express + ffmpeg CLI + optional ngrok binary.

## Why this design (Local AI bridge)
- Zero-dependency proxy keeps Windows setup simple and auditable.
- Validation + structured logs prevent silent failures and keep sensitive text out of logs.
- LM Studio stays the single model runtime; Overmind just points to a local port.
- Stdin mode doubles as a CLI smoke test without extra tooling.

## TODO (next 2–3 iterations)
- Add a small GUI toggle in settings for LM Studio auto-detection.
- Add request/response metrics endpoint for local model latency tracking.
- Stream token responses to the chat UI when LM Studio streaming is enabled.

---

## Nettiauto Car Scraper

A side-project that scrapes Finnish car listings from [Nettiauto.com](https://www.nettiauto.com) and extracts registration plates.

### Features

- 🔍 **Automated scraping** - Crawls through all search result pages
- 🚗 **Plate extraction** - Extracts Finnish registration numbers (ABC-123 format)
- 📊 **JSON database** - Stores all listings with metadata in `data/plates.json`
- 📝 **Text list** - Clean newline-separated list in `data/plates.txt`
- ⏰ **Scheduled updates** - Runs automatically every night via GitHub Actions
- 🌐 **GitHub Pages site** - View results at your GitHub Pages URL

### Setup

1. **Enable GitHub Pages**:
   - Go to your repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: Select your main branch and `/docs` folder
   - Click Save
   - Your site will be available at: `https://<username>.github.io/<repo-name>/`

2. **Run the scraper manually** (optional):
   ```bash
   npm install
   npm run scrape
   ```

3. **Run via GitHub Actions**:
   - Go to Actions tab in your repository
   - Select "Scrape Nettiauto Listings" workflow
   - Click "Run workflow" → "Run workflow"
   - The workflow will scrape data and commit results

### View Results

**On Desktop/Laptop**:
- Visit `https://<username>.github.io/<repo-name>/`

**On iPhone**:
1. Open Safari and navigate to your GitHub Pages URL
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" - now you have a dedicated app icon!
5. Open the icon to view the plate list anytime

### Files

- `scripts/scrape.js` - Main scraper script using Playwright
- `data/plates.json` - JSON database with full listing data
- `data/plates.txt` - Clean list of unique plates
- `docs/index.html` - GitHub Pages HTML
- `docs/app.js` - Frontend JavaScript
- `docs/data/` - Copy of data files for Pages
- `.github/workflows/scrape.yml` - GitHub Actions workflow

### How It Works

1. **Search Results**: Opens the Nettiauto search URL and paginates through all pages
2. **Extract URLs**: Collects all car listing URLs
3. **Scrape Plates**: Opens each listing and extracts the registration number
   - First tries to find labeled "Rekisteritunnus" field
   - Falls back to regex pattern matching (ABC-123 format)
4. **Save Data**: Outputs to JSON (full data) and TXT (plates only)
5. **GitHub Actions**: Automatically runs nightly, commits results, and updates Pages

### Configuration

Edit `scripts/scrape.js` to customize:
- `SEARCH_URL` - The Nettiauto search URL to scrape
- `MAX_CONCURRENCY` - Number of concurrent page scrapes (default: 2)
- `MIN_DELAY` / `MAX_DELAY` - Delay between requests in ms
- `MAX_RETRIES` - Number of retries for failed requests

### Throttling & Safety

- Random delays (500-1200ms) between page visits
- Maximum 2 concurrent page scrapes
- Retry logic for failed navigations
- Headless browser mode in CI
- Respectful scraping practices
