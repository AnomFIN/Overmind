import unittest

from local_ai import ValidationError, parse_json_bytes, redact_for_logs, validate_chat_request

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


if __name__ == "__main__":
    unittest.main()
