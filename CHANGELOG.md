# Changelog

All notable changes to Overmind will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-18

### 🎉 Initial Production Release

This is the first production-ready release of Overmind, a self-hosted personal dashboard for Linux systems.

### Added

#### Core Features
- **User Authentication System**
  - User registration and login with secure session management
  - PBKDF2 password hashing with salt
  - httpOnly cookies with SameSite protection
  - Session expiration and management
  - Profile management and password changes
  - Comprehensive audit logging

- **Friends System**
  - Send and accept friend requests
  - Remove friends
  - Friends list management
  - Friend-based chat permissions

- **Real-time Chat**
  - WebSocket-based real-time messaging
  - Thread-based conversations
  - Typing indicators
  - Message read receipts
  - Message history with pagination
  - Encryption metadata support (ready for Phase 4)
  - Automatic reconnection handling
  - Heartbeat mechanism for connection health

- **Progressive Web App (PWA)**
  - Installable on mobile and desktop
  - Offline support with service worker
  - App-like experience on mobile devices
  - Push notification infrastructure
  - "Add to Home Screen" prompt
  - Update notifications

- **Existing Features (Maintained)**
  - OpenAI chat console
  - Link shortener with expiry
  - 15-minute temp file uploads
  - Local file browser
  - Camera wall with motion recording
  - Mind-map notes
  - Dashboard overview

#### Infrastructure

- **Storage Abstraction Layer**
  - StorageAdapter interface for multiple backends
  - JsonStorageAdapter for file-based storage
  - Ready for MySQL adapter implementation
  - Consistent API across storage types

- **Security**
  - Rate limiting on all sensitive endpoints
  - Input validation across all routes
  - Audit logging for security events
  - CORS configuration
  - Secure cookie defaults
  - Secret key generation

- **Installation & Deployment**
  - Production-ready Python installer (asennus.py)
  - Prerequisite checking (Node.js 20+, Python 3.10+, npm, ffmpeg)
  - Port availability testing
  - Automatic .env configuration generation
  - systemd service file generation
  - Comprehensive runbook and documentation

#### Developer Experience

- **Backend Architecture**
  - Modular service-based architecture
  - Clear separation of concerns
  - Middleware for auth and rate limiting
  - WebSocket service for real-time features
  - Graceful shutdown handling

- **Code Quality**
  - Consistent error handling
  - User-friendly error messages
  - Comprehensive logging
  - Clean codebase structure

### Security

- All authentication endpoints rate-limited
- Password hashing with PBKDF2 (100,000 iterations)
- Session tokens (64-byte random hex)
- Admin endpoints restricted to localhost
- Audit logging for sensitive operations
- Secure cookie configuration (httpOnly, SameSite)

### Technical Details

- **Node.js**: 20.x LTS or higher
- **Dependencies**: express, ws, cookie-parser, cors, multer, uuid
- **Data Storage**: JSON files (backward compatible)
- **Real-time**: WebSocket with SSE fallback (planned)
- **Security**: Built-in crypto module (PBKDF2)

### Known Limitations

- Encryption at rest not yet implemented (Phase 4)
- Frontend integration pending
- PHP backend not yet available
- MySQL storage adapter not yet implemented
- No automated tests yet

### Migration Notes

- Existing installations will continue to work
- New authentication system is opt-in through new endpoints
- All existing data formats remain compatible
- No breaking changes to existing features

### Contributors

- AnomFIN - Initial development and architecture

## [Unreleased]

### Planned Features

- End-to-end encryption for chat messages (libsodium/OpenSSL)
- PHP backend for web hosting environments
- MySQL storage adapter
- Frontend authentication UI integration
- SSE fallback for environments without WebSocket
- Automated testing suite
- Docker deployment option
- Multi-language support

---

For more details, see the [GitHub repository](https://github.com/AnomFIN/Overmind).
