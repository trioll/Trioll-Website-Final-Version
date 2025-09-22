// Trioll Authentication Service
class TriollAuth {
    constructor() {
        this.user = null;
        this.isGuest = false; // Default to not guest
        this.guestId = null;
    }

    async initialize() {
        // Initialize authentication
        Logger.log('🔐 Initializing Auth service...');
        
        // ALWAYS set platform to PC for web
        localStorage.setItem('userPlatform', 'PC');
        
        // Check for existing guest session
        const existingGuestId = localStorage.getItem('trioll_guest_id');
        if (existingGuestId) {
            // Activate existing guest session if marked as active
            const guestActive = localStorage.getItem('trioll_guest_active');
            if (guestActive === 'true') {
                this.guestId = existingGuestId;
                this.isGuest = true;
                this.updateUI();
                return; // Guest is active
            }
        }

        // Check if running on file:// protocol
        if (window.location.protocol === 'file:') {
            Logger.warn('⚠️ Running on file:// protocol - activating guest mode');
            this.setupGuestMode();
            return;
        }

        // Setup Cognito authentication if available
        if (typeof window.setupCognitoAuth === 'function') {
            const cognitoReady = window.setupCognitoAuth();
            if (!cognitoReady) {
                Logger.warn('Cognito setup failed - activating guest mode');
                this.setupGuestMode();
            }
        } else {
            // No auth service available - use guest mode
            Logger.warn('No authentication service available - activating guest mode');
            this.setupGuestMode();
        }
    }

    getCurrentUser() {
        // Return current user object
        if (this.user) {
            return this.user;
        }
        
        // Try to get from localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                return null;
            }
        }
        
        // Return guest user if in guest mode
        if (this.isGuest && this.guestId) {
            return {
                userId: this.guestId,
                displayName: `Guest${this.guestId.slice(-6)}`,
                isGuest: true
            };
        }
        
        return null;
    }

    setupGuestMode() {
        // Get or create guest ID
        let guestId = localStorage.getItem('trioll_guest_id');
        if (!guestId) {
            guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('trioll_guest_id', guestId);
            
            // Track new guest user
            if (typeof Analytics !== 'undefined') {
                Analytics.track('guest_user_created', {
                    guestId,
                    source: 'web',
                    platform: 'browser'
                });
            }
        }
        
        this.guestId = guestId;
        this.isGuest = true; // Activate guest mode
        localStorage.setItem('trioll_guest_active', 'true'); // Mark guest as active
        this.updateUI();
    }

    async signIn(email, password) {
        // Placeholder - will be overridden by cognito-auth.js
        return { success: false, error: 'Authentication service not initialized' };
    }

    async signUp(email, password) {
        // Placeholder - will be overridden by cognito-auth.js
        return { success: false, error: 'Authentication service not initialized' };
    }

    async signOut() {
        // Placeholder - will be overridden by cognito-auth.js
        // Clear everything including guest session
        this.user = null;
        this.isGuest = false;
        this.guestId = null;
        
        // Clear guest data from storage
        localStorage.removeItem('trioll_guest_id');
        localStorage.removeItem('trioll_guest_active');
        
        // Clear API cache
        if (typeof API !== 'undefined') {
            API.clearCache();
        }
    }
    
    // Helper to clear all sessions (for debugging)
    clearAllSessions() {
        localStorage.removeItem('trioll_guest_id');
        localStorage.removeItem('trioll_guest_active');
        localStorage.removeItem('rememberedEmail');
        this.user = null;
        this.isGuest = false;
        this.guestId = null;
    }

    async getIdToken() {
        // Placeholder - will be overridden by cognito-auth.js
        return null;
    }

    getGuestId() {
        return this.guestId;
    }

    async getAccessToken() {
        // Placeholder - will be overridden by cognito-auth.js
        return null;
    }

    async refreshSession() {
        // Placeholder - will be overridden by cognito-auth.js
        return null;
    }

    getCurrentUserId() {
        if (this.user) {
            return this.user.username || this.user.attributes?.sub;
        }
        return this.guestId;
    }

    async mergeGuestData() {
        // This would call a backend endpoint to merge guest data
        // For now, just log the intent
        Logger.log('Would merge guest data:', this.guestId);
        
        // Clear guest ID after merge
        localStorage.removeItem('trioll_guest_id');
        this.guestId = null;
    }

    updateUI() {
        // Update navigation based on auth state
        const authBtn = document.getElementById('authBtn');
        const userMenu = document.getElementById('userMenu');
        const username = document.getElementById('username');

        if (!authBtn || !userMenu) return; // Elements might not exist on all pages

        if (this.user && !this.isGuest) {
            // Authenticated user - show user menu with logout
            authBtn.classList.add('hidden');
            userMenu.classList.remove('hidden');
            if (username) {
                username.textContent = this.user.attributes?.email || 'User';
            }
        } else if (this.isGuest) {
            // Guest user - show login button, no logout option
            authBtn.classList.remove('hidden');
            authBtn.textContent = 'Login / Sign Up';
            userMenu.classList.add('hidden');
        } else {
            // No session - show login button
            authBtn.classList.remove('hidden');
            authBtn.textContent = 'Login';
            userMenu.classList.add('hidden');
        }

        // Update any guest mode indicators
        const guestIndicators = document.querySelectorAll('.guest-indicator');
        guestIndicators.forEach(indicator => {
            if (this.isGuest) {
                indicator.classList.remove('hidden');
                indicator.textContent = 'Guest Mode';
            } else {
                indicator.classList.add('hidden');
            }
        });
    }

    // Utility methods
    isAuthenticated() {
        return !this.isGuest && this.user !== null;
    }

    async checkEmailVerified() {
        // Placeholder - will be overridden by cognito-auth.js if needed
        return false;
    }

    async resendVerificationCode(email) {
        // Placeholder - will be overridden by cognito-auth.js if needed
        return { success: false, error: 'Authentication service not available' };
    }

    async confirmSignUp(email, code) {
        // Placeholder - will be overridden by cognito-auth.js if needed
        return { success: false, error: 'Authentication service not available' };
    }
}

// Create singleton instance and expose globally
const Auth = new TriollAuth();

// Make Auth available globally
window.Auth = Auth;