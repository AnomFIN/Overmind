#!/usr/bin/env python3
"""
Why this design:
- Minimal HTTP proxy and stdin mode keep Node integration flexible without new deps.
- Structured logging and validation reduce ambiguity and keep secrets out of logs.
- Retry + timeout handles slow local models while staying predictable.
- Pure helpers make behavior testable and stable.
"""

# AnomFIN — the neural network of innovation.

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_LM_STUDIO_BASE = "http://localhost:1234"
DEFAULT_LISTEN_HOST = "127.0.0.1"
DEFAULT_LISTEN_PORT = 8081
DEFAULT_TIMEOUT_S = 30
DEFAULT_RETRIES = 2

# Valid role values according to OpenAI Chat Completions API
VALID_ROLES = frozenset(["system", "user", "assistant", "function", "tool"])
# Retry backoff configuration
BACKOFF_BASE_SECONDS = 0.4  # Base delay for exponential backoff
BACKOFF_JITTER_MIN = 0.05  # Minimum jitter to add
BACKOFF_JITTER_MAX = 0.2  # Maximum jitter to add

# Validation limits
MAX_TOKENS_LIMIT = 8192  # Maximum allowed max_tokens value
TEMPERATURE_MIN = 0.0  # Minimum temperature
TEMPERATURE_MAX = 2.0  # Maximum temperature per OpenAI spec


@dataclass(frozen=True)
class ProxyConfig:
    listen_host: str
    listen_port: int
    lm_studio_base: str
    timeout_s: int
    retries: int
    api_key: Optional[str]


class ValidationError(ValueError):
    """Input validation error."""


def log_json(level: str, event: str, **fields: Any) -> None:
    safe_fields = {k: v for k, v in fields.items() if v is not None}
    payload = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "level": level,
        "event": event,
        **safe_fields,
    }
    sys.stderr.write(json.dumps(payload, ensure_ascii=False) + "\n")


def parse_json_bytes(raw: bytes) -> Dict[str, Any]:
    if not raw:
        raise ValidationError("Empty request body")
    try:
        data = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValidationError(f"Invalid JSON: {exc.msg}") from exc
    if not isinstance(data, dict):
        raise ValidationError("JSON root must be an object")
    return data


def validate_messages(messages: Any) -> List[Dict[str, str]]:
    if not isinstance(messages, list) or not messages:
        raise ValidationError("messages must be a non-empty array")
    normalized: List[Dict[str, str]] = []
    for idx, message in enumerate(messages):
        if not isinstance(message, dict):
            raise ValidationError(f"messages[{idx}] must be an object")
        role = message.get("role")
        content = message.get("content")
        if not isinstance(role, str) or not role:
            raise ValidationError(f"messages[{idx}].role must be a non-empty string")
        if role not in VALID_ROLES:
            raise ValidationError(
                f"messages[{idx}].role must be one of {sorted(VALID_ROLES)}, got '{role}'"
            )
        if not isinstance(content, str) or not content:
            raise ValidationError(f"messages[{idx}].content must be a non-empty string")
        normalized.append({"role": role, "content": content})
    return normalized


def validate_chat_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    messages = validate_messages(payload.get("messages"))
    model = payload.get("model")
    if model is not None and not isinstance(model, str):
        raise ValidationError("model must be a string")

    max_tokens = payload.get("max_tokens")
    if max_tokens is not None and (
        not isinstance(max_tokens, int) or max_tokens <= 0 or max_tokens > MAX_TOKENS_LIMIT
    ):
        raise ValidationError(f"max_tokens must be a positive integer <= {MAX_TOKENS_LIMIT}")

    temperature = payload.get("temperature")
    if temperature is not None and (
        not isinstance(temperature, (int, float))
        or not (TEMPERATURE_MIN <= temperature <= TEMPERATURE_MAX)
    ):
        raise ValidationError(f"temperature must be between {TEMPERATURE_MIN} and {TEMPERATURE_MAX}")

    top_p = payload.get("top_p")
    if top_p is not None and (not isinstance(top_p, (int, float)) or not 0 <= top_p <= 1):
        raise ValidationError("top_p must be between 0 and 1")

    stream = payload.get("stream")
    if stream is not None and not isinstance(stream, bool):
        raise ValidationError("stream must be a boolean")

    return {
        "model": model or "local-model",
        "messages": messages,
        "max_tokens": max_tokens or 512,
        "temperature": temperature if temperature is not None else 0.7,
        "top_p": top_p if top_p is not None else 1,
        "stream": stream if stream is not None else False,
    }


def redact_for_logs(payload: Dict[str, Any]) -> Dict[str, Any]:
    messages = payload.get("messages", [])
    redacted_messages = [
        {"role": msg.get("role", ""), "content_length": len(msg.get("content", ""))}
        for msg in messages
        if isinstance(msg, dict)
    ]
    return {
        "model": payload.get("model"),
        "messages": redacted_messages,
        "max_tokens": payload.get("max_tokens"),
        "temperature": payload.get("temperature"),
        "top_p": payload.get("top_p"),
        "stream": payload.get("stream"),
    }


def build_request(config: ProxyConfig, payload: Dict[str, Any]) -> Request:
    target_url = f"{config.lm_studio_base.rstrip('/')}/v1/chat/completions"
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if config.api_key:
        headers["Authorization"] = f"Bearer {config.api_key}"
    return Request(target_url, data=body, headers=headers, method="POST")


def retry_backoff(attempt: int) -> None:
    """Sleep for exponential backoff with jitter."""
    sleep_for = BACKOFF_BASE_SECONDS * (2**attempt) + random.uniform(
        BACKOFF_JITTER_MIN, BACKOFF_JITTER_MAX
    )
    time.sleep(sleep_for)


def call_lm_studio(config: ProxyConfig, payload: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    last_error: Optional[str] = None

    for attempt in range(config.retries + 1):
        # Recreate request for each attempt to avoid urllib Request reuse issues
        request = build_request(config, payload)
        try:
            with urlopen(request, timeout=config.timeout_s) as response:
                status = response.getcode()
                raw = response.read()
                data = parse_json_bytes(raw)
                return status, data
        except ValidationError as exc:
            # LM Studio returned non-JSON or invalid JSON; treat as backend error.
            last_error = f"Invalid response from LM Studio: {exc}"
            if attempt >= config.retries:
                break
            retry_backoff(attempt)
        except HTTPError as exc:
            # Distinguish between retryable (5xx) and non-retryable (4xx) HTTP errors.
            last_error = str(exc)
            status = getattr(exc, "code", None)
            # If we have a non-5xx status (e.g., 4xx client error), do not retry.
            if status is not None and not (500 <= int(status) < 600):
                break
            if attempt >= config.retries:
                break
            retry_backoff(attempt)
        except URLError as exc:
            last_error = str(exc)
            if attempt >= config.retries:
                break
            retry_backoff(attempt)

    raise ConnectionError(last_error or "Unknown LM Studio error")


class ProxyHandler(BaseHTTPRequestHandler):
    server_version = "AnomFINLocalAI/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _read_json(self) -> Dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)
        return parse_json_bytes(raw)

    def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(HTTPStatus.OK, {"status": "ok"})
        else:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path != "/v1/chat/completions":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return

        config: ProxyConfig = self.server.config  # type: ignore[attr-defined]
        try:
            incoming = self._read_json()
            validated = validate_chat_request(incoming)
            log_json(
                "info",
                "proxy.request",
                path=self.path,
                client=self.client_address[0],
                payload=redact_for_logs(validated),
            )
            status, data = call_lm_studio(config, validated)
            self._send_json(status, data)
            log_json("info", "proxy.response", status=status)
        except ValidationError as exc:
            log_json("warn", "proxy.validation_error", error=str(exc))
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except ConnectionError as exc:
            log_json("error", "proxy.connection_error", error=str(exc))
            self._send_json(HTTPStatus.BAD_GATEWAY, {"error": str(exc)})


class ProxyServer(HTTPServer):
    def __init__(self, config: ProxyConfig) -> None:
        super().__init__((config.listen_host, config.listen_port), ProxyHandler)
        self.config = config


def handle_stdin(config: ProxyConfig) -> int:
    # Read stdin as bytes with a hard size limit to avoid unbounded memory usage.
    max_bytes = 10 * 1024 * 1024  # 10 MiB
    stdin_buffer = getattr(sys.stdin, "buffer", sys.stdin)
    chunks: List[bytes] = []
    total = 0
    while True:
        chunk = stdin_buffer.read(8192)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            msg = "stdin payload too large"
            log_json("warn", "stdin.too_large", max_bytes=max_bytes)
            sys.stdout.write(json.dumps({"error": msg}) + "\n")
            return 1
        chunks.append(chunk)

    raw = b"".join(chunks)
    try:
        payload = parse_json_bytes(raw)
        validated = validate_chat_request(payload)
    except ValidationError as exc:
        log_json("warn", "stdin.validation_error", error=str(exc))
        sys.stdout.write(json.dumps({"error": str(exc)}) + "\n")
        return 1

    log_json("info", "stdin.request", payload=redact_for_logs(validated))
    try:
        status, response = call_lm_studio(config, validated)
    except ConnectionError as exc:
        log_json("error", "stdin.connection_error", error=str(exc))
        sys.stdout.write(json.dumps({"error": str(exc)}) + "\n")
        return 2

    sys.stdout.write(json.dumps({"status": status, "data": response}, ensure_ascii=False) + "\n")
    return 0


def build_config(args: argparse.Namespace) -> ProxyConfig:
    return ProxyConfig(
        listen_host=args.listen_host,
        listen_port=args.listen_port,
        lm_studio_base=args.lm_studio_base,
        timeout_s=args.timeout,
        retries=args.retries,
        api_key=args.api_key,
    )


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local AI bridge for LM Studio")
    parser.add_argument("--listen-host", default=os.getenv("LOCAL_AI_LISTEN_HOST") or DEFAULT_LISTEN_HOST)
    
    # Handle port with proper error checking for empty/invalid env vars
    port_env = os.getenv("LOCAL_AI_LISTEN_PORT")
    default_port = DEFAULT_LISTEN_PORT
    if port_env and port_env.strip():
        try:
            default_port = int(port_env)
        except ValueError:
            parser.error(f"LOCAL_AI_LISTEN_PORT must be an integer, got: {port_env}")
    parser.add_argument("--listen-port", type=int, default=default_port)
    
    parser.add_argument(
        "--lm-studio-base",
        default=os.getenv("LM_STUDIO_BASE_URL") or DEFAULT_LM_STUDIO_BASE,
    )
    
    # Handle timeout with proper error checking for empty/invalid env vars
    timeout_env = os.getenv("LOCAL_AI_TIMEOUT")
    default_timeout = DEFAULT_TIMEOUT_S
    if timeout_env and timeout_env.strip():
        try:
            default_timeout = int(timeout_env)
        except ValueError:
            parser.error(f"LOCAL_AI_TIMEOUT must be an integer, got: {timeout_env}")
    parser.add_argument("--timeout", type=int, default=default_timeout)
    
    # Handle retries with proper error checking for empty/invalid env vars
    retries_env = os.getenv("LOCAL_AI_RETRIES")
    default_retries = DEFAULT_RETRIES
    if retries_env and retries_env.strip():
        try:
            default_retries = int(retries_env)
        except ValueError:
            parser.error(f"LOCAL_AI_RETRIES must be an integer, got: {retries_env}")
    parser.add_argument("--retries", type=int, default=default_retries)
    
    parser.add_argument("--api-key", default=os.getenv("LOCAL_AI_API_KEY"))
    parser.add_argument("--stdin", action="store_true", help="Read JSON from stdin and exit")
    return parser.parse_args(argv)


def main() -> int:
    args = parse_args()
    config = build_config(args)

    if args.stdin:
        return handle_stdin(config)

    server = ProxyServer(config)
    log_json("info", "server.start")
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        log_json("info", "server.shutdown")
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
