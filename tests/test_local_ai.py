import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
import io
import os

from local_ai import (
    ValidationError,
    parse_json_bytes,
    redact_for_logs,
    validate_chat_request,
    build_request,
    call_lm_studio,
    handle_stdin,
    parse_args,
    ProxyConfig,
    MAX_TOKENS_LIMIT,
)

# Less noise. More signal. AnomFIN.


class TestLocalAI(unittest.TestCase):
    def test_validate_chat_request_defaults(self) -> None:
        payload = {
            "messages": [
                {"role": "user", "content": "Hello"},
            ]
        }
        result = validate_chat_request(payload)
        self.assertEqual(result["model"], "local-model")
        self.assertEqual(result["max_tokens"], 512)
        self.assertEqual(result["temperature"], 0.7)
        self.assertFalse(result["stream"])
        self.assertEqual(result["messages"][0]["content"], "Hello")

    def test_validate_chat_request_rejects_bad_messages(self) -> None:
        with self.assertRaises(ValidationError):
            validate_chat_request({"messages": []})

    def test_redact_for_logs(self) -> None:
        payload = {
            "model": "local-model",
            "messages": [
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hello"},
            ],
            "max_tokens": 5,
            "temperature": 0.5,
            "top_p": 1,
            "stream": False,
        }
        redacted = redact_for_logs(payload)
        self.assertEqual(redacted["messages"][0]["content_length"], 2)
        self.assertNotIn("content", redacted["messages"][0])

    def test_parse_json_bytes_empty(self) -> None:
        with self.assertRaises(ValidationError):
            parse_json_bytes(b"")

    def test_validate_messages_role_validation(self) -> None:
        """Test that only valid roles are accepted."""
        # Valid role should work
        valid_payload = {"messages": [{"role": "user", "content": "test"}]}
        result = validate_chat_request(valid_payload)
        self.assertEqual(result["messages"][0]["role"], "user")
        
        # Invalid role should fail
        invalid_payload = {"messages": [{"role": "invalid_role", "content": "test"}]}
        with self.assertRaises(ValidationError) as ctx:
            validate_chat_request(invalid_payload)
        self.assertIn("must be one of", str(ctx.exception))

    def test_validate_chat_request_temperature_bounds(self) -> None:
        """Test that temperature is validated between 0 and 2."""
        base = {"messages": [{"role": "user", "content": "test"}]}
        
        # Valid temperatures
        for temp in [0, 0.5, 1.0, 1.5, 2.0]:
            payload = {**base, "temperature": temp}
            result = validate_chat_request(payload)
            self.assertEqual(result["temperature"], temp)
        
        # Invalid temperatures
        for temp in [-0.1, 2.1, 3.0]:
            payload = {**base, "temperature": temp}
            with self.assertRaises(ValidationError) as ctx:
                validate_chat_request(payload)
            self.assertIn("between", str(ctx.exception))

    def test_validate_chat_request_max_tokens_bounds(self) -> None:
        """Test that max_tokens is validated with upper bound."""
        base = {"messages": [{"role": "user", "content": "test"}]}
        
        # Valid max_tokens
        for tokens in [1, 100, 512, MAX_TOKENS_LIMIT]:
            payload = {**base, "max_tokens": tokens}
            result = validate_chat_request(payload)
            self.assertEqual(result["max_tokens"], tokens)
        
        # Invalid max_tokens
        for tokens in [0, -1, MAX_TOKENS_LIMIT + 1]:
            payload = {**base, "max_tokens": tokens}
            with self.assertRaises(ValidationError) as ctx:
                validate_chat_request(payload)
            self.assertIn("max_tokens", str(ctx.exception))

    def test_build_request(self) -> None:
        """Test that build_request creates proper Request object."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key="test-key",
        )
        payload = {"model": "test", "messages": []}
        
        request = build_request(config, payload)
        
        self.assertEqual(request.full_url, "http://localhost:1234/v1/chat/completions")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Content-type"), "application/json")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-key")

    @patch("local_ai.urlopen")
    @patch("local_ai.time.sleep")
    def test_call_lm_studio_no_retry_on_4xx(self, mock_sleep: MagicMock, mock_urlopen: MagicMock) -> None:
        """Test that 4xx errors do not trigger retries."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=3,
            api_key=None,
        )
        payload = {"model": "test", "messages": []}
        
        # Simulate 400 Bad Request
        http_error = HTTPError("http://test", 400, "Bad Request", {}, None)
        mock_urlopen.side_effect = http_error
        
        with self.assertRaises(ConnectionError):
            call_lm_studio(config, payload)
        
        # Should only try once (no retries for 4xx)
        self.assertEqual(mock_urlopen.call_count, 1)
        mock_sleep.assert_not_called()

    @patch("local_ai.urlopen")
    @patch("local_ai.time.sleep")
    def test_call_lm_studio_retry_on_5xx(self, mock_sleep: MagicMock, mock_urlopen: MagicMock) -> None:
        """Test that 5xx errors trigger retries."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key=None,
        )
        payload = {"model": "test", "messages": []}
        
        # Simulate 500 Internal Server Error
        http_error = HTTPError("http://test", 500, "Internal Server Error", {}, None)
        mock_urlopen.side_effect = http_error
        
        with self.assertRaises(ConnectionError):
            call_lm_studio(config, payload)
        
        # Should try initial + 2 retries = 3 times
        self.assertEqual(mock_urlopen.call_count, 3)
        self.assertEqual(mock_sleep.call_count, 2)

    @patch("local_ai.urlopen")
    def test_call_lm_studio_success(self, mock_urlopen: MagicMock) -> None:
        """Test successful call to LM Studio."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key=None,
        )
        payload = {"model": "test", "messages": []}
        
        # Mock successful response
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_response.read.return_value = b'{"result": "success"}'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response
        
        status, data = call_lm_studio(config, payload)
        
        self.assertEqual(status, 200)
        self.assertEqual(data, {"result": "success"})
        self.assertEqual(mock_urlopen.call_count, 1)

    @patch("local_ai.urlopen")
    @patch("local_ai.time.sleep")
    def test_call_lm_studio_invalid_json_retries(self, mock_sleep: MagicMock, mock_urlopen: MagicMock) -> None:
        """Test that invalid JSON from LM Studio triggers retries and converts to ConnectionError."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key=None,
        )
        payload = {"model": "test", "messages": []}
        
        # Mock response with invalid JSON
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_response.read.return_value = b'{"truncated'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response
        
        with self.assertRaises(ConnectionError) as ctx:
            call_lm_studio(config, payload)
        
        # Verify it's treated as a backend error
        self.assertIn("Invalid JSON from LM Studio", str(ctx.exception))
        # Should try initial + 2 retries = 3 times
        self.assertEqual(mock_urlopen.call_count, 3)
        self.assertEqual(mock_sleep.call_count, 2)

    @patch("local_ai.urlopen")
    @patch("local_ai.time.sleep")
    def test_call_lm_studio_empty_response_retries(self, mock_sleep: MagicMock, mock_urlopen: MagicMock) -> None:
        """Test that empty response from LM Studio triggers retries and converts to ConnectionError."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key=None,
        )
        payload = {"model": "test", "messages": []}
        
        # Mock empty response
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_response.read.return_value = b''
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response
        
        with self.assertRaises(ConnectionError) as ctx:
            call_lm_studio(config, payload)
        
        # Verify it's treated as a backend error
        self.assertIn("Invalid response from LM Studio", str(ctx.exception))
        # Should try initial + 2 retries = 3 times
        self.assertEqual(mock_urlopen.call_count, 3)
        self.assertEqual(mock_sleep.call_count, 2)

    @patch("sys.stdin")
    @patch("sys.stdout")
    @patch("local_ai.call_lm_studio")
    def test_handle_stdin_success(
        self, mock_call: MagicMock, mock_stdout: MagicMock, mock_stdin: MagicMock
    ) -> None:
        """Test handle_stdin with valid input."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key=None,
        )
        
        # Mock stdin
        input_data = b'{"messages": [{"role": "user", "content": "test"}]}'
        mock_stdin.buffer = io.BytesIO(input_data)
        
        # Mock call_lm_studio
        mock_call.return_value = (200, {"result": "ok"})
        
        # Mock stdout
        output = []
        mock_stdout.write = lambda x: output.append(x)
        
        result = handle_stdin(config)
        
        self.assertEqual(result, 0)
        self.assertEqual(len(output), 1)
        self.assertIn('"status": 200', output[0])
        self.assertIn('"result": "ok"', output[0])
        # Check newline is present
        self.assertTrue(output[0].endswith("\n"))

    @patch("local_ai.urlopen")
    @patch("local_ai.time.sleep")
    def test_call_lm_studio_invalid_json_response(self, mock_sleep: MagicMock, mock_urlopen: MagicMock) -> None:
        """Test that invalid JSON from LM Studio is treated as a backend error and retried."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key=None,
        )
        payload = {"model": "test", "messages": []}

        # Mock response with invalid JSON
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_response.read.return_value = b'not valid json'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response
        
        with self.assertRaises(ConnectionError) as ctx:
            call_lm_studio(config, payload)
        
        # Should treat as backend error and retry
        self.assertIn("Invalid response from LM Studio", str(ctx.exception))
        self.assertEqual(mock_urlopen.call_count, 3)  # initial + 2 retries
        self.assertEqual(mock_sleep.call_count, 2)

    @patch("sys.stdin")
    @patch("sys.stdout")
    def test_handle_stdin_validation_error(self, mock_stdout: MagicMock, mock_stdin: MagicMock) -> None:
        """Test handle_stdin with invalid input."""
        config = ProxyConfig(
            listen_host="127.0.0.1",
            listen_port=8081,
            lm_studio_base="http://localhost:1234",
            timeout_s=30,
            retries=2,
            api_key=None,
        )
        
        # Mock stdin with invalid payload
        input_data = b'{"messages": []}'
        mock_stdin.buffer = io.BytesIO(input_data)
        
        # Mock stdout
        output = []
        mock_stdout.write = lambda x: output.append(x)
        
        result = handle_stdin(config)
        
        self.assertEqual(result, 1)
        self.assertEqual(len(output), 1)
        self.assertIn('"error"', output[0])
        # Check newline is present
        self.assertTrue(output[0].endswith("\n"))

    @patch.dict("os.environ", {"LOCAL_AI_LISTEN_PORT": "30s"})
    def test_parse_args_invalid_port_env(self) -> None:
        """Test that invalid port environment variable raises clear error."""
        with self.assertRaises(SystemExit):
            parse_args([])

    @patch.dict("os.environ", {"LOCAL_AI_TIMEOUT": "30s"})
    def test_parse_args_invalid_timeout_env(self) -> None:
        """Test that invalid timeout environment variable raises clear error."""
        with self.assertRaises(SystemExit):
            parse_args([])

    @patch.dict("os.environ", {"LOCAL_AI_RETRIES": "invalid"})
    def test_parse_args_invalid_retries_env(self) -> None:
        """Test that invalid retries environment variable raises clear error."""
        with self.assertRaises(SystemExit):
            parse_args([])

    @patch.dict("os.environ", {"LOCAL_AI_LISTEN_PORT": "9000", "LOCAL_AI_TIMEOUT": "60", "LOCAL_AI_RETRIES": "5"})
    def test_parse_args_valid_env_vars(self) -> None:
        """Test that valid environment variables are parsed correctly."""
        args = parse_args([])
        self.assertEqual(args.listen_port, 9000)
        self.assertEqual(args.timeout, 60)
        self.assertEqual(args.retries, 5)


if __name__ == "__main__":
    unittest.main()
