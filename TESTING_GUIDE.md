# E2E Encrypted Chat - Testing Guide

## Quick Start Testing

### Prerequisites
1. Node.js 20+ installed
2. Repository cloned and dependencies installed (`npm install`)

### Starting the Server

```bash
npm start
```

Server will start at `http://localhost:3000`

### Initial Setup

1. **Login with default admin account:**
   - Username: `admin`
   - Password: `admin123`
   - **Important:** Change this password in Settings immediately!

2. **Create test users** (for testing chat):
   - Register at least 2 users to test messaging
   - Or have admin create multiple user accounts

3. **Add friends:**
   - Go to Friends section
   - Send friend request to another user
   - Accept the friend request from other user's account

### Testing the Chat Feature

#### 1. Access Secure Chat
- Click on "🔐 Secure Chat" in the navigation menu
- You should see the chat interface

#### 2. Key Generation (First Time Only)
- Keys are automatically generated on first access
- This happens in the background
- Check browser console for "[Chat] Keys generated and stored"

#### 3. Start a Conversation
- Click on a friend from the contacts list
- The chat window opens with the friend's name at the top
- You should see "🔒 Messages are end-to-end encrypted" badge

#### 4. Send Messages
- Type a message in the input field at the bottom
- Press Enter or click the send button
- Message should appear in the chat as "sent" (right side)
- Check the other user's browser - they should see it as "received" (left side)

#### 5. Test Real-Time Features

**Typing Indicators:**
- Start typing in the message input
- Other user should see typing indicator (three dots)
- Stop typing - indicator should disappear after 3 seconds

**Read Receipts:**
- Send a message
- Single checkmark (✓) = sent
- Double checkmark (✓✓) = delivered
- Blue double checkmark = read

#### 6. File Sharing
- Click the 📎 attachment button
- Select a file (max 10MB)
- File is encrypted and uploaded
- Recipient can download and decrypt the file
- Test with various file types: images, PDFs, text files

#### 7. Message Deletion
- Hover over your sent message
- Right-click to open context menu (future feature - for now test via console)
- Delete for yourself vs delete for everyone

#### 8. WebSocket Testing
- Open chat in two different browsers/tabs (different users)
- Send messages - should appear instantly
- Test typing indicators
- Test read receipts
- Disconnect one client - should auto-reconnect

#### 9. Mobile Testing
- Open on mobile device or resize browser to mobile width
- Contact list should be full-width
- Opening a chat should hide contact list
- Back button should return to contact list
- All features should work on mobile

### Browser Console Checks

Open browser developer tools (F12) and check for:

```javascript
// Should see these logs:
[Chat] Initializing...
[Encryption] Initialized
[Chat] Keys generated and stored  // First time only
[Chat] Initialized successfully
[WebSocket] WebSocket connected
[WebSocket] WebSocket authenticated

// When sending messages:
[Chat] Encrypting message...
[Chat] Message sent

// When receiving messages:
[Chat] Decrypting message...
[Chat] Message received
```

### Testing Encryption

#### Verify End-to-End Encryption:

1. **Send a test message:**
   - Send: "Hello, this is a secret message!"

2. **Check server storage:**
   ```bash
   cat data/chat_messages.json
   ```
   - You should see encrypted gibberish in the `content` field
   - NOT the plaintext "Hello, this is a secret message!"

3. **Check encryption keys:**
   ```bash
   cat data/chat_keys.json
   ```
   - Public keys should be visible (base64)
   - Private keys should be encrypted

4. **Verify in browser:**
   - Open IndexedDB in browser dev tools
   - Check `ChatEncryptionDB` database
   - Keys should be stored there

### Performance Testing

Test the following performance targets:

1. **Message Encryption/Decryption:** < 50ms
   - Check browser console timing
   
2. **Message Send to Delivery:** < 200ms (with WebSocket)
   - Send timestamp vs receive timestamp
   
3. **Chat List Load:** < 500ms
   - Time from navigation to rendered list
   
4. **Message History Load (50 messages):** < 1s
   - Time to decrypt and render 50 messages

### Security Testing

#### Test These Security Features:

1. **Session Authentication:**
   - Try accessing `/chat.html` without logging in
   - Should redirect to login page

2. **Friend Restrictions:**
   - Try to create chat thread with non-friend
   - Should get error: "You can only chat with friends"

3. **File Access Control:**
   - Try to access another user's file by guessing file ID
   - Should get "Access denied" error

4. **WebSocket Authentication:**
   - Try connecting to WebSocket without valid token
   - Connection should be rejected

5. **Rate Limiting:**
   - Send many messages rapidly
   - Should eventually hit rate limit

### Common Issues & Troubleshooting

#### "Keys not found" Error
- Clear browser cache and IndexedDB
- Reload page to regenerate keys

#### Messages Not Decrypting
- Check browser console for errors
- Verify both users have generated keys
- Check that you're friends with the other user

#### WebSocket Not Connecting
- Check server is running
- Check browser console for connection errors
- Verify port 3000 is accessible
- Check for firewall issues

#### Files Not Uploading
- Check file size (max 10MB)
- Check browser console for errors
- Verify mime type is supported

#### Typing Indicator Not Showing
- Check WebSocket connection is active
- Check browser console for errors
- Try refreshing both windows

### Test Checklist

- [ ] Key generation works on first access
- [ ] Can send and receive text messages
- [ ] Messages are encrypted on server
- [ ] Messages decrypt correctly for recipient
- [ ] Typing indicators work in real-time
- [ ] Read receipts update correctly
- [ ] File upload and download works
- [ ] Files are encrypted on server
- [ ] Can only chat with friends
- [ ] Cannot access other users' files
- [ ] WebSocket auto-reconnects after disconnect
- [ ] Mobile layout works correctly
- [ ] Dark mode works (if system prefers dark)
- [ ] Can search contacts
- [ ] Last message shows in contact list
- [ ] Timestamp formats correctly
- [ ] Emoji support works in messages
- [ ] Multiple tabs work simultaneously
- [ ] Session persists across page refresh
- [ ] Logout clears sensitive data

### Browser Compatibility

Test in these browsers:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Load Testing

For production readiness:
1. Test with 10+ concurrent users
2. Test with 100+ messages in a thread
3. Test with multiple files being uploaded
4. Monitor server memory and CPU usage
5. Check WebSocket connection limits

### Reporting Issues

If you find bugs or security issues:
1. Note exact steps to reproduce
2. Check browser console for errors
3. Check server logs for errors
4. Note browser and OS version
5. Create detailed issue report

## Production Deployment Notes

Before deploying to production:

1. **Change default admin password**
2. **Set up HTTPS** (required for WebSocket in production)
3. **Configure proper CORS** if frontend is on different domain
4. **Set NODE_ENV=production**
5. **Configure rate limiting** appropriately
6. **Set up monitoring** for WebSocket connections
7. **Configure backup strategy** for encrypted data
8. **Review CHAT_SECURITY.md** for security best practices

## Success Criteria

✅ Chat feature is considered successful when:
- Users can send/receive encrypted messages
- Files can be shared securely
- Real-time features work reliably
- Mobile experience is smooth
- No security vulnerabilities found
- Performance targets are met
- All tests in checklist pass

---

Happy Testing! 🎉
