# Security Policy

## Supported Versions

Currently supported versions for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Threat Model

Overmind is designed as a **self-hosted, trusted-environment** application. The threat model assumes:

### In Scope

- **Malicious external actors** trying to access the system
- **Accidental exposure** of sensitive data
- **Man-in-the-middle attacks** on network communication
- **Brute force attacks** on authentication
- **Injection attacks** (XSS, SQL, etc.)
- **CSRF attacks** from malicious websites

### Out of Scope

- **Physical access** to the server
- **Compromised user devices** (keyloggers, malware)
- **Social engineering** attacks
- **Insider threats** from trusted users
- **Zero-day exploits** in Node.js or dependencies

### Trust Boundaries

1. **Localhost**: Fully trusted (admin endpoints)
2. **Local Network**: Trusted (file browser, cameras)
3. **Internet**: Untrusted (all external access)

## Security Features

### Authentication & Authorization

#### Password Security

**Implementation**: PBKDF2 with SHA-512
- **Iterations**: 100,000
- **Salt**: 16 bytes (random per password)
- **Output**: 64 bytes
- **Storage**: `salt:hash` format

**Rationale**:
- PBKDF2 is NIST-approved and widely supported
- 100k iterations provides adequate protection against brute force
- Node.js crypto module (no external dependencies)
- Future: Migrate to Argon2 when available

**Recommendations**:
- Minimum 8 characters (enforced)
- Recommend: 12+ characters with mixed case, numbers, symbols
- No password complexity requirements (prefer length)

#### Session Management

**Token Generation**:
```javascript
crypto.randomBytes(32).toString('hex')  // 64-character hex
```

**Storage**: JSON file (`data/sessions.json`)

**Properties**:
- **httpOnly**: Yes (no JavaScript access)
- **Secure**: Yes (production HTTPS)
- **SameSite**: Lax (CSRF protection)
- **Expiration**: 7 days
- **Max-Age**: 604800 seconds

**Session Validation**:
1. Token must exist in storage
2. Must not be expired
3. User must still exist
4. Automatic cleanup of expired sessions

#### Authorization

**Friend-based Access Control**:
- Chat requires friendship
- Friend requests by email only
- No public messaging
- Users control their friend list

### Rate Limiting

All endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Chat messages | 30 messages | 1 minute |
| File uploads | 10 uploads | 1 minute |
| General API | 60 requests | 1 minute |
| Public endpoints | 120 requests | 1 minute |

**Implementation**: In-memory per-IP tracking
- Automatic cleanup of old entries
- Returns 429 with Retry-After header
- Rate limit headers on all responses

### Input Validation

#### Email Validation
```javascript
function isValidEmail(email) {
    return email.includes('@') && email.length > 3;
}
```

#### URL Validation
```javascript
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}
```

#### Content Length
- Passwords: 8-256 characters
- Messages: 1-10,000 characters
- Display names: 1-100 characters
- File uploads: 100MB max (configurable)

#### Sanitization
- **User input**: Type checking, length limits
- **File paths**: Path traversal prevention
- **Database queries**: N/A (JSON storage, no SQL injection risk)

### Network Security

#### CORS Configuration

```javascript
app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
}));
```

**Production**: Set `CORS_ORIGIN` to specific domain
**Development**: Allows all origins

#### HTTPS

**Recommendation**: Always use HTTPS in production

**Setup with nginx**:
```nginx
server {
    listen 443 ssl http2;
    server_name overmind.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

#### WebSocket Security

**Authentication**: Required on connection
```javascript
ws://localhost:3000/ws/chat?token=SESSION_TOKEN
```

**Validation**:
1. Token extracted from query or header
2. Session verified
3. User attached to connection
4. Invalid tokens rejected with code 4001

**Heartbeat**: 30-second ping/pong to detect dead connections

### Audit Logging

All security-relevant events are logged:

```json
{
  "id": "uuid",
  "userId": "user-id or null",
  "action": "login|logout|register|send_message|etc",
  "resource": "session|user|message|etc",
  "details": {},
  "ipAddress": "1.2.3.4",
  "userAgent": "Mozilla/...",
  "timestamp": "2024-12-18T10:00:00.000Z"
}
```

**Logged Events**:
- Registration
- Login (success and failure)
- Logout
- Password changes
- Profile updates
- Friend requests
- Message sending
- Admin actions

**Storage**: `data/audit_logs.json` (last 10,000 entries)

**Access**: Localhost admin endpoints only

### Admin Endpoint Protection

```javascript
function isLocalhost(req) {
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || 
           ip === '::1' || 
           ip === '::ffff:127.0.0.1';
}
```

**Protected Endpoints**:
- `GET /api/admin/metrics` - System metrics
- `GET /api/admin/uploads` - Upload statistics
- `POST /api/admin/cleanup` - Manual cleanup
- `GET /api/admin/audit` - Audit logs (future)

**Protection**: 403 Forbidden for non-localhost requests

### Data Storage Security

#### File Permissions

Recommended permissions:
```bash
chmod 700 data/                    # Owner only
chmod 600 data/*.json             # Owner read/write only
chmod 600 .env                    # Owner read/write only
chmod 755 public/                 # Public directory
chmod 644 public/**/*             # Public files
```

#### Sensitive Data

**Never stored in plain text**:
- ✓ Passwords (hashed with PBKDF2)
- ✓ Session tokens (random, not derived from user data)

**Currently stored in plain text** (future encryption):
- ✗ Chat messages (encryption planned)
- ✗ Email addresses (hashed index planned)
- ✗ User profile data

**Never stored**:
- Credit card numbers (no payment processing)
- Government IDs
- Health information

#### Backup Security

**Recommendations**:
1. Encrypt backups of `data/` directory
2. Store backups securely (not in web root)
3. Regular backup schedule
4. Test restore procedures
5. Secure deletion of old backups

```bash
# Example encrypted backup
tar czf - data/ | openssl enc -aes-256-cbc -salt -out backup-$(date +%Y%m%d).tar.gz.enc
```

### Dependency Security

#### Minimal Dependencies

**Core**:
- express (4.21.0) - Web framework
- ws (8.18.0) - WebSocket server
- cookie-parser (1.4.6) - Cookie parsing
- cors (2.8.5) - CORS middleware
- multer (2.0.2) - File uploads
- uuid (10.0.0) - ID generation

**No authentication/crypto dependencies**:
- Using Node.js built-in `crypto` module
- PBKDF2 is part of Node.js
- No bcrypt, argon2, or similar dependencies

#### Update Policy

1. **Security updates**: Applied immediately
2. **Minor updates**: Monthly review
3. **Major updates**: Quarterly review
4. **Automated scanning**: Dependabot enabled

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix
```

## Security Recommendations

### Deployment

#### Production Checklist

- [ ] **Change SECRET_KEY** in `.env` to a random value
- [ ] **Enable HTTPS** with valid certificate
- [ ] **Set CORS_ORIGIN** to your domain
- [ ] **Set NODE_ENV=production**
- [ ] **Configure firewall** (ufw, iptables)
- [ ] **Restrict admin endpoints** (nginx, firewall)
- [ ] **Regular backups** of data/ directory
- [ ] **Monitor audit logs** regularly
- [ ] **Keep dependencies updated** (`npm audit`)
- [ ] **Set proper file permissions** (700 for data/)
- [ ] **Disable unused features** (cameras if not needed)
- [ ] **Use strong passwords** for all accounts
- [ ] **Enable OS security updates**

#### Network Configuration

**Firewall rules** (ufw example):
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

**Reverse proxy** (nginx):
- Terminates SSL/TLS
- Rate limiting (in addition to app-level)
- IP whitelisting for admin endpoints
- Request size limits
- Header security

#### Monitoring

**Watch for**:
- Failed login attempts
- Unusual API request patterns
- Disk space usage
- Memory usage
- Error rates

**Tools**:
- `journalctl -u overmind -f` - Service logs
- `sudo lsof -i :3000` - Check connections
- `htop` - Process monitoring
- `python3 palvelin.py` - Built-in TUI

### Development

#### Secure Coding Practices

1. **Input Validation**:
   - Validate on server (never trust client)
   - Type check all inputs
   - Enforce length limits
   - Whitelist, not blacklist

2. **Error Handling**:
   - Never expose stack traces to users
   - Log errors server-side
   - Generic error messages to clients
   - Specific error codes internally

3. **Secret Management**:
   - Use environment variables
   - Never commit secrets to git
   - Rotate secrets regularly
   - Use different secrets per environment

4. **Code Review**:
   - All changes reviewed
   - Security-focused reviews for auth/crypto
   - Automated scanning (npm audit)
   - Manual security testing

## Encryption (Planned - Phase 4)

### Future Implementation

**Chat Message Encryption**:
1. **Library**: libsodium (sodium-native or sodium-plus)
2. **Algorithm**: XSalsa20-Poly1305 (authenticated encryption)
3. **Key Derivation**: Argon2id from user password + server salt
4. **Storage**: Encrypted messages with nonce and version tag
5. **Client-side**: Decryption in browser memory only

**Threat Model**:
- Protects against: Database breach, storage compromise
- Does not protect against: Compromised server, keyloggers, server-side attacks
- Requires: User to enter password/key each session

**Implementation Priority**: Phase 4

## Vulnerability Disclosure

### Reporting a Vulnerability

**DO**:
- Email security concerns to the repository maintainer
- Include detailed description
- Provide steps to reproduce
- Allow reasonable time for fix (90 days)

**DON'T**:
- Publicly disclose before fix
- Test on production systems without permission
- Attempt to exploit vulnerabilities

### Response Timeline

1. **Initial Response**: Within 48 hours
2. **Triage**: Within 7 days
3. **Fix Development**: Depends on severity
4. **Patch Release**: As soon as fix is ready
5. **Public Disclosure**: After patch is available

### Severity Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Remote code execution, authentication bypass | 24-48 hours |
| High | Privilege escalation, data leakage | 1-2 weeks |
| Medium | DOS, CSRF, XSS | 2-4 weeks |
| Low | Information disclosure, rate limit bypass | 1-3 months |

## Security Updates

### Notification Channels

- GitHub Security Advisories
- CHANGELOG.md
- README.md
- Git tags and releases

### Update Process

1. Security fix committed to private branch
2. Version bumped (patch for security)
3. CHANGELOG updated with CVE if applicable
4. Release created with security notes
5. Users notified via GitHub

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [WebSocket Security](https://devcenter.heroku.com/articles/websocket-security)

## License

This security policy is part of the Overmind project and is released under the MIT License.

---

**Last Updated**: 2024-12-18
**Version**: 1.0.0
