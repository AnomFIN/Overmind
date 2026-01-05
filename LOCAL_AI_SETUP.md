# Overmind Local AI Setup Guide

This guide helps you configure Overmind to work with a locally built llama-server (CMake-compiled binary).

## Overview

Overmind uses **llama-server** - a local CMake-built binary for AI inference that runs completely offline on your Linux machine.

## Prerequisites

- Linux environment
- CMake and C++ compiler (gcc/clang)
- Git

## Step 1: Build llama.cpp with CMake

```bash
# Clone llama.cpp repository
cd ~
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Create out-of-source build directory
mkdir build && cd build

# Configure with CMake
cmake ..

# Build (this creates the llama-server binary)
cmake --build . --config Release

# Verify the binary was created
ls -la llama-server
```

The binary will be located at: `~/llama.cpp/build/llama-server`

## Step 2: Download a GGUF Model

Download a GGUF model from Hugging Face or other sources. Examples:

```bash
# Example: Download a small model for testing
cd ~
wget https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf

# Or use a larger model like Llama
# wget https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
```

## Step 3: Start llama-server

```bash
# Basic command to start llama-server
~/llama.cpp/build/llama-server \
  -m ~/Phi-3-mini-4k-instruct-q4.gguf \
  --port 8081 \
  --host localhost \
  --ctx-size 4096

# For GPU acceleration (if available):
~/llama.cpp/build/llama-server \
  -m ~/Phi-3-mini-4k-instruct-q4.gguf \
  --port 8081 \
  --host localhost \
  --ctx-size 4096 \
  --n-gpu-layers 32
```

Keep this terminal running - llama-server needs to stay active.

## Step 4: Configure Overmind

1. **Create .env file**:
   ```bash
   cd /path/to/Overmind
   cp .env.example .env
   ```

2. **Edit .env file**:
   ```bash
   nano .env
   ```
   
   Set this value:
   ```env
   LOCAL_SERVER_PORT=8081
   ```

## Step 5: Test the Connection

```bash
# Test llama-server directly
node test-llama-server.js 8081

# You should see a successful JSON response
```

## Step 6: Start Overmind

```bash
npm start
```

Visit `http://localhost:3000` and navigate to the AI Chat panel. You should see:
- Status: "✓ llama-server (Local AI) connected"

## Troubleshooting

### "llama-server connection failed"
- Check if llama-server is running: `ps aux | grep llama-server`
- Verify the port: `netstat -tlnp | grep 8081`
- Check llama-server logs for errors

### "Invalid JSON from llama-server" 
- Run the test script to see the actual response format
- Check llama-server version compatibility

### "Empty response from llama-server"
- Model might be too large for available RAM
- Try a smaller model or reduce context size
- Check llama-server error logs

### Performance Issues
- Use GPU acceleration if available (`--n-gpu-layers 32`)
- Adjust context size (`--ctx-size 2048`)
- Use quantized models (Q4, Q5, Q8)

## Advanced Configuration

### Custom llama-server Arguments

Add to your startup script:
```bash
#!/bin/bash
~/llama.cpp/build/llama-server \
  -m ~/your-model.gguf \
  --port 8081 \
  --host localhost \
  --ctx-size 4096 \
  --n-gpu-layers 32 \
  --threads 8 \
  --batch-size 512 \
  --temp 0.7 \
  --top-p 0.9
```

### Multiple Models

To switch models, stop llama-server and restart with a different `-m` parameter.

### Docker Setup (Optional)

```dockerfile
FROM ubuntu:22.04
RUN apt update && apt install -y cmake build-essential git
RUN git clone https://github.com/ggerganov/llama.cpp.git /llama.cpp
WORKDIR /llama.cpp
RUN mkdir build && cd build && cmake .. && cmake --build . --config Release
COPY your-model.gguf /model.gguf
EXPOSE 8081
CMD ["./build/llama-server", "-m", "/model.gguf", "--port", "8081", "--host", "0.0.0.0"]
```

## Model Recommendations

### For Testing (2-4 GB RAM)
- `microsoft/Phi-3-mini-4k-instruct-gguf` (Q4 quantized)
- `Qwen/Qwen2-0.5B-Instruct-GGUF`

### For Production (8-16 GB RAM)
- `meta-llama/Meta-Llama-3.1-8B-Instruct` (Q4/Q5 quantized)
- `microsoft/Phi-3-medium-4k-instruct-gguf`

### For High Performance (32+ GB RAM)
- `meta-llama/Meta-Llama-3.1-70B-Instruct` (Q4 quantized)
- Use multiple GPU layers for acceleration

## Security Notes

- llama-server runs locally and doesn't send data to external servers
- Keep the server bound to localhost (`--host localhost`) for security
- Use firewall rules if exposing on LAN
- Models and conversations stay on your machine

## Support

- Check llama.cpp documentation: https://github.com/ggerganov/llama.cpp
- Overmind GitHub issues: Report JSON parsing or integration issues
- Test script: Use `node test-llama-server.js` to debug connection issues