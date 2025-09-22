// Cognito Auth Wrapper - handles authentication without Amplify
// This replaces the Amplify dependency with direct Cognito SDK usage

window.setupCognitoAuth = function() {
    // Check if Cognito SDK is loaded
    if (typeof AmazonCognitoIdentity === 'undefined') {
        Logger.warn('Amazon Cognito SDK not loaded, auth features will be limited');
        return false;
    }
    
    // Create CognitoUserPool instance
    const poolData = {
        UserPoolId: Config.USER_POOL_ID,
        ClientId: Config.USER_POOL_WEB_CLIENT_ID
    };
    
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    
    // Extend Auth object with Cognito methods
    const originalSignIn = Auth.signIn.bind(Auth);
    const originalSignUp = Auth.signUp.bind(Auth);
    const originalSignOut = Auth.signOut.bind(Auth);
    const originalGetIdToken = Auth.getIdToken.bind(Auth);
    const originalGetAccessToken = Auth.getAccessToken.bind(Auth);
    
    // Override signIn method
    Auth.signIn = async function(email, password) {
        try {
            const authenticationData = {
                Username: email,
                Password: password
            };
            
            const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
            
            const userData = {
                Username: email,
                Pool: userPool
            };
            
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            
            return new Promise((resolve, reject) => {
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: async (result) => {
                        // Get user attributes
                        cognitoUser.getUserAttributes((err, attributes) => {
                            if (!err && attributes) {
                                Auth.user = {
                                    username: cognitoUser.getUsername(),
                                    attributes: attributes.reduce((acc, attr) => {
                                        acc[attr.getName()] = attr.getValue();
                                        return acc;
                                    }, {})
                                };
                                Auth.isGuest = false;
                                Auth.cognitoUser = cognitoUser;
                                Auth.updateUI();
                                
                                // Track login
                                if (typeof Analytics !== 'undefined') {
                                    Analytics.track('user_login', {
                                        method: 'email',
                                        platform: 'pc'
                                    });
                                }
                                
                                resolve({ success: true });
                            } else {
                                resolve({ success: true });
                            }
                        });
                    },
                    onFailure: (err) => {
                        Logger.error('Authentication failed:', err);
                        
                        // Check for specific error types
                        if (err.code === 'UserNotConfirmedException' || err.name === 'UserNotConfirmedException') {
                            resolve({ 
                                success: false, 
                                error: 'Account not confirmed. Please check your email for verification code.',
                                needsConfirmation: true,
                                email: email
                            });
                        } else {
                            resolve({ success: false, error: err.message || 'Invalid credentials' });
                        }
                    }
                });
            });
        } catch (error) {
            Logger.error('Sign in error:', error);
            return { success: false, error: error.message || 'Login failed' };
        }
    };
    
    // Override signUp method
    Auth.signUp = async function(email, password) {
        try {
            const attributeList = [];
            const dataEmail = {
                Name: 'email',
                Value: email
            };
            
            const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
            attributeList.push(attributeEmail);
            
            return new Promise((resolve) => {
                userPool.signUp(email, password, attributeList, null, (err, result) => {
                    if (err) {
                        Logger.error('Sign up error:', err);
                        resolve({ success: false, error: err.message || 'Signup failed' });
                    } else {
                        // Track signup
                        if (typeof Analytics !== 'undefined') {
                            Analytics.track('user_signup', {
                                method: 'email',
                                platform: 'pc'
                            });
                        }
                        
                        resolve({ 
                            success: true, 
                            message: 'Account created! Please check your email to verify.',
                            needsVerification: true 
                        });
                    }
                });
            });
        } catch (error) {
            Logger.error('Sign up error:', error);
            return { success: false, error: error.message || 'Signup failed' };
        }
    };
    
    // Override signOut method
    Auth.signOut = async function() {
        if (Auth.cognitoUser) {
            Auth.cognitoUser.signOut();
        }
        
        // Clear everything
        Auth.user = null;
        Auth.isGuest = false;
        Auth.guestId = null;
        Auth.cognitoUser = null;
        
        // Clear guest data from storage
        localStorage.removeItem('trioll_guest_id');
        localStorage.removeItem('trioll_guest_active');
        
        // Clear API cache
        if (typeof API !== 'undefined') {
            API.clearCache();
        }
        
        Auth.updateUI();
    };
    
    // Override getIdToken method
    Auth.getIdToken = async function() {
        if (Auth.cognitoUser) {
            return new Promise((resolve) => {
                Auth.cognitoUser.getSession((err, session) => {
                    if (err || !session) {
                        resolve(null);
                    } else {
                        resolve(session.getIdToken().getJwtToken());
                    }
                });
            });
        }
        return null;
    };
    
    // Override getAccessToken method
    Auth.getAccessToken = async function() {
        if (Auth.cognitoUser) {
            return new Promise((resolve) => {
                Auth.cognitoUser.getSession((err, session) => {
                    if (err || !session) {
                        resolve(null);
                    } else {
                        resolve(session.getAccessToken().getJwtToken());
                    }
                });
            });
        }
        return null;
    };
    
    // Override confirmSignUp method
    Auth.confirmSignUp = async function(email, code) {
        try {
            const userData = {
                Username: email,
                Pool: userPool
            };
            
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            
            return new Promise((resolve) => {
                cognitoUser.confirmRegistration(code, true, (err, result) => {
                    if (err) {
                        Logger.error('Verification error:', err);
                        resolve({ success: false, error: err.message || 'Verification failed' });
                    } else {
                        Logger.log('Verification successful:', result);
                        resolve({ success: true, message: 'Email verified successfully!' });
                    }
                });
            });
        } catch (error) {
            Logger.error('Confirm signup error:', error);
            return { success: false, error: error.message || 'Verification failed' };
        }
    };
    
    // Override resendVerificationCode method
    Auth.resendVerificationCode = async function(email) {
        try {
            const userData = {
                Username: email,
                Pool: userPool
            };
            
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            
            return new Promise((resolve) => {
                cognitoUser.resendConfirmationCode((err, result) => {
                    if (err) {
                        Logger.error('Resend code error:', err);
                        resolve({ success: false, error: err.message || 'Failed to resend code' });
                    } else {
                        Logger.log('Code resent:', result);
                        resolve({ success: true, message: 'Verification code sent!' });
                    }
                });
            });
        } catch (error) {
            Logger.error('Resend code error:', error);
            return { success: false, error: error.message || 'Failed to resend code' };
        }
    };
    
    // Check for existing session
    const checkExistingSession = function() {
        const cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser) {
            cognitoUser.getSession((err, session) => {
                if (!err && session && session.isValid()) {
                    // Get user attributes
                    cognitoUser.getUserAttributes((err, attributes) => {
                        if (!err && attributes) {
                            Auth.user = {
                                username: cognitoUser.getUsername(),
                                attributes: attributes.reduce((acc, attr) => {
                                    acc[attr.getName()] = attr.getValue();
                                    return acc;
                                }, {})
                            };
                            Auth.isGuest = false;
                            Auth.cognitoUser = cognitoUser;
                            Auth.updateUI();
                        }
                    });
                }
            });
        }
    };
    
    // Check for existing session on load
    checkExistingSession();
    
    return true;
};

// Auto-setup when Cognito SDK and Config are ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Config to load
    setTimeout(function() {
        if (typeof AmazonCognitoIdentity !== 'undefined' && typeof Config !== 'undefined') {
            window.setupCognitoAuth();
        }
    }, 100);
});