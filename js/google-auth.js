// Google Authentication Service for Trioll Web Platform
class GoogleAuthService {
    constructor() {
        this.initialized = false;
        this.clientId = Config.GOOGLE_CLIENT_ID;
        this.googleUser = null;
    }

    async initialize() {
        if (this.initialized) return;

        console.log('Starting Google Sign-In initialization...');
        console.log('Client ID:', this.clientId);

        try {
            // Load Google Sign-In API
            await this.loadGoogleScript();
            console.log('Google script loaded');
            
            // Check if google object exists
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
                throw new Error('Google Sign-In API not loaded properly');
            }
            
            // Initialize Google Sign-In
            try {
                google.accounts.id.initialize({
                    client_id: this.clientId,
                    callback: this.handleCredentialResponse.bind(this),
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    use_fedcm_for_prompt: false // Disable FedCM to avoid issues
                });
                console.log('Google Sign-In initialized with client ID:', this.clientId);
            } catch (initError) {
                console.error('Error calling google.accounts.id.initialize:', initError);
                throw initError;
            }
            
            this.initialized = true;
            console.log('Google Sign-In initialized successfully');
            Logger.log('✅ Google Sign-In initialized');
            
            // Dispatch custom event when initialized
            window.dispatchEvent(new CustomEvent('google-signin-ready'));
            
        } catch (error) {
            console.error('Failed to initialize Google Sign-In:', error);
            Logger.error('Failed to initialize Google Sign-In:', error);
            this.initialized = false;
            throw error;
        }
    }

    // Load Google Sign-In script
    loadGoogleScript() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                console.log('Google Sign-In script already loaded');
                resolve();
                return;
            }

            // Check if script is already in DOM
            const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
            if (existingScript) {
                console.log('Google Sign-In script tag exists, waiting for load...');
                // Wait for it to load
                const checkGoogle = setInterval(() => {
                    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                        clearInterval(checkGoogle);
                        console.log('Google Sign-In script loaded');
                        resolve();
                    }
                }, 100);
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkGoogle);
                    reject(new Error('Google Sign-In script load timeout'));
                }, 5000);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log('Google Sign-In script loaded via onload');
                resolve();
            };
            script.onerror = (error) => {
                console.error('Failed to load Google Sign-In script:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    // Render Google Sign-In button
    renderButton(elementId, options = {}) {
        console.log(`Rendering Google button for element: ${elementId}`);
        
        if (!this.initialized) {
            console.error('Google Sign-In not initialized');
            Logger.error('Google Sign-In not initialized');
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element ${elementId} not found`);
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

        const finalOptions = { ...defaultOptions, ...options };
        console.log('Rendering with options:', finalOptions);

        try {
            google.accounts.id.renderButton(element, finalOptions);
            console.log(`Button rendered successfully for ${elementId}`);
        } catch (error) {
            console.error(`Failed to render button for ${elementId}:`, error);
            element.innerHTML = '<div style="color: red;">Failed to load Google Sign-In</div>';
        }
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
        console.log('Google Sign-In prompt requested');
        console.log('Initialized?', this.initialized);
        
        if (!this.initialized) {
            console.error('Google Sign-In not initialized');
            Logger.error('Google Sign-In not initialized');
            
            // Try to initialize now
            this.initialize().then(() => {
                if (this.initialized) {
                    this.prompt(); // Retry
                }
            }).catch(error => {
                console.error('Failed to initialize for prompt:', error);
                alert('Google Sign-In is currently unavailable. Please use email login instead.');
            });
            return;
        }
        
        try {
            google.accounts.id.prompt((notification) => {
                console.log('Prompt notification:', notification);
                
                if (notification.isNotDisplayed()) {
                    console.log('Prompt not displayed. Reason:', notification.getNotDisplayedReason());
                    
                    // Show custom button as fallback
                    const reason = notification.getNotDisplayedReason();
                    if (reason === 'suppressed_by_user' || reason === 'opt_out_or_no_session') {
                        // Try to show the One Tap button in a different way
                        alert('Please enable third-party cookies or try using the standard Google Sign-In button.');
                    }
                }
                
                if (notification.isSkippedMoment()) {
                    console.log('Prompt was skipped');
                    Logger.log('Google Sign-In prompt was skipped');
                }
            });
        } catch (error) {
            console.error('Error showing Google prompt:', error);
            alert('Unable to show Google Sign-In. Please check your browser settings and try again.');
        }
    }
}

// Create global instance
const GoogleAuth = new GoogleAuthService();

// Initialize when ready
async function initializeGoogleAuth() {
    console.log('Checking Google Sign-In initialization...');
    console.log('Config loaded?', typeof Config !== 'undefined');
    console.log('Google Client ID:', Config?.GOOGLE_CLIENT_ID);
    
    // Wait for Config to be available
    let attempts = 0;
    while (!window.Config && attempts < 20) {
        console.log('Waiting for Config to load...');
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (Config && Config.GOOGLE_CLIENT_ID) {
        try {
            await GoogleAuth.initialize();
        } catch (error) {
            console.error('Google Sign-In initialization failed:', error);
            Logger.warn('Google Sign-In initialization failed:', error);
            
            // Show fallback buttons immediately
            const fallbackButtons = document.querySelectorAll('.btn-google, .btn-google-signup');
            fallbackButtons.forEach(btn => {
                if (btn) btn.style.display = 'flex';
            });
        }
    } else {
        console.warn('Google Client ID not found in Config after waiting');
        Logger.warn('Google Client ID not found in Config');
        
        // Show fallback buttons
        const fallbackButtons = document.querySelectorAll('.btn-google, .btn-google-signup');
        fallbackButtons.forEach(btn => {
            if (btn) btn.style.display = 'flex';
        });
    }
}

// Try multiple initialization strategies
document.addEventListener('DOMContentLoaded', initializeGoogleAuth);
window.addEventListener('load', () => {
    // Try again on window load if not already initialized
    if (!GoogleAuth.initialized) {
        initializeGoogleAuth();
    }
});

// Also try when Config is loaded (in case it loads late)
if (typeof Config !== 'undefined' && Config.GOOGLE_CLIENT_ID && !GoogleAuth.initialized) {
    initializeGoogleAuth();
}