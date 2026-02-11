# AnomHome Overmind

**AnomHome Overmind** is a self-hosted, Linux-first personal dashboard that keeps everything on your own machine.

It combines:

- 🧠 An AI chat console (local llama-server)
- 🔗 A fast link shortener
- 📁 15-minute temp file uploads
- 🗂️ A simple local file browser
- 📷 Motion-triggered camera recorder (local-first)
- 🧩 A shareable mind-map note board

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

## Nettiauto Car Listing Scraper

**New Feature**: This repository now includes a Finnish car listing scraper that collects registration numbers from Nettiauto.

### Features
- 🚗 Scrapes car listings from Nettiauto search results
- 🔍 Extracts Finnish registration numbers (plates like ABC-123)
- 📊 Outputs data in JSON and TXT formats
- 🌐 GitHub Pages site to view results on any device (including iPhone)
- ⏰ Automated nightly scraping via GitHub Actions

### How to Use

#### 1. Run the Scraper Locally

```bash
# Install dependencies (includes Playwright)
npm install

# Install Playwright browsers
npx playwright install chromium

# Run the scraper
npm run scrape
```

This creates:
- `data/plates.json` - Full JSON database with all scraped data
- `data/plates.txt` - Simple newline-separated list of unique plates

#### 2. Build GitHub Pages

```bash
# Copy data files to docs/data for GitHub Pages
npm run build-pages
```

#### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose branch: `main` (or your default branch) and folder: `/docs`
5. Click **Save**
6. Wait a few minutes for the site to deploy

Your plates site will be available at: `https://<username>.github.io/<repo-name>/`

#### 4. Enable Automated Scraping

The GitHub Actions workflow is already configured to:
- Run automatically every night at 2 AM UTC
- Run manually via workflow_dispatch

To trigger manually:
1. Go to **Actions** tab in your GitHub repository
2. Select **Scrape Nettiauto** workflow
3. Click **Run workflow**

The workflow will automatically commit and push updated data files.

#### 5. View Results on iPhone

1. Open Safari on your iPhone
2. Navigate to your GitHub Pages URL: `https://<username>.github.io/<repo-name>/`
3. Add to Home Screen for easy access:
   - Tap the Share button
   - Select "Add to Home Screen"
   - Name it "Nettiauto Plates"

The site is fully responsive and works great on mobile devices!

### File Structure

```
├── scripts/
│   └── scrape.js           # Main scraper script
├── data/
│   ├── plates.json         # Scraped data (JSON)
│   └── plates.txt          # Unique plates (TXT)
├── docs/
│   ├── index.html          # GitHub Pages site
│   ├── app.js              # Frontend JavaScript
│   └── data/               # Copy of data files for Pages
│       ├── plates.json
│       └── plates.txt
└── .github/workflows/
    └── scrape-nettiauto.yml # GitHub Actions workflow
```

### Scraper Configuration

You can customize the scraper by editing `scripts/scrape.js`:
- `SEARCH_URL` - The Nettiauto search URL to scrape
- `MAX_CONCURRENCY` - Number of concurrent page scrapes (default: 2)
- `MIN_DELAY` / `MAX_DELAY` - Random delay between page visits (ms)
- `MAX_RETRIES` - Number of retries for failed navigation

### Security & Ethics

- The scraper uses random delays (500-1200ms) to be respectful to Nettiauto servers
- Runs in headless mode in GitHub Actions
- No hardcoded secrets or credentials
- Rate-limited with max concurrency of 2

## TODO (next 2–3 iterations)
- Add a small GUI toggle in settings for LM Studio auto-detection.
- Add request/response metrics endpoint for local model latency tracking.
- Stream token responses to the chat UI when LM Studio streaming is enabled.
