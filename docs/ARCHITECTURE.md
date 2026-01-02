# Overmind Architecture

This document describes the architecture and design decisions for Overmind v1.0.0.

## Overview

Overmind is a self-hosted personal dashboard built with a focus on modularity, security, and ease of deployment. It follows a service-oriented architecture with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (PWA)                      │
│  HTML5 + Vanilla JS + Service Worker + WebSocket Client │
└────────────┬────────────────────────────────────────────┘
             │ HTTP/HTTPS + WebSocket
┌────────────▼────────────────────────────────────────────┐
│                   Express HTTP Server                    │
│              (backend/serverIntegrated.js)               │
└────────────┬────────────────────────────────────────────┘
             │
     ┌───────┴───────┬─────────────┬──────────────┐
     │               │             │              │
┌────▼────┐   ┌──────▼──────┐  ┌─▼────────┐  ┌──▼─────────┐
│  Auth   │   │  Friends    │  │  Chat    │  │ WebSocket  │
│ Service │   │  Service    │  │ Service  │  │  Service   │
└────┬────┘   └──────┬──────┘  └─┬────────┘  └──┬─────────┘
     │               │            │              │
     └───────┬───────┴────────────┴──────────────┘
             │
     ┌───────▼────────┐
     │ Storage Adapter│
     │   Interface    │
     └───────┬────────┘
             │
     ┌───────┴────────┐
     │ JSON Storage   │
     │   Adapter      │
     └───────┬────────┘
             │
     ┌───────▼────────┐
     │  data/*.json   │
     └────────────────┘
```

## Backend Architecture

### Directory Structure

```
backend/
├── adapters/           # Storage abstraction layer
│   ├── StorageAdapter.js       # Base interface
│   └── JsonStorageAdapter.js   # JSON file implementation
├── middleware/         # Express middleware
│   ├── auth.js                 # Authentication middleware
│   └── rateLimit.js            # Rate limiting
├── routes/            # API route handlers
│   ├── auth.js                 # Authentication endpoints
│   ├── friends.js              # Friends management
│   ├── chatAuth.js             # Authenticated chat
│   ├── chat.js                 # OpenAI console (legacy)
│   ├── links.js                # Link shortener
│   ├── uploads.js              # File uploads
│   ├── files.js                # File browser
│   ├── cameras.js              # Camera management
│   ├── notes.js                # Mind-map notes
│   ├── recordings.js           # Camera recordings
│   └── admin.js                # Admin endpoints
├── services/          # Business logic
│   ├── AuthService.js          # User authentication
│   ├── FriendsService.js       # Friends management
│   ├── ChatService.js          # Chat operations
│   ├── WebSocketService.js     # Real-time messaging
│   └── motionRecorder/         # Camera motion detection
├── utils/             # Utility functions
│   ├── database.js             # Legacy JSON helpers
│   └── cleanup.js              # File cleanup service
├── serverIntegrated.js # Main server (new)
└── server.js          # Legacy server (backward compat)
```

### Core Components

#### 1. Storage Adapter Layer

**Purpose**: Abstract storage implementation from business logic

```javascript
StorageAdapter (Interface)
    ↓
JsonStorageAdapter (Implementation)
    ↓
File System (data/*.json)
```

**Benefits**:
- Easy to add new storage backends (MySQL, PostgreSQL, etc.)
- Business logic independent of storage
- Consistent API across different storage types
- Easy to test with mock adapters

**Operations**:
- Users: create, read, update, delete
- Sessions: create, read, delete
- Friends: requests, accept, remove, list
- Chat: threads, messages, read receipts
- Mindmaps: nodes, edges, CRUD operations
- Shortlinks: create, resolve, delete
- Uploads: metadata tracking
- Audit logs: append-only logging

#### 2. Services Layer

**Purpose**: Encapsulate business logic

**AuthService** (`backend/services/AuthService.js`):
- User registration with validation
- Password hashing (PBKDF2, 100k iterations)
- Login with session creation
- Session verification
- Password changes
- Profile updates

**FriendsService** (`backend/services/FriendsService.js`):
- Send friend requests by email
- List pending requests
- Accept/reject requests
- Remove friends
- Get friends list

**ChatService** (`backend/services/ChatService.js`):
- Create/get chat threads
- Send messages
- Get message history
- Mark messages as read
- Enforce friend-only messaging

**WebSocketService** (`backend/services/WebSocketService.js`):
- WebSocket connection management
- Real-time message broadcasting
- Typing indicators
- Heartbeat/keepalive
- Connection cleanup

#### 3. Middleware Layer

**Authentication Middleware** (`backend/middleware/auth.js`):
```javascript
createAuthMiddleware(authService)     // Required auth
createOptionalAuthMiddleware(authService)  // Optional auth
```

- Verifies session tokens
- Attaches user to request
- Returns 401 if invalid
- Supports cookies and Bearer tokens

**Rate Limiting** (`backend/middleware/rateLimit.js`):
```javascript
rateLimiters.auth    // 5 requests per 15 minutes
rateLimiters.api     // 60 requests per minute
rateLimiters.chat    // 30 messages per minute
rateLimiters.upload  // 10 uploads per minute
rateLimiters.public  // 120 requests per minute
```

- In-memory request tracking
- Automatic cleanup of old entries
- X-RateLimit-* headers
- 429 status on limit exceeded

#### 4. Routes Layer

**Purpose**: Handle HTTP requests, validate input, call services

**Pattern**:
```javascript
router.post('/endpoint', rateLimiter, async (req, res) => {
    try {
        // 1. Validate input
        if (!req.body.field) {
            return res.status(400).json({
                error: 'Missing field',
                message: 'User-friendly explanation'
            });
        }
        
        // 2. Call service
        const result = await service.operation(data);
        
        // 3. Log audit
        await storage.logAudit({...});
        
        // 4. Return response
        res.json({ success: true, result });
    } catch (err) {
        // 5. Handle errors
        res.status(400).json({
            error: 'Operation failed',
            message: err.message
        });
    }
});
```

### API Design

#### RESTful Endpoints

**Authentication**:
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

**Friends**:
- `GET /api/friends` - List friends
- `GET /api/friends/requests` - Get friend requests
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept` - Accept friend request
- `DELETE /api/friends/:friendId` - Remove friend

**Chat**:
- `GET /api/chatmessages/threads` - Get chat threads
- `POST /api/chatmessages/thread` - Create/get thread
- `GET /api/chatmessages/messages?threadId=X` - Get messages
- `POST /api/chatmessages/send` - Send message
- `POST /api/chatmessages/mark-read` - Mark as read

**WebSocket**:
- `WS /ws/chat?token=SESSION_TOKEN` - Real-time connection

### Data Models

#### User
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "passwordHash": "salt:hash",
  "displayName": "John Doe",
  "bio": "Optional bio",
  "avatar": "Optional avatar URL",
  "createdAt": "2024-12-18T10:00:00.000Z",
  "updatedAt": "2024-12-18T10:00:00.000Z"
}
```

#### Session
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "token": "64-char-hex",
  "expiresAt": "2024-12-25T10:00:00.000Z",
  "createdAt": "2024-12-18T10:00:00.000Z"
}
```

#### Chat Thread
```json
{
  "id": "uuid",
  "participants": ["user1-id", "user2-id"],
  "type": "direct",
  "name": null,
  "createdAt": "2024-12-18T10:00:00.000Z",
  "updatedAt": "2024-12-18T10:30:00.000Z",
  "lastMessageId": "message-uuid"
}
```

#### Chat Message
```json
{
  "id": "uuid",
  "threadId": "thread-uuid",
  "senderId": "user-uuid",
  "content": "encrypted or plain text",
  "encryptionVersion": "v1",
  "nonce": "encryption-nonce",
  "readBy": ["user1-id"],
  "createdAt": "2024-12-18T10:30:00.000Z"
}
```

## Frontend Architecture

### PWA Structure

```
public/
├── manifest.json          # PWA manifest
├── service-worker.js      # Offline support
├── js/
│   ├── app.js            # Main application
│   ├── ui-magic.js       # UI enhancements
│   └── sw-register.js    # SW registration
├── css/
│   ├── tokens.css        # Design tokens
│   ├── base.css          # Base styles
│   ├── components.css    # Component styles
│   └── style.css         # Custom styles
├── GUI.html              # Main dashboard
└── auth.html             # Authentication page
```

### Service Worker

**Caching Strategy**:
- **Precache**: Core app shell (HTML, CSS, JS)
- **Runtime cache**: Images, API responses
- **Network-first**: API requests
- **Cache-first**: Static assets

**Features**:
- Offline fallback
- Update notifications
- Background sync (prepared)
- Push notifications (prepared)

## Security Architecture

### Authentication Flow

```
1. User submits credentials
2. Server validates (rate limit: 5/15min)
3. Password verified with PBKDF2
4. Session created (7-day expiry)
5. httpOnly cookie set
6. User object returned (no password)
```

### Session Management

```
1. Request includes session cookie
2. Middleware verifies token
3. Check expiration
4. Load user from storage
5. Attach to req.user
6. Continue to route
```

### Security Measures

1. **Password Security**:
   - PBKDF2 hashing (100,000 iterations)
   - Random salt per password
   - SHA-512 hash function

2. **Session Security**:
   - 64-byte random tokens
   - httpOnly cookies (no JS access)
   - SameSite=Lax (CSRF protection)
   - 7-day expiration
   - Secure flag in production

3. **Rate Limiting**:
   - Per-IP tracking
   - Automatic cleanup
   - Different limits per endpoint type
   - 429 responses with retry-after

4. **Input Validation**:
   - Type checking
   - Length limits
   - Format validation
   - Sanitization where needed

5. **Audit Logging**:
   - All authentication events
   - Friend requests/changes
   - Message sending
   - Security-relevant actions
   - IP and user agent tracking

6. **Admin Endpoints**:
   - Localhost-only by default
   - No external access without proxy
   - Separate from user API

## Deployment Architecture

### Linux/Node.js Path

```
┌─────────────────────────────────────────┐
│          asennus.py                     │
│  (Production Installer)                 │
└────────────┬────────────────────────────┘
             │
   ┌─────────▼──────────┐
   │  Prerequisites      │
   │  - Node.js 20+      │
   │  - Python 3.10+     │
   │  - npm              │
   │  - ffmpeg (opt)     │
   └─────────┬──────────┘
             │
   ┌─────────▼──────────┐
   │  Install deps       │
   │  - npm install      │
   │  - pip install      │
   └─────────┬──────────┘
             │
   ┌─────────▼──────────┐
   │  Configuration      │
   │  - .env file        │
   │  - Port selection   │
   │  - Secret key gen   │
   └─────────┬──────────┘
             │
   ┌─────────▼──────────┐
   │  Service Setup      │
   │  - systemd service  │
   │  - Auto-start       │
   └─────────┬──────────┘
             │
   ┌─────────▼──────────┐
   │  Running Server     │
   │  - Port 3000        │
   │  - WebSocket /ws    │
   │  - JSON storage     │
   └─────────────────────┘
```

### Web Hosting Path (Future)

**Note**: PHP backend and asennus.php installer are planned for future releases.

## Performance Considerations

### JSON Storage

**Advantages**:
- Zero configuration
- Easy backup (copy files)
- Human-readable
- Git-friendly

**Limitations**:
- Linear search O(n)
- Full file reads/writes
- Not suitable for >10k records
- No transactions

**Mitigation**:
- In-memory caching (planned)
- Lazy loading
- Periodic cleanup
- Migration to MySQL for scale

### WebSocket

**Scaling**:
- In-memory client tracking
- One WS connection per tab
- Heartbeat every 30s
- Auto-cleanup of dead connections

**Future**:
- Redis for multi-instance
- Socket.io for fallbacks
- Message queuing

## Future Architecture

### Planned Enhancements

1. **Encryption Layer**:
   - Libsodium for message encryption
   - Per-user encryption keys
   - Key derivation from password
   - Client-side decryption

2. **MySQL Adapter**:
   - Proper indexes
   - Transactions
   - Better concurrency
   - Full-text search

3. **PHP Backend**:
   - Same API contract
   - MySQL storage
   - SSE for real-time
   - Web hosting friendly

4. **Caching Layer**:
   - Redis integration
   - Session store
   - Rate limit store
   - Message queue

5. **Testing**:
   - Unit tests
   - Integration tests
   - E2E tests
   - Load tests

## Conclusion

Overmind v1.0.0 provides a solid foundation for a self-hosted dashboard with:
- Clean, modular architecture
- Security-first design
- Easy deployment
- Room for growth

The architecture supports both simple deployments (single JSON files) and future scaling (databases, encryption, PHP hosting).
