/**
 * Service Worker Registration
 * Register PWA service worker for offline support
 */

(function() {
    'use strict';

    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            registerServiceWorker();
        });
    }

    /**
     * Register service worker
     */
    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });

            console.log('[SW] Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[SW] Update found, installing new version...');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available
                        console.log('[SW] New version available');
                        showUpdateNotification();
                    }
                });
            });

            // Check for updates every hour
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000);

        } catch (error) {
            console.error('[SW] Registration failed:', error);
        }
    }

    /**
     * Show update notification to user
     */
    function showUpdateNotification() {
        const notification = document.createElement('div');
        notification.id = 'sw-update-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #3b82f6;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <span>A new version is available!</span>
                <button onclick="window.location.reload()" style="
                    background: white;
                    color: #3b82f6;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 600;
                ">Reload</button>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                ">Later</button>
            </div>
        `;
        document.body.appendChild(notification);

        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            if (document.getElementById('sw-update-notification')) {
                notification.remove();
            }
        }, 30000);
    }

    /**
     * Check if app is installed as PWA
     */
    function isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    /**
     * Show install prompt
     */
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing
        e.preventDefault();
        // Save the event for later
        deferredPrompt = e;
        // Show custom install button
        showInstallButton();
    });

    function showInstallButton() {
        // Only show if not already installed
        if (isPWA()) return;

        const installButton = document.createElement('button');
        installButton.id = 'pwa-install-button';
        installButton.innerHTML = '📱 Install App';
        installButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            transition: transform 0.2s;
        `;

        installButton.addEventListener('mouseover', () => {
            installButton.style.transform = 'scale(1.05)';
        });

        installButton.addEventListener('mouseout', () => {
            installButton.style.transform = 'scale(1)';
        });

        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user's response
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[SW] Install prompt outcome:', outcome);

            // Clear the deferred prompt
            deferredPrompt = null;

            // Remove the install button
            installButton.remove();
        });

        // Don't show immediately, wait a bit
        setTimeout(() => {
            document.body.appendChild(installButton);
        }, 5000);
    }

    // Handle app installed event
    window.addEventListener('appinstalled', () => {
        console.log('[SW] App installed successfully');
        deferredPrompt = null;
        
        // Remove install button if it exists
        const installButton = document.getElementById('pwa-install-button');
        if (installButton) {
            installButton.remove();
        }
    });

    // Expose utility functions
    window.overmindPWA = {
        isPWA,
        updateServiceWorker: () => {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            }
        },
        clearCache: async () => {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.active) {
                const messageChannel = new MessageChannel();
                return new Promise((resolve) => {
                    messageChannel.port1.onmessage = (event) => {
                        resolve(event.data.success);
                    };
                    registration.active.postMessage(
                        { type: 'CLEAR_CACHE' },
                        [messageChannel.port2]
                    );
                });
            }
        },
        getVersion: async () => {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.active) {
                const messageChannel = new MessageChannel();
                return new Promise((resolve) => {
                    messageChannel.port1.onmessage = (event) => {
                        resolve(event.data.version);
                    };
                    registration.active.postMessage(
                        { type: 'GET_VERSION' },
                        [messageChannel.port2]
                    );
                });
            }
        }
    };

})();
