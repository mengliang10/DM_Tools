from backend.services import security


def test_roundtrip():
    enc = security.encrypt("sk-secret-123")
    assert enc != "sk-secret-123"
    assert security.decrypt(enc) == "sk-secret-123"


def test_empty_string_passthrough():
    assert security.encrypt("") == ""
    assert security.decrypt("") == ""


def test_decrypt_legacy_plaintext_returns_input():
    # Old data may have been stored unencrypted; decrypt must not crash.
    assert security.decrypt("plain-key") == "plain-key"
