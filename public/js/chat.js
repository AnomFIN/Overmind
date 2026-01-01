/**
 * Chat Application Logic
 * Handles UI, WebSocket connections, and message management
 */

class ChatApp {
    constructor() {
        this.currentUser = null;
        this.currentThread = null;
        this.friends = [];
        this.threads = [];
        this.messages = [];
        this.ws = null;
        this.typingTimeout = null;
        this.sessionToken = null;
        this.recipientPublicKey = null;
    }

    /**
     * Initialize the chat application
     */
    async init() {
        console.log('[Chat] Initializing...');

        // Check authentication
        this.sessionToken = this.getCookie('session');
        if (!this.sessionToken) {
            window.location.href = '/login.html';
            return;
        }

        try {
            // Initialize encryption
            await encryptionManager.init();

            // Check if user has encryption keys
            const hasKeys = await this.checkUserKeys();
            if (!hasKeys) {
                await this.generateAndStoreKeys();
            }

            // Load current user info
            await this.loadCurrentUser();

            // Load friends and threads
            await this.loadFriends();
            await this.loadThreads();

            // Connect WebSocket
            this.connectWebSocket();

            // Set up event listeners
            this.setupEventListeners();

            console.log('[Chat] Initialized successfully');
        } catch (error) {
            console.error('[Chat] Initialization error:', error);
            this.showError('Failed to initialize chat. Please refresh the page.');
        }
    }

    /**
     * Check if user has encryption keys stored on server
     */
    async checkUserKeys() {
        try {
            const response = await fetch('/api/chat/keys/my', {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data.success && data.keys;
            }
            return false;
        } catch (error) {
            console.error('[Chat] Error checking keys:', error);
            return false;
        }
    }

    /**
     * Generate keys and store on server
     */
    async generateAndStoreKeys() {
        try {
            console.log('[Chat] Generating encryption keys...');

            // Get public key to upload
            const publicKey = await encryptionManager.getPublicKeyString();

            // Prompt user for a password to encrypt their private key
            // NOTE: This password should be kept secret by the user and is independent of the session token.
            const password = window.prompt(
                'Set a password to protect your encryption keys.\n\n' +
                'You will need this password to decrypt your messages on this or other devices.'
            );

            if (!password) {
                throw new Error('An encryption password is required to generate and store your keys.');
            }
            // Encrypt private key with password
            const encryptedPrivateKey = await encryptionManager.getEncryptedPrivateKey(password);

            // Upload to server
            const response = await fetch('/api/chat/keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    publicKey,
                    encryptedPrivateKey: JSON.stringify(encryptedPrivateKey)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to store keys on server');
            }

            console.log('[Chat] Keys generated and stored');
        } catch (error) {
            console.error('[Chat] Error generating keys:', error);
            throw error;
        }
    }

    /**
     * Load current user info
     */
    async loadCurrentUser() {
        try {
            // Fetch current user info from API
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
            } else {
                throw new Error('Failed to load user info');
            }
        } catch (error) {
            console.error('[Chat] Error loading user:', error);
            // Fallback to basic info
            this.currentUser = {
                id: 'unknown',
                displayName: 'You'
            };
        }
    }

    /**
     * Load friends list
     */
    async loadFriends() {
        try {
            const response = await fetch('/api/friends', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.friends = data.friends || [];
                this.renderContacts();
            }
        } catch (error) {
            console.error('[Chat] Error loading friends:', error);
        }
    }

    /**
     * Load chat threads
     */
    async loadThreads() {
        try {
            const response = await fetch('/api/chat/threads', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.threads = data.threads || [];
                this.renderContacts();
            }
        } catch (error) {
            console.error('[Chat] Error loading threads:', error);
        }
    }

    /**
     * Render contacts list
     */
    renderContacts() {
        const contactsList = document.getElementById('contactsList');
        
        if (this.friends.length === 0) {
            contactsList.innerHTML = `
                <div style="padding: 32px; text-align: center; color: var(--chat-text-muted);">
                    <p>No contacts yet.</p>
                    <p style="font-size: 14px; margin-top: 8px;">Add friends from the main dashboard to start chatting.</p>
                </div>
            `;
            return;
        }

        contactsList.innerHTML = this.friends.map(friend => {
            const thread = this.threads.find(t => 
                t.participants.some(p => p.id === friend.id)
            );
            
            const initials = this.getInitials(friend.displayName || friend.email);
            const lastMessage = thread ? 'Last message...' : 'Start chatting';
            const unreadCount = 0; // TODO: Calculate actual unread count

            return `
                <div class="chat-contact" 
                     data-friend-id="${friend.id}" 
                     data-thread-id="${thread?.id || ''}"
                     role="button"
                     tabindex="0"
                     aria-label="Chat with ${this.escapeHtml(friend.displayName || friend.email)}">
                    <div class="chat-contact-avatar">${initials}</div>
                    <div class="chat-contact-info">
                        <div class="chat-contact-name">${this.escapeHtml(friend.displayName || friend.email)}</div>
                        <div class="chat-contact-last-message">${lastMessage}</div>
                    </div>
                    <div class="chat-contact-meta">
                        <div class="chat-contact-time"></div>
                        ${unreadCount > 0 ? `<div class="chat-contact-unread">${unreadCount}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add click and keyboard handlers
        document.querySelectorAll('.chat-contact').forEach(contact => {
            const openChatHandler = () => {
                const friendId = contact.dataset.friendId;
                const threadId = contact.dataset.threadId;
                this.openChat(friendId, threadId);
            };
            
            contact.addEventListener('click', openChatHandler);
            
            contact.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openChatHandler();
                }
            });
        });
            });
        });
    }

    /**
     * Open chat with a friend
     */
    async openChat(friendId, threadId) {
        try {
            // Find friend
            const friend = this.friends.find(f => f.id === friendId);
            if (!friend) {
                console.error('[Chat] Friend not found');
                return;
            }

            // Get or create thread
            if (!threadId) {
                const response = await fetch('/api/chat/thread', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ friendId })
                });

                if (response.ok) {
                    const data = await response.json();
                    threadId = data.thread.id;
                } else {
                    throw new Error('Failed to create thread');
                }
            }

            // Load recipient's public key
            await this.loadRecipientPublicKey(friendId);

            // Set current thread
            this.currentThread = {
                id: threadId,
                friend: friend
            };

            // Update UI
            this.showChatUI(friend);

            // Load messages
            await this.loadMessages(threadId);

            // Mark active contact
            document.querySelectorAll('.chat-contact').forEach(c => {
                c.classList.toggle('active', c.dataset.friendId === friendId);
            });

            // Hide sidebar on mobile
            if (window.innerWidth <= 768) {
                document.getElementById('chatSidebar').classList.add('hidden');
                document.getElementById('chatMain').classList.remove('hidden');
            }

        } catch (error) {
            console.error('[Chat] Error opening chat:', error);
            this.showError('Failed to open chat');
        }
    }

    /**
     * Load recipient's public key
     */
    async loadRecipientPublicKey(userId) {
        try {
            const response = await fetch(`/api/chat/keys/${userId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.recipientPublicKey = data.publicKey;
            } else {
                throw new Error('Failed to load recipient public key');
            }
        } catch (error) {
            console.error('[Chat] Error loading recipient key:', error);
            this.showError('Cannot start encrypted chat - recipient has not set up encryption yet');
            throw error;
        }
    }

    /**
     * Show chat UI
     */
    showChatUI(friend) {
        // Hide empty state
        document.getElementById('chatEmpty').style.display = 'none';

        // Show chat elements
        document.getElementById('chatHeader').style.display = 'flex';
        document.getElementById('encryptionBadge').style.display = 'flex';
        document.getElementById('messagesContainer').style.display = 'flex';
        document.getElementById('chatInput').style.display = 'flex';

        // Update header
        const initials = this.getInitials(friend.displayName || friend.email);
        document.getElementById('chatAvatar').textContent = initials;
        document.getElementById('chatUserName').textContent = friend.displayName || friend.email;
        document.getElementById('chatUserStatus').textContent = 'Online';
    }

    /**
     * Load messages for current thread
     */
    async loadMessages(threadId) {
        try {
            const response = await fetch(`/api/chat/messages?threadId=${threadId}&limit=50`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.messages = data.messages || [];
                await this.renderMessages();
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('[Chat] Error loading messages:', error);
        }
    }

    /**
     * Render messages
     */
    async renderMessages() {
        const container = document.getElementById('messagesContainer');
        
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 32px; color: var(--chat-text-muted);">
                    No messages yet. Start the conversation!
                </div>
            `;
            return;
        }

        // Decrypt all messages in parallel to improve performance
        const decryptionResults = await Promise.all(
            this.messages.map(async (message) => {
                let decryptedContent = '';
                try {
                    // Decrypt message
                    if (message.encryptionMetadata && message.encryptionMetadata.encryptedKey) {
                        decryptedContent = await encryptionManager.decryptMessage(
                            message.content,
                            message.encryptionMetadata.encryptedKey,
                            message.encryptionMetadata.iv
                        );
                    } else {
                        // Fallback for non-encrypted messages
                        decryptedContent = message.content;
                    }
                } catch (error) {
                    const errorLabel = error && (error.code || error.name || 'UnknownError');
                    console.error('[Chat] Error decrypting message:', errorLabel);
                    decryptedContent = '[Cannot decrypt message]';
                }

                return { message, decryptedContent };
            })
        );

        const messagesHtml = [];
        
        for (const { message, decryptedContent } of decryptionResults) {
            const isSent = message.senderId === this.currentUser.id;
            const time = this.formatTime(message.createdAt);
            const readStatus = message.readReceipts && message.readReceipts.length > 0 ? 'read' : '';

            messagesHtml.push(`
                <div class="chat-message ${isSent ? 'sent' : 'received'}" data-message-id="${message.id}">
                    <div class="chat-message-bubble">
                        ${message.messageType === 'file' ? this.renderFileAttachment(message) : ''}
                        <div class="chat-message-content">${this.escapeHtml(decryptedContent)}</div>
                        <div class="chat-message-meta">
                            <span class="chat-message-time">${time}</span>
                            ${isSent ? `
                                <span class="chat-message-status">
                                    <span class="chat-message-checkmark ${readStatus}">✓✓</span>
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `);
        }

        container.innerHTML = messagesHtml.join('');
        
        // Add event listeners for file download buttons
        container.querySelectorAll('.chat-message-file-download').forEach(button => {
            button.addEventListener('click', (e) => {
                const fileId = e.currentTarget.getAttribute('data-file-id');
                if (fileId) {
                    this.downloadFile(fileId);
                }
            });
        });
    }

    /**
     * Render file attachment
     */
    renderFileAttachment(message) {
        if (!message.fileId) return '';

        return `
            <div class="chat-message-file">
                <div class="chat-message-file-icon">📄</div>
                <div class="chat-message-file-info">
                    <div class="chat-message-file-name">File attachment</div>
                    <div class="chat-message-file-size">Download to view</div>
                </div>
                <button class="chat-message-file-download" data-file-id="${this.escapeHtml(message.fileId)}">
                    ⬇
                </button>
            </div>
        `;
    }

    /**
     * Send message
     */
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();

        if (!content || !this.currentThread) return;

        try {
            // Encrypt message
            const encrypted = await encryptionManager.encryptMessage(
                content,
                this.recipientPublicKey
            );

            // Send to server
            const response = await fetch('/api/chat/send-encrypted', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    threadId: this.currentThread.id,
                    content: encrypted.encryptedContent,
                    metadata: {
                        encryption: {
                            encryptedKey: encrypted.encryptedKey,
                            iv: encrypted.iv,
                            algorithm: encrypted.algorithm
                        },
                        type: 'text'
                    }
                })
            });

            if (response.ok) {
                input.value = '';
                input.style.height = 'auto';
                this.updateSendButton();
                
                // Message will be added via WebSocket
                // or we can add it optimistically here
            } else {
                throw new Error('Failed to send message');
            }

        } catch (error) {
            console.error('[Chat] Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    /**
     * Handle file attachment
     */
    async handleFileAttachment(file) {
        if (!this.currentThread) return;

        try {
            // Show loading indicator
            this.showInfo('Encrypting and uploading file...');

            // Read file as ArrayBuffer
            const fileData = await file.arrayBuffer();

            // Encrypt file
            const encrypted = await encryptionManager.encryptFile(fileData);

            // Upload encrypted file
            const uploadResponse = await fetch('/api/chat/files/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    filename: `encrypted_${this.currentUser.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    originalName: file.name,
                    encryptedContent: encrypted.encryptedContent,
                    encryptionKey: encrypted.key,
                    iv: encrypted.iv,
                    iv: encrypted.iv,
                    mimeType: file.type,
                    size: file.size
                })
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
            }

            const uploadData = await uploadResponse.json();

            // Send message with file reference
            const messageContent = `📎 ${file.name}`;
            const encryptedMessage = await encryptionManager.encryptMessage(
                messageContent,
                this.recipientPublicKey
            );

            const messageResponse = await fetch('/api/chat/send-encrypted', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    threadId: this.currentThread.id,
                    content: encryptedMessage.encryptedContent,
                    metadata: {
                        encryption: {
                            encryptedKey: encryptedMessage.encryptedKey,
                            iv: encryptedMessage.iv,
                            algorithm: encryptedMessage.algorithm
                        },
                        type: 'file',
                        fileId: uploadData.file.id
                    }
                })
            });

            if (messageResponse.ok) {
                this.showSuccess('File sent successfully');
            } else {
                throw new Error('Failed to send file message');
            }

        } catch (error) {
            console.error('[Chat] Error handling file:', error);
            this.showError('Failed to upload file');
        }
    }

    /**
     * Download file
     */
    async downloadFile(fileId) {
        try {
            const response = await fetch(`/api/chat/files/${fileId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to download file');
            }

            const data = await response.json();
            const file = data.file;

            // Decrypt file
            const decrypted = await encryptionManager.decryptFile(
                file.encryptedContent,
                file.encryptionKey,
                file.iv
            );

            // Create download link
            const blob = new Blob([decrypted], { type: file.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.originalName;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('[Chat] Error downloading file:', error);
            this.showError('Failed to download file');
        }
    }

    /**
     * Connect WebSocket for real-time updates
     */
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/chat?token=${this.sessionToken}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[Chat] WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('[Chat] WebSocket message error:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('[Chat] WebSocket disconnected');
            // Reconnect after 5 seconds
            setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error('[Chat] WebSocket error:', error);
        };
    }

    /**
     * Handle WebSocket message
     */
    async handleWebSocketMessage(data) {
        switch (data.type) {
            case 'connected':
                console.log('[Chat] WebSocket authenticated');
                break;

            case 'message':
                if (this.currentThread && data.message.threadId === this.currentThread.id) {
                    this.messages.push(data.message);
                    await this.renderMessages();
                    this.scrollToBottom();
                }
                // Update contacts list with new message
                await this.loadThreads();
                break;

            case 'typing':
                if (this.currentThread && data.threadId === this.currentThread.id && data.isTyping) {
                    this.showTypingIndicator();
                } else {
                    this.hideTypingIndicator();
                }
                break;

            case 'read_receipt':
                // Update read status for message
                this.updateReadStatus(data.messageId, data.userId);
                break;

            case 'message_deleted':
                // Remove deleted message
                this.removeMessage(data.messageId);
                break;
        }
    }

    /**
     * Send typing status
     */
    sendTypingStatus(isTyping) {
        if (this.currentThread && this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Send via WebSocket
            this.ws.send(JSON.stringify({
                type: 'typing',
                threadId: this.currentThread.id,
                isTyping
            }));

            // Also update via API
            fetch('/api/chat/typing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    threadId: this.currentThread.id,
                    isTyping
                })
            }).catch(err => console.error('[Chat] Error updating typing status:', err));
        }
    }

    /**
     * Show/hide typing indicator
     */
    showTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'none';
    }

    /**
     * Update read status for message
     */
    updateReadStatus(messageId, userId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            const checkmark = messageEl.querySelector('.chat-message-checkmark');
            if (checkmark) {
                checkmark.classList.add('read');
            }
        }
    }

    /**
     * Remove message from UI
     */
    removeMessage(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.remove();
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Send button
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Message input
        const messageInput = document.getElementById('messageInput');
        let typingStartSent = false;
        
        messageInput.addEventListener('input', () => {
            this.updateSendButton();
            this.autoResizeTextarea(messageInput);
            
            // Debounce typing start indicator - only send once until stop
            if (!typingStartSent) {
                this.sendTypingStatus(true);
                typingStartSent = true;
            }
            
            // Clear and reset timeout for typing stop
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.sendTypingStatus(false);
                typingStartSent = false;
            }, 3000);
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // File attachment
        document.getElementById('attachFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileAttachment(file);
                e.target.value = ''; // Reset file input
            }
        });

        // Back to main button
        document.getElementById('backToMainBtn').addEventListener('click', () => {
            window.location.href = '/GUI.html';
        });

        // New chat button
        document.getElementById('newChatBtn').addEventListener('click', () => {
            // For now, just show friends list
            this.loadFriends();
        });

        // Contact search
        document.getElementById('contactSearch').addEventListener('input', (e) => {
            this.filterContacts(e.target.value);
        });

        // Responsive back button
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                document.getElementById('chatSidebar').classList.remove('hidden');
                document.getElementById('chatMain').classList.remove('hidden');
            }
        });
    }

    /**
     * Update send button state
     */
    updateSendButton() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = !input.value.trim();
    }

    /**
     * Auto-resize textarea
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }

    /**
     * Filter contacts by search
     */
    filterContacts(query) {
        const contacts = document.querySelectorAll('.chat-contact');
        const lowerQuery = query.toLowerCase();

        contacts.forEach(contact => {
            const name = contact.querySelector('.chat-contact-name').textContent.toLowerCase();
            contact.style.display = name.includes(lowerQuery) ? 'flex' : 'none';
        });
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }

    /**
     * Helper: Get initials from name
     */
    getInitials(name) {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    /**
     * Helper: Format time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 24 * 60 * 60 * 1000) {
            // Today - show time
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            // This week - show day
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            // Older - show date
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    /**
     * Helper: Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper: Get cookie value
     */
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('[Chat]', message);
        // TODO: Implement toast notifications
        alert(`Error: ${message}`);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log('[Chat]', message);
        // TODO: Implement toast notifications
    }

    /**
     * Show info message
     */
    showInfo(message) {
        console.log('[Chat]', message);
        // TODO: Implement toast notifications
    }
}

// Create global instance and initialize when DOM is ready
const chatApp = new ChatApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => chatApp.init());
} else {
    chatApp.init();
}
