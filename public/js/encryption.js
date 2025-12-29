/**
 * End-to-End Encryption Library
 * Implements Signal Protocol-inspired encryption using Web Crypto API
 */

class EncryptionManager {
    constructor() {
        this.keyPair = null;
        this.publicKey = null;
        this.privateKey = null;
        this.db = null;
        this.initialized = false;
    }

    /**
     * Initialize encryption manager and IndexedDB
     */
    async init() {
        if (this.initialized) return;

        // Open IndexedDB for secure key storage
        this.db = await this.openDatabase();

        // Load or generate keys
        await this.loadOrGenerateKeys();

        this.initialized = true;
        console.log('[Encryption] Initialized');
    }

    /**
     * Open IndexedDB database
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ChatEncryptionDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('keys')) {
                    db.createObjectStore('keys', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('sessionKeys')) {
                    db.createObjectStore('sessionKeys', { keyPath: 'userId' });
                }
            };
        });
    }

    /**
     * Load existing keys from IndexedDB or generate new ones
     */
    async loadOrGenerateKeys() {
        try {
            // Try to load existing keys
            const storedKeys = await this.getFromDB('keys', 'userKeys');

            if (storedKeys && storedKeys.privateKey && storedKeys.publicKey) {
                // Import stored keys
                this.privateKey = await crypto.subtle.importKey(
                    'jwk',
                    storedKeys.privateKey,
                    { name: 'RSA-OAEP', hash: 'SHA-256' },
                    true,
                    ['decrypt']
                );

                this.publicKey = await crypto.subtle.importKey(
                    'jwk',
                    storedKeys.publicKey,
                    { name: 'RSA-OAEP', hash: 'SHA-256' },
                    true,
                    ['encrypt']
                );

                console.log('[Encryption] Loaded existing keys');
            } else {
                // Generate new keys
                await this.generateKeyPair();
                console.log('[Encryption] Generated new keys');
            }
        } catch (error) {
            console.error('[Encryption] Error loading keys:', error);
            // Generate new keys on error
            await this.generateKeyPair();
        }
    }

    /**
     * Generate RSA key pair for asymmetric encryption
     */
    async generateKeyPair() {
        try {
            this.keyPair = await crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: 'SHA-256'
                },
                true,
                ['encrypt', 'decrypt']
            );

            this.publicKey = this.keyPair.publicKey;
            this.privateKey = this.keyPair.privateKey;

            // Export and store keys
            const publicKeyJwk = await crypto.subtle.exportKey('jwk', this.publicKey);
            const privateKeyJwk = await crypto.subtle.exportKey('jwk', this.privateKey);

            await this.saveToDB('keys', {
                id: 'userKeys',
                publicKey: publicKeyJwk,
                privateKey: privateKeyJwk,
                createdAt: new Date().toISOString()
            });

            console.log('[Encryption] Key pair generated and stored');
        } catch (error) {
            console.error('[Encryption] Error generating key pair:', error);
            throw error;
        }
    }

    /**
     * Get public key as base64 string for sharing
     */
    async getPublicKeyString() {
        const exported = await crypto.subtle.exportKey('spki', this.publicKey);
        return this.arrayBufferToBase64(exported);
    }

    /**
     * Get private key encrypted with user password (for server storage)
     */
    async getEncryptedPrivateKey(password) {
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', this.privateKey);
        const privateKeyString = JSON.stringify(privateKeyJwk);

        // Derive key from password
        const { key: passwordKey, salt } = await this.deriveKeyFromPassword(password);

        // Generate IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt private key
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            passwordKey,
            new TextEncoder().encode(privateKeyString)
        );

        return {
            encrypted: this.arrayBufferToBase64(encrypted),
            iv: this.arrayBufferToBase64(iv),
            salt
        };
    }

    /**
     * Import public key from base64 string
     */
    async importPublicKey(publicKeyString) {
        try {
            const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyString);
            return await crypto.subtle.importKey(
                'spki',
                publicKeyBuffer,
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                true,
                ['encrypt']
            );
        } catch (error) {
            console.error('[Encryption] Error importing public key:', error);
            throw error;
        }
    }

    /**
     * Generate AES key for symmetric encryption (for messages)
     */
    async generateAESKey() {
        return await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt message content
     */
    async encryptMessage(content, recipientPublicKeyString) {
        try {
            // Generate random AES key for this message
            const aesKey = await this.generateAESKey();

            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt content with AES
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                new TextEncoder().encode(content)
            );

            // Export AES key
            const exportedAESKey = await crypto.subtle.exportKey('raw', aesKey);

            // Import recipient's public key
            const recipientPublicKey = await this.importPublicKey(recipientPublicKeyString);

            // Encrypt AES key with recipient's public key
            const encryptedAESKey = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                recipientPublicKey,
                exportedAESKey
            );

            return {
                encryptedContent: this.arrayBufferToBase64(encrypted),
                encryptedKey: this.arrayBufferToBase64(encryptedAESKey),
                iv: this.arrayBufferToBase64(iv),
                algorithm: 'AES-GCM'
            };
        } catch (error) {
            console.error('[Encryption] Error encrypting message:', error);
            throw error;
        }
    }

    /**
     * Decrypt message content
     */
    async decryptMessage(encryptedContent, encryptedKey, iv) {
        try {
            // Decrypt AES key with our private key
            const encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedKey);
            const aesKeyBuffer = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                this.privateKey,
                encryptedKeyBuffer
            );

            // Import AES key
            const aesKey = await crypto.subtle.importKey(
                'raw',
                aesKeyBuffer,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            // Decrypt content with AES key
            const ivBuffer = this.base64ToArrayBuffer(iv);
            const encryptedBuffer = this.base64ToArrayBuffer(encryptedContent);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBuffer },
                aesKey,
                encryptedBuffer
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('[Encryption] Error decrypting message:', error);
            throw error;
        }
    }

    /**
     * Encrypt file
     */
    async encryptFile(fileData) {
        try {
            // Generate random AES key for this file
            const aesKey = await this.generateAESKey();

            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt file data with AES
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                fileData
            );

            // Export AES key
            const exportedAESKey = await crypto.subtle.exportKey('raw', aesKey);

            return {
                encryptedContent: this.arrayBufferToBase64(encrypted),
                key: this.arrayBufferToBase64(exportedAESKey),
                iv: this.arrayBufferToBase64(iv)
            };
        } catch (error) {
            console.error('[Encryption] Error encrypting file:', error);
            throw error;
        }
    }

    /**
     * Decrypt file
     */
    async decryptFile(encryptedContent, key, iv) {
        try {
            // Import AES key
            const keyBuffer = this.base64ToArrayBuffer(key);
            const aesKey = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            // Decrypt content with AES key
            const ivBuffer = this.base64ToArrayBuffer(iv);
            const encryptedBuffer = this.base64ToArrayBuffer(encryptedContent);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBuffer },
                aesKey,
                encryptedBuffer
            );

            return decrypted;
        } catch (error) {
            console.error('[Encryption] Error decrypting file:', error);
            throw error;
        }
    }

    /**
     * Derive key from password using PBKDF2
     */
    async deriveKeyFromPassword(password, saltBase64 = null) {
        const encoder = new TextEncoder();

        // Use provided salt or generate new one
        const saltBuffer = saltBase64 ? this.base64ToArrayBuffer(saltBase64) : crypto.getRandomValues(new Uint8Array(16));

        // Import password as key
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Derive AES key
        const derivedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        return {
            key: derivedKey,
            salt: this.arrayBufferToBase64(saltBuffer)
        };
    }

    /**
     * Helper: Save data to IndexedDB
     */
    async saveToDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Helper: Get data from IndexedDB
     */
    async getFromDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Helper: Convert ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Helper: Convert Base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Clear all stored keys (logout)
     */
    async clearKeys() {
        try {
            const transaction = this.db.transaction(['keys', 'sessionKeys'], 'readwrite');
            await transaction.objectStore('keys').clear();
            await transaction.objectStore('sessionKeys').clear();
            this.keyPair = null;
            this.publicKey = null;
            this.privateKey = null;
            this.initialized = false;
            console.log('[Encryption] Keys cleared');
        } catch (error) {
            console.error('[Encryption] Error clearing keys:', error);
        }
    }
}

// Create global instance
const encryptionManager = new EncryptionManager();
