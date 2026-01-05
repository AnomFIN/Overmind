# Copilot Instructions – AnomHome Overmind

You are helping to build **AnomHome Overmind**, a self-hosted, Linux-first personal dashboard. The user hates dependency hell and wants a high-quality, stable codebase.

## High-level goals

- Produce **clean, maintainable, production-grade** code.
- Use **minimal and stable** dependencies.
- Keep all data stored **locally** as JSON files on disk.
- Make the UI feel **premium, smooth and “insanely polished”**.

## Tech choices

- **Backend**
  - Node.js **20 LTS**
  - Express HTTP server
  - JSON file storage in `data/` (no heavy external DB)
  - Config via `.env` (PORT, BASE_URL, LOCAL_SERVER_PORT, etc.)

- **Frontend**
  - `GUI.html` entry file
  - HTML5 + modern CSS
  - Vanilla JS as default
  - Optional jQuery from CDN as the single major JS library
  - Responsive UI, works well on desktop and iPhone Safari (Home Screen shortcut)

- **Installer**
  - `install.py` (Python 3.10+)
  - Uses standard library (`venv`, `subprocess`, `sys`, `pathlib`) to:
    - Create a virtual environment if needed.
    - Run `pip install -r requirements.txt` (if the file exists).
    - Run `npm install`.
    - Detect and explain common failures with clear, friendly messages.

## Coding standards

- Prefer simple, explicit code over clever abstractions.
- TypeScript is allowed and preferred on the backend if introduced, but keep configuration simple.
- Add comments for non-obvious logic.
- Use small, focused modules (e.g. separate router files, storage utilities, etc.).

## Dependency policy

- Keep Node dependencies small:
  - `express`, `dotenv`, maybe one utility library is fine.
  - Avoid large frameworks or heavy build chains unless absolutely required.
- Avoid native build dependencies when possible.
- Pin all dependency versions to avoid surprises from updates.

## UX and UI

- Dashboard should feel “overkill but clean”:
  - Panel-based layout with show/hide toggles.
  - Hover effects, smooth transitions.
  - A nice first-load intro animation built with CSS and JS.
- Ensure good error handling:
  - If a feature is misconfigured, show a clear message instead of a broken UI.

## Documentation

- Keep `README.md` up to date with:
  - Setup and install steps (`python install.py`).
  - Environment variables.
  - Module descriptions (AI console, shortener, uploads, cameras, mind-map).
- When you introduce new features, update the docs and add minimal tests where appropriate.

When in doubt, choose the **more stable, dependency-light** option and explain your decision with short comments in the code.