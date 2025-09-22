// Trioll Web Platform Configuration
const Config = {
    // API Configuration
    API_BASE_URL: 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod',
    
    // AWS Configuration
    AWS_REGION: 'us-east-1',
    USER_POOL_ID: 'us-east-1_cLPH2acQd',
    USER_POOL_WEB_CLIENT_ID: '2pp1r86dvfqbbu5fe0b1od3m07', // Dedicated web platform client ✅ Confirmed in Identity Pool
    IDENTITY_POOL_ID: 'us-east-1:c740f334-5bd2-43c6-85b9-48bfebf27268',
    
    // S3 Configuration
    S3_GAMES_BUCKET: 'trioll-prod-games-us-east-1',
    S3_UPLOADS_BUCKET: 'trioll-prod-uploads-us-east-1',
    
    // CloudFront CDNs
    GAME_CDN_URL: 'https://dk72g9i0333mv.cloudfront.net', // Legacy CDN is the working one
    LEGACY_CDN_URL: 'https://dk72g9i0333mv.cloudfront.net',
    
    // Analytics Configuration
    ANALYTICS_BATCH_SIZE: 10,
    ANALYTICS_FLUSH_INTERVAL: 30000, // 30 seconds
    
    // Game Loading Configuration
    GAME_LOAD_TIMEOUT: 30000, // 30 seconds
    LOADING_TIPS: [
        "Tip: Press F11 for fullscreen gaming!",
        "Tip: Create an account to save your progress",
        "Tip: Rate games to help others discover them",
        "Tip: Use arrow keys or WASD for most games",
        "Tip: Try different categories to find your favorite games",
        "Tip: Share games with friends to play together",
        "Tip: Check back daily for new games!"
    ],
    
    // Google OAuth Configuration
    GOOGLE_CLIENT_ID: '103938901421-brg5jrafqc2vchfce6js6k4biebcq9nn.apps.googleusercontent.com',
    
    // Feature Flags
    FEATURES: {
        ENABLE_ADS: false, // TODO: Enable when ads are integrated
        ENABLE_UNITY_SUPPORT: true,
        ENABLE_GODOT_SUPPORT: false, // TODO: Enable when tested
        ENABLE_CONSTRUCT_SUPPORT: false, // TODO: Enable when tested
        ENABLE_GUEST_MODE: true,
        ENABLE_SOCIAL_SHARING: true,
        ENABLE_PURCHASE_INTENT: true,
        SHOW_DEVELOPER_INFO: true
    },
    
    // Compatibility Thresholds
    COMPATIBILITY: {
        MIN_WEBGL_VERSION: 2,
        MIN_SCREEN_WIDTH: 1024,
        MIN_SCREEN_HEIGHT: 600,
        REQUIRED_APIS: ['WebGL', 'WebAudio', 'LocalStorage']
    },
    
    // UI Configuration
    UI: {
        GAMES_PER_PAGE: 12,
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 3000,
        MODAL_BACKDROP_OPACITY: 0.7
    },
    
    // Logging Configuration
    LOG_LEVEL: 'info', // debug, info, warn, error
    LOG_IN_PRODUCTION: false
};

// Environment detection
if (window.location.protocol === 'file:') {
    Config.ENV = 'local-file';
    // Keep production API for file:// protocol but warn about CORS
    if (typeof Logger !== 'undefined') {
        Logger.warn('⚠️ Running from file:// protocol. Some features may not work due to CORS restrictions.');
        Logger.warn('💡 To test properly, use a local web server:');
        Logger.warn('   Option 1: python3 -m http.server 8000');
        Logger.warn('   Option 2: npx serve .');
        Logger.warn('   Option 3: Live Server VS Code extension');
    }
} else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    Config.ENV = 'development';
    // Use production API for now since local dev server isn't set up
    Config.FEATURES.ENABLE_ADS = false;
} else if (window.location.hostname === 'play.trioll.com') {
    Config.ENV = 'production';
} else {
    Config.ENV = 'staging';
}

// Freeze config to prevent modifications
Object.freeze(Config);
Object.freeze(Config.FEATURES);
Object.freeze(Config.COMPATIBILITY);
Object.freeze(Config.UI);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}