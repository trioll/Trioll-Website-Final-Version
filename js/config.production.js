// Production Configuration for trioll.com
// This file should replace config.js when deploying to production

const Config = {
    // Production URLs
    BASE_URL: 'https://trioll.com',
    API_BASE_URL: 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod',
    
    // AWS Configuration (same for all environments)
    AWS_REGION: 'us-east-1',
    USER_POOL_ID: 'us-east-1_cLPH2acQd',
    CLIENT_ID: '18n9m9cq57f4v1l2s872vr4fqf',
    IDENTITY_POOL_ID: 'us-east-1:c740f334-5bd2-43c6-85b9-48bfebf27268',
    
    // Game CDN URLs (production)
    CDN_BASE_URL: 'https://d2wg7sn99og2se.cloudfront.net',
    LEGACY_CDN_URL: 'https://dgq2nqysbn2z3.cloudfront.net',
    S3_GAMES_URL: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com',
    
    // OAuth Configuration
    GOOGLE_CLIENT_ID: '103938901421-brg5jrafqc2vchfce6js6k4biebcq9nn.apps.googleusercontent.com',
    OAUTH_REDIRECT_URI: 'https://trioll.com/auth-callback.html',
    
    // Feature Flags
    ENABLE_GOOGLE_SIGNIN: true, // Google Client ID is now configured
    ENABLE_DEBUG_MODE: false, // Disable in production
    ENABLE_ANALYTICS: true,
    
    // Platform Settings
    PLATFORM: 'web',
    PLATFORM_VERSION: '1.0.0',
    
    // Session Configuration  
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    REMEMBER_ME_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
    
    // API Settings
    API_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    
    // Cache Configuration
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    
    // Analytics Settings
    ANALYTICS_BATCH_SIZE: 10,
    ANALYTICS_FLUSH_INTERVAL: 30000, // 30 seconds
    
    // Security Settings
    REQUIRE_HTTPS: true,
    SECURE_COOKIES: true,
    
    // URLs for different subdomains (if using)
    ALTERNATIVE_URLS: {
        play: 'https://play.trioll.com',
        www: 'https://www.trioll.com',
        api: 'https://api.trioll.com' // Future API subdomain
    },
    
    // Error Tracking (optional - add your service)
    ERROR_TRACKING: {
        enabled: false,
        service: '', // 'sentry', 'bugsnag', etc.
        apiKey: ''
    },
    
    // Development/Staging Detection
    isDevelopment: function() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    },
    
    isStaging: function() {
        return window.location.hostname.includes('staging') ||
               window.location.hostname.includes('dev.');
    },
    
    isProduction: function() {
        return !this.isDevelopment() && !this.isStaging();
    },
    
    // Get appropriate base URL based on environment
    getBaseURL: function() {
        if (this.isDevelopment()) {
            return window.location.protocol + '//' + window.location.host;
        }
        return this.BASE_URL;
    },
    
    // Get OAuth redirect URI based on environment
    getOAuthRedirectURI: function() {
        if (this.isDevelopment()) {
            return window.location.protocol + '//' + window.location.host + '/auth-callback.html';
        }
        return this.OAUTH_REDIRECT_URI;
    }
};

// Freeze config to prevent modifications
Object.freeze(Config);

// Make available globally
window.Config = Config;