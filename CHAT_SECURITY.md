# Chat Security Documentation

## Overview

The AnomHome Overmind chat system implements end-to-end encryption (E2E) to ensure that only the intended recipients can read messages. This document explains the security architecture, encryption mechanisms, and best practices.

## Security Architecture

### End-to-End Encryption

All messages and files shared through the chat system are encrypted on the client-side (in the user's browser) before being sent to the server. The server only stores encrypted data and cannot read message contents.

**Key Principles:**
- **Zero-Knowledge Server**: The server never has access to unencrypted message content (but does store encrypted private key backups and all metadata)
- **Client-Side Encryption**: All encryption/decryption happens in the browser
- **Per-Message Unique Keys**: Each message uses a freshly generated AES encryption key
- **Secure Key Storage**: Private keys are stored in browser IndexedDB

> **Note**: Because the RSA key pair is long-lived and used to encrypt per-message AES keys, this design does **not** provide forward secrecy in the strict cryptographic sense. Compromise of the long-term RSA private key would allow decryption of past messages.

## Encryption Implementation

### Key Generation

When a user first accesses the chat feature, the system generates a 2048-bit RSA key pair:

```javascript
// RSA-OAEP key pair with SHA-256
{
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256'
}
```

**Key Storage:**
- **Public Key**: Stored on the server in plaintext (shareable)
- **Private Key**: Stored in browser IndexedDB (currently unencrypted - TODO: encrypt with user password)
- **Backup**: Encrypted private key backup stored on server (encrypted with session token - should be user password)

### Message Encryption Process

1. **Generate Session Key**: For each message, generate a random 256-bit AES-GCM key
2. **Encrypt Content**: Encrypt the message text with the AES key
3. **Encrypt Session Key**: Encrypt the AES key with recipient's RSA public key
4. **Send to Server**: Send encrypted content + encrypted key + IV
5. **Server Storage**: Server stores the encrypted blob without ability to decrypt

```
Message → [AES-256-GCM] → Encrypted Message
AES Key → [RSA-OAEP with Recipient's Public Key] → Encrypted Key
```

### Message Decryption Process

1. **Receive Encrypted Message**: Client receives encrypted content + encrypted key + IV
2. **Decrypt Session Key**: Use private RSA key to decrypt the AES session key
3. **Decrypt Content**: Use AES key to decrypt the message content
4. **Display**: Show plaintext message to user

### File Encryption

Files are encrypted using the same principle:

1. **Generate File Key**: Random 256-bit AES-GCM key for each file
2. **Encrypt File**: Encrypt file data with AES key
3. **Store Key**: Encrypted AES key stored with file metadata
4. **Upload**: Server stores encrypted file blob

**File Size Limits:**
- Maximum file size: 10 MB (encoded)
- Files are Base64-encoded for transmission
- Encryption adds approximately 30% overhead

## Security Features

### 1. Typing Indicators

Typing indicators are sent in real-time but do NOT reveal message content:
- Only indicates "User is typing..."
- Automatically clears after 10 seconds of inactivity
- No message preview is sent

### 2. Read Receipts

Read receipts confirm message delivery without compromising encryption:
- Stored as timestamps on the server
- Double checkmark (✓✓) indicates message was read
- Blue checkmark indicates read receipt

### 3. Message Deletion

Two deletion modes:
- **Delete for Me**: Message hidden only for the deleting user
- **Delete for Everyone**: Message deleted for all participants (sender only)

Deleted messages cannot be recovered.

### 4. WebSocket Security

Real-time updates use authenticated WebSocket connections:
- Session token required for connection
- All WebSocket messages are authenticated
- Automatic reconnection with exponential backoff

## Threat Model

### What We Protect Against

✅ **Server Compromise**: Even if server is compromised, messages remain encrypted
✅ **Network Eavesdropping**: All traffic is encrypted (HTTPS + E2E)
✅ **Unauthorized Access**: Only intended recipients can decrypt messages
✅ **Message Tampering**: AES-GCM provides authenticated encryption

### What We Don't Protect Against

❌ **Compromised Client Device**: If user's device is compromised, keys can be stolen
❌ **Malicious Browser Extensions**: Extensions with page access can intercept keys
❌ **Physical Device Access**: Unlocked devices can access messages
❌ **Social Engineering**: Users can be tricked into sharing sensitive info
❌ **Metadata Analysis**: Server can see who talks to whom and when

## Best Practices

### For Users

1. **Keep Device Secure**: Use strong device passwords and lock screens
2. **Use HTTPS**: Always access chat over HTTPS (never HTTP)
3. **Log Out**: Log out when using shared computers
4. **Verify Recipients**: Ensure you're chatting with the correct person
5. **Avoid Public Computers**: Don't access sensitive chats on public devices

### For Administrators

1. **Enable HTTPS**: Always use HTTPS in production
2. **Update Regularly**: Keep server software up to date
3. **Monitor Logs**: Watch for suspicious authentication attempts
4. **Backup Strategy**: Regular backups of encrypted data
5. **Rate Limiting**: Prevent brute-force attacks on authentication

## Security Considerations

### Key Recovery

**Important**: If a user loses their encryption keys (e.g., clears browser data), they cannot decrypt old messages. Future implementation may include:
- Key backup to server (encrypted with password)
- Recovery codes
- Multi-device key synchronization

### Group Chats (Future)

The current implementation supports one-on-one chats. Group chat encryption requires additional considerations:
- Sender keys protocol
- Group key distribution
- Member addition/removal

## Encryption Standards

The implementation uses well-established cryptographic standards:

- **RSA-OAEP**: RSA with Optimal Asymmetric Encryption Padding
- **AES-256-GCM**: Advanced Encryption Standard with Galois/Counter Mode
- **PBKDF2**: Password-Based Key Derivation Function 2
- **SHA-256**: Secure Hash Algorithm 256-bit

All cryptographic operations use the Web Crypto API, which provides:
- Native browser implementations
- Hardware acceleration where available
- Audited cryptographic primitives

## Comparison with Other Systems

| Feature | Overmind Chat | WhatsApp | Signal | Telegram |
|---------|---------------|----------|--------|----------|
| End-to-End Encryption | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Optional |
| Open Source | ✅ Yes | ❌ No | ✅ Yes | ⚠️ Partial |
| Self-Hosted | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Zero-Knowledge Server | ⚠️ Partial* | ✅ Yes | ✅ Yes | ⚠️ Optional |
| File Encryption | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Optional |
| Metadata Protection | ❌ No | ❌ No | ⚠️ Sealed Sender | ⚠️ Limited |

\* Server stores encrypted private key backups and has access to all metadata (who talks to whom, when).

## Limitations

### Current Limitations

1. **No Perfect Forward Secrecy**: Current implementation doesn't rotate keys per message chain
2. **No Key Verification**: Users cannot verify recipient public keys (future: fingerprints)
3. **Metadata Visible**: Server can see who chats with whom and when
4. **Single Device**: Keys not synchronized across devices
5. **No Disappearing Messages**: Messages don't auto-delete after time period

### Future Improvements

- Implement Signal Protocol's Double Ratchet Algorithm
- Add key fingerprint verification
- Multi-device key synchronization
- Disappearing messages
- Metadata protection with onion routing
- Post-quantum cryptography (future-proofing)

## Compliance

### Data Protection

- **GDPR**: Users have right to delete their data
- **Data Minimization**: Server only stores encrypted data
- **User Control**: Users control their encryption keys
- **No Third Parties**: No data shared with external services

### Audit Trail

- All message events logged (send, receive, delete)
- Audit logs do NOT contain message content
- Logs include: timestamp, user ID, action type
- Admin access to logs (metadata only)

## Security Reporting

If you discover a security vulnerability, please report it responsibly:

1. **Do Not** disclose publicly until we've addressed it
2. Email security details to the repository maintainer
3. Provide steps to reproduce the vulnerability
4. Allow reasonable time for fix (typically 90 days)

## References

- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [Signal Protocol Documentation](https://signal.org/docs/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## Disclaimer

While we implement strong encryption, no system is 100% secure. Users should:
- Understand the limitations described above
- Assess their own risk tolerance
- Use additional security measures as appropriate
- Report any security concerns immediately

**This system provides encryption in transit and at rest, but cannot protect against compromised endpoints or malicious actors with physical device access.**

---

Last Updated: December 2024
Version: 1.0
