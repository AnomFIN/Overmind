# AnomHome Overmind

**AnomHome Overmind** is a self-hosted, Linux-first personal dashboard that keeps everything on your own machine.

It combines:

- 🧠 An OpenAI console
- 🔗 A fast link shortener
- 📁 15-minute temp file uploads
- 🗂️ A simple local file browser
- 📷 Motion-triggered camera recorder (local-first)
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
```

### Run commands

```bash
# install (Linux/macOS)
python3 install.py

# dev server
npm start

# lint
npm run lint:fix

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
