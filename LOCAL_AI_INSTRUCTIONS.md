# Local AI Setup Instructions

Quick setup guide for using local AI models with AnomHome Overmind.

## Prerequisites

- Local llama-server (CMake-built binary)
- Model server listening on a port (default: 8081)

## Setup Steps

### 1. Configure Environment

Edit your `.env` file:

```bash
LOCAL_SERVER_PORT=8081
```

Optional (for reference):
```bash
LOCAL_MODEL_PATH=/path/to/your/model.gguf
```

### 2. Start Local Model Server

**llama.cpp (CMake-built):**
```bash
~/llama.cpp/build/llama-server -m model.gguf -c 2048 --port 8081 --host localhost
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
3. Status should show "✓ llama-server (Local AI) connected"
4. Start chatting with your local model

## Troubleshooting

**"llama-server not configured"** → Check environment variables
**"Connection failed"** → Ensure llama-server is running on correct port
**"Timeout"** → Model might be slow, wait or restart server

## Server Compatibility

- ✅ llama.cpp server (CMake-built binary)
- ✅ Any server with `/v1/chat/completions` endpoint