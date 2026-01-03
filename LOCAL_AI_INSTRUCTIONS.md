# Local AI Setup Instructions

Quick setup guide for using local AI models with AnomHome Overmind.

## Prerequisites

- Local AI server running (llama.cpp, Ollama, etc.)
- Model server listening on a port (default: 8080)

## Setup Steps

### 1. Configure Environment

Edit your `.env` file:

```bash
AI_PROVIDER=local
LOCAL_SERVER_PORT=8080
```

Optional (for reference):
```bash
LOCAL_MODEL_PATH=/path/to/your/model.gguf
```

### 2. Start Local Model Server

**Option A - llama.cpp:**
```bash
./llama-server -m model.gguf -c 2048 --port 8080 --host 0.0.0.0
```

**Option B - Ollama:**
```bash
# First, start Ollama
ollama serve

# Then run your model
ollama run llama2
```

### 3. Start Overmind

```bash
npm start
# or
node backend/server.js
```

## Usage

1. Open http://localhost:3000
2. Navigate to Chat Console
3. Status should show "✓ Local AI connected"
4. Start chatting with your local model

## Troubleshooting

**"Local AI not configured"** → Check environment variables
**"Connection failed"** → Ensure local server is running on correct port
**"Timeout"** → Model might be slow, wait or restart server

## Supported Servers

- ✅ llama.cpp server
- ✅ Ollama (with OpenAI compatibility)
- ✅ Text generation web UI
- ✅ Any server with `/v1/chat/completions` endpoint