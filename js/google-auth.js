// Google Authentication Service for Trioll Web Platform
class GoogleAuthService {
    constructor() {
        this.initialized = false;
        this.clientId = Config.GOOGLE_CLIENT_ID;
        this.googleUser = null;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Load Google Sign-In API
            await this.loadGoogleScript();
            
            // Initialize Google Sign-In
            google.accounts.id.initialize({
                client_id: this.clientId,
                callback: this.handleCredentialResponse.bind(this),
                auto_select: false,
                cancel_on_tap_outside: true,
            });
            
            this.initialized = true;
            Logger.log('✅ Google Sign-In initialized');
            
            // Dispatch custom event when initialized
            window.dispatchEvent(new CustomEvent('google-signin-ready'));
            
        } catch (error) {
            Logger.error('Failed to initialize Google Sign-In:', error);
            throw error;
        }
    }

    // Load Google Sign-In script
    loadGoogleScript() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined' && google.accounts) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Render Google Sign-In button
    renderButton(elementId, options = {}) {
        if (!this.initialized) {
            Logger.error('Google Sign-In not initialized');
            return;
        }

        const defaultOptions = {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 250
        };

        google.accounts.id.renderButton(
            document.getElementById(elementId),
            { ...defaultOptions, ...options }
        );
    }

    // Handle credential response from Google
    async handleCredentialResponse(response) {
        try {
            Logger.log('🔐 Received Google credential');
            
            // The credential is a JWT token from Google
            const credential = response.credential;
            
            // Decode the JWT to get user info (for display purposes)
            const userInfo = this.decodeJwtToken(credential);
            Logger.log('Google user info:', userInfo);
            
            // Exchange Google token for AWS Cognito credentials
            await this.exchangeForCognitoCredentials(credential, userInfo);
            
            // Track sign-in event
            if (typeof Analytics !== 'undefined') {
                Analytics.track('auth_signin', {
                    method: 'google',
                    platform: 'pc',
                    app_source: 'web',
                    email: userInfo.email
                });
            }
            
            // Redirect to games page after successful login
            window.location.href = 'games.html';
            
        } catch (error) {
            Logger.error('Google Sign-In failed:', error);
            alert('Sign-in failed. Please try again.');
        }
    }

    // Exchange Google token for Cognito credentials
    async exchangeForCognitoCredentials(googleToken, userInfo) {
        try {
            // Configure AWS SDK
            AWS.config.region = Config.AWS_REGION;
            
            // Create credentials with Google token
            const logins = {
                'accounts.google.com': googleToken
            };
            
            // Get Cognito Identity credentials
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: Config.IDENTITY_POOL_ID,
                Logins: logins
            });
            
            // Get the credentials
            await AWS.config.credentials.getPromise();
            
            // Create or update user profile
            await this.createOrUpdateUserProfile(userInfo);
            
            // Store authentication state
            this.storeAuthState(userInfo, AWS.config.credentials);
            
            Logger.log('✅ Successfully authenticated with Cognito');
            
        } catch (error) {
            Logger.error('Failed to exchange Google token:', error);
            throw error;
        }
    }

    // Create or update user profile
    async createOrUpdateUserProfile(googleProfile) {
        try {
            const userId = `google_${googleProfile.sub}`;
            
            // Check if user exists
            const existingUser = await this.checkUserExists(userId);
            
            const userData = {
                userId: userId,
                email: googleProfile.email,
                name: googleProfile.name,
                picture: googleProfile.picture,
                authMethod: 'google',
                platform: 'pc',
                lastLogin: new Date().toISOString()
            };
            
            if (existingUser) {
                // Update existing user
                await API.updateUser(userId, {
                    lastLogin: userData.lastLogin,
                    platform: userData.platform
                });
                Logger.log('✅ Updated existing user profile');
            } else {
                // Create new user
                await API.createUser(userData);
                Logger.log('✅ Created new user profile');
                
                // Track new user
                if (typeof Analytics !== 'undefined') {
                    Analytics.track('auth_signup', {
                        method: 'google',
                        platform: 'pc',
                        app_source: 'web'
                    });
                }
            }
            
        } catch (error) {
            Logger.error('Failed to create/update user profile:', error);
            // Don't throw - allow login to continue even if profile update fails
        }
    }

    // Check if user exists
    async checkUserExists(userId) {
        try {
            const response = await API.getUser(userId);
            return response && response.user;
        } catch (error) {
            // User doesn't exist
            return false;
        }
    }

    // Store authentication state
    storeAuthState(userInfo, credentials) {
        const authData = {
            userId: `google_${userInfo.sub}`,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            authMethod: 'google',
            identityId: credentials.identityId,
            accessKeyId: credentials.accessKeyId,
            sessionToken: credentials.sessionToken,
            expiration: credentials.expireTime.toISOString()
        };
        
        // Store in localStorage
        localStorage.setItem('trioll_auth', JSON.stringify(authData));
        localStorage.setItem('trioll_user', JSON.stringify({
            userId: authData.userId,
            email: authData.email,
            name: authData.name,
            picture: authData.picture
        }));
        
        // Update Auth service state
        if (typeof Auth !== 'undefined') {
            Auth.currentUser = authData;
            Auth.isAuthenticated = true;
        }
    }

    // Decode JWT token (for getting user info)
    decodeJwtToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            Logger.error('Failed to decode JWT token:', error);
            throw error;
        }
    }

    // Sign out
    async signOut() {
        try {
            // Revoke Google access
            if (google.accounts && google.accounts.id) {
                google.accounts.id.disableAutoSelect();
            }
            
            // Clear AWS credentials
            if (AWS.config.credentials) {
                AWS.config.credentials.clearCachedId();
            }
            
            // Clear local storage
            localStorage.removeItem('trioll_auth');
            localStorage.removeItem('trioll_user');
            
            // Update Auth service state
            if (typeof Auth !== 'undefined') {
                Auth.currentUser = null;
                Auth.isAuthenticated = false;
            }
            
            Logger.log('✅ Signed out successfully');
            
        } catch (error) {
            Logger.error('Error during sign out:', error);
        }
    }

    // Prompt for Google Sign-In
    prompt() {
        if (!this.initialized) {
            Logger.error('Google Sign-In not initialized');
            return;
        }
        
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // The prompt was not displayed or was skipped
                Logger.log('Google Sign-In prompt was not displayed or skipped');
            }
        });
    }
}

// Create global instance
const GoogleAuth = new GoogleAuthService();

// Initialize when ready
document.addEventListener('DOMContentLoaded', async () => {
    if (Config.GOOGLE_CLIENT_ID) {
        try {
            await GoogleAuth.initialize();
        } catch (error) {
            Logger.warn('Google Sign-In initialization failed:', error);
        }
    }
});