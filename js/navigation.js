/**
 * Unified Navigation Component
 * Ensures consistent navigation across all pages
 */

class Navigation {
    constructor() {
        this.authBtn = document.getElementById('authBtn');
        this.userMenu = document.getElementById('userMenu');
        this.username = document.getElementById('username');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.guestIndicator = document.querySelector('.guest-indicator');
        
        this.setupEventListeners();
        this.updateAuthDisplay();
    }
    
    setupEventListeners() {
        // Auth button click
        if (this.authBtn) {
            this.authBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }
        
        // Logout button click
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', async () => {
                if (typeof Auth !== 'undefined') {
                    await Auth.signOut();
                }
                localStorage.clear();
                window.location.href = 'index.html';
            });
        }
    }
    
    updateAuthDisplay() {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const currentUser = localStorage.getItem('currentUser');
        
        // Remove any "Guest User" text that might be in the navbar
        const guestUserElements = document.querySelectorAll('.nav-right span:not(.guest-indicator)');
        guestUserElements.forEach(el => {
            if (el.textContent.includes('Guest User')) {
                el.remove();
            }
        });
        
        if (isAuthenticated && currentUser) {
            // Authorized user
            this.showUserMenu(currentUser);
            this.updateGuestIndicator('Authorized User', false);
        } else if (isGuest) {
            // Guest mode
            this.showGuestMode();
            this.updateGuestIndicator('Guest Mode', true);
        } else {
            // Not logged in
            this.showLoginButton();
            this.updateGuestIndicator('', false);
        }
    }
    
    showUserMenu(userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            const displayName = userData.displayName || userData.email || 'User';
            
            if (this.authBtn) this.authBtn.style.display = 'none';
            if (this.userMenu) {
                this.userMenu.classList.remove('hidden');
                this.userMenu.style.display = 'flex';
            }
            if (this.username) {
                this.username.textContent = displayName;
            }
        } catch (e) {
            Logger.error('Error parsing user data:', e);
        }
    }
    
    showGuestMode() {
        if (this.authBtn) {
            this.authBtn.style.display = 'block';
            this.authBtn.textContent = 'Login / Sign Up';
        }
        if (this.userMenu) {
            this.userMenu.classList.add('hidden');
            this.userMenu.style.display = 'none';
        }
    }
    
    showLoginButton() {
        if (this.authBtn) {
            this.authBtn.style.display = 'block';
            this.authBtn.textContent = 'Login / Sign Up';
        }
        if (this.userMenu) {
            this.userMenu.classList.add('hidden');
            this.userMenu.style.display = 'none';
        }
    }
    
    updateGuestIndicator(text, isGuest) {
        if (this.guestIndicator) {
            if (text) {
                this.guestIndicator.textContent = text;
                this.guestIndicator.classList.remove('hidden');
                this.guestIndicator.style.display = 'inline-block';
                
                // Style based on status
                if (isGuest) {
                    this.guestIndicator.style.color = '#f59e0b'; // Orange for guest
                    this.guestIndicator.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                    this.guestIndicator.style.padding = '4px 12px';
                    this.guestIndicator.style.borderRadius = '4px';
                    this.guestIndicator.style.fontSize = '14px';
                    this.guestIndicator.style.marginRight = '12px';
                } else {
                    this.guestIndicator.style.color = '#10b981'; // Green for authorized
                    this.guestIndicator.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    this.guestIndicator.style.padding = '4px 12px';
                    this.guestIndicator.style.borderRadius = '4px';
                    this.guestIndicator.style.fontSize = '14px';
                    this.guestIndicator.style.marginRight = '12px';
                }
            } else {
                this.guestIndicator.classList.add('hidden');
                this.guestIndicator.style.display = 'none';
            }
        }
    }
}

// Initialize navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
});

// Update navigation when auth state changes
window.addEventListener('auth-state-changed', () => {
    if (window.navigation) {
        window.navigation.updateAuthDisplay();
    }
});

// Also listen for storage changes (cross-tab updates)
window.addEventListener('storage', (e) => {
    if (e.key === 'isAuthenticated' || e.key === 'guestMode' || e.key === 'currentUser') {
        if (window.navigation) {
            window.navigation.updateAuthDisplay();
        }
    }
});