import unittest

from local_ai import ValidationError, parse_json_bytes, redact_for_logs, validate_chat_request, validate_messages

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

    def test_validate_messages_valid_roles(self) -> None:
        """Test that all valid OpenAI role values are accepted."""
        valid_roles = ["system", "user", "assistant", "function", "tool"]
        for role in valid_roles:
            messages = [{"role": role, "content": "test message"}]
            result = validate_messages(messages)
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]["role"], role)
            self.assertEqual(result[0]["content"], "test message")

    def test_validate_messages_invalid_role(self) -> None:
        """Test that invalid role values are rejected."""
        invalid_messages = [{"role": "invalid_role", "content": "test"}]
        with self.assertRaises(ValidationError) as cm:
            validate_messages(invalid_messages)
        self.assertIn("must be one of", str(cm.exception))
        self.assertIn("invalid_role", str(cm.exception))

    def test_validate_messages_empty_role(self) -> None:
        """Test that empty role strings are rejected."""
        invalid_messages = [{"role": "", "content": "test"}]
        with self.assertRaises(ValidationError) as cm:
            validate_messages(invalid_messages)
        self.assertIn("must be a non-empty string", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
