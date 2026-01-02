# Overmind v1.01 Release Notes

## Overview

Version 1.01 introduces enterprise-grade authentication, comprehensive settings management, mobile-optimized UI, and enhanced security features to the Overmind dashboard.

## 🔐 Authentication & Authorization

### User Management
- **Secure Registration & Login**: Username/email-based authentication with bcrypt password hashing (12 rounds)
- **Role-Based Access Control**: Admin and user roles with granular permissions
- **Session Management**: Secure httpOnly cookies with 7-day expiration
- **Password Requirements**: Minimum 8 characters with server-side validation
- **Rate Limiting**: Protection against brute-force attacks (5 attempts per 15 minutes)

### Admin Bootstrap
- **Default Admin User**: Created automatically on first startup
  - Username: `admin`
  - Password: `admin123` (⚠️ Change in production!)
- **Environment Variable Overrides**:
  - `ADMIN_USERNAME`: Override default admin username
  - `ADMIN_PASSWORD`: Override default admin password
  - `ADMIN_EMAIL`: Override default admin email
- **Production Mode**: Forces password change on first login when `NODE_ENV=production`

### UI Features
- Premium login/register pages with animated backgrounds
- Auth gate on main dashboard - redirects to login if not authenticated
- User info display with logout functionality
- Admin-only features automatically shown/hidden based on role

## ⚙️ Settings Management (Admin Only)

### AI Personas
Complete CRUD interface for managing AI personality profiles:
- **Create/Edit/Delete** personas with custom system prompts
- **Configure Parameters**: Temperature, model selection
- **Default Persona**: Set one persona as default for all conversations
- **Enable/Disable**: Toggle personas on/off
- **Seeded Defaults**:
  - **Coder**: Engineering-focused, concise code solutions
  - **Friend**: Casual, supportive, conversational
  - **Business**: Strategic, KPI/roadmap oriented
  - **Security Reviewer**: Threat-model mindset, security analysis

### Branding Configuration
Customize app appearance:
- Logo URL configuration
- Background image URL
- App name customization
- Primary color selection (color picker)

### Camera Sources
Manage camera endpoints for streaming:
- Add/Edit/Delete camera sources
- HTTP/HTTPS URL validation (blocks javascript:, file:, etc.)
- Enable/disable cameras
- Name and URL management

## 📱 Mobile-Responsive MindMap

### Touch Optimizations
- **Pinch-to-Zoom**: Two-finger zoom gesture support
- **Pan Support**: Touch/mouse drag to navigate large mindmaps
- **Zoom Controls**: Floating buttons for +, -, and "Fit to Screen"
- **Responsive Layout**: Adapts to viewport width (works on iPhone 390px width)
- **No Overflow**: Eliminated horizontal scrolling issues

### Features
- Mouse wheel zoom support
- Smooth zoom/pan animations
- Touch-action optimized for mobile devices
- Responsive toolbar that adapts to mobile screens
- Smaller node sizes on mobile for better readability

## 🔒 Security Enhancements

### Password Security
- **bcrypt Hashing**: Industry-standard password hashing with 12 rounds
- Replaced PBKDF2 with more secure bcrypt implementation
- Never stores plaintext passwords
- Secure session tokens (64-byte random)

### Input Validation
- Server-side validation for all inputs
- URL sanitization for camera sources
- Protection against XSS and injection attacks
- CORS configuration support

### Audit Logging
- All authentication events logged
- User registration/login tracking
- Admin actions audited
- IP address and user agent tracking

## 🎨 UI/UX Improvements

### Design System
- Consistent spacing, radius, and shadow scales
- Premium glassmorphism effects with backdrop blur
- Smooth transitions (150-220ms easing)
- LED-accent glow effects
- Noise texture overlays for depth

### Animations
- Floating bento tiles on auth pages
- Smooth modal transitions
- Button press states and micro-feedback
- Toast notifications for user actions
- Hover effects with scale transforms

### Responsive Design
- Mobile-first approach for all features
- Breakpoint at 768px for tablet/phone
- Touch-optimized controls
- Flexible layouts that adapt to screen size

## 🗄️ Data Storage

### New Data Files
- `personas.json`: AI persona profiles
- `app_config.json`: Branding and UI configuration
- `users.json`: User accounts with roles
- `sessions.json`: Active user sessions
- `audit_logs.json`: Security audit trail

### Storage Adapter
Enhanced JsonStorageAdapter with:
- Persona CRUD operations
- App config management
- Camera settings storage
- User management by username/email
- Session lifecycle management

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/register`: Create new account
- `POST /api/auth/login`: Login with username/email
- `POST /api/auth/logout`: End session
- `GET /api/auth/me`: Get current user info
- `PUT /api/auth/profile`: Update user profile
- `POST /api/auth/change-password`: Change password

### Settings (Admin Only)
- `GET /api/settings/personas`: List all personas
- `POST /api/settings/personas`: Create persona
- `PUT /api/settings/personas/:id`: Update persona
- `DELETE /api/settings/personas/:id`: Delete persona
- `GET /api/settings/config`: Get app config
- `PUT /api/settings/config`: Update app config
- `GET /api/settings/cameras`: List cameras
- `POST /api/settings/cameras`: Add camera
- `PUT /api/settings/cameras/:id`: Update camera
- `DELETE /api/settings/cameras/:id`: Delete camera

## 📦 Dependencies

### New Dependencies
- `bcryptjs@^2.4.3`: Password hashing
- Existing: `express`, `cors`, `cookie-parser`, `multer`, `uuid`, `ws`

## 🚀 Getting Started

### Installation
```bash
git clone https://github.com/AnomFIN/Overmind.git
cd Overmind
npm install
```

### Configuration
```bash
cp .env.example .env
# Edit .env with your settings
```

### Run
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### First Login
1. Navigate to `http://localhost:3000`
2. You'll be redirected to the login page
3. Login with:
   - Username: `admin`
   - Password: `admin123`
4. **IMPORTANT**: Change the default password immediately!

## ⚠️ Security Notes

### Production Deployment
1. **Change Admin Password**: The default admin password is `admin123` - change it immediately
2. **Set NODE_ENV**: Set `NODE_ENV=production` to enforce password change on first login
3. **Use HTTPS**: Always use HTTPS in production
4. **Secure Cookies**: Cookies are httpOnly and use SameSite=lax
5. **Rate Limiting**: Authentication endpoints are rate-limited
6. **Environment Variables**: Use environment variables for sensitive data

### Admin Access
- Settings page is only accessible to users with `role: admin`
- Admin features are hidden from non-admin users
- First user created via registration is NOT admin (use bootstrap admin)

## 🔄 Migration Notes

### From v1.0.0 to v1.01
1. Run `npm install` to get new dependencies
2. Bootstrap will automatically create admin user and default personas
3. Existing data files are preserved
4. No database migrations needed (JSON-based storage)

## 🐛 Known Issues

- E2EE chat not yet implemented (planned for v1.02)
- Camera viewer UI not yet implemented (settings backend complete)
- WebCrypto key generation pending

## 📝 Changelog

### Added
- User authentication with bcrypt
- Role-based access control (admin/user)
- Settings management UI
- AI personas CRUD interface
- Branding configuration
- Camera sources management
- Mobile-responsive MindMap
- Zoom and pan controls for MindMap
- Admin bootstrap on first run
- Comprehensive audit logging
- Premium login/register pages
- Auth gate for all routes

### Changed
- Switched from PBKDF2 to bcrypt for password hashing
- Updated main entry point to serverIntegrated.js
- Enhanced storage adapter with new methods
- Improved mobile responsiveness across all panels

### Security
- Implemented secure session management
- Added rate limiting on auth endpoints
- URL validation for camera sources
- Input sanitization throughout
- Audit logging for security events

## 🙏 Credits

Developed by the AnomFIN team with AI assistance.

---

**Version**: 1.01  
**Release Date**: December 18, 2024  
**License**: MIT
