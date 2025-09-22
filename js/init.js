// Trioll Web Platform Initialization Script
// This ensures all services are loaded in the correct order

(async function() {
    Logger.log('🚀 Trioll Web Platform initializing...');
    
    try {
        // Step 1: Wait for Amplify to load
        if (window.AmplifyLoadPromise) {
            await window.AmplifyLoadPromise;
            Logger.log('✅ Amplify loaded');
        } else {
            Logger.warn('⚠️ AmplifyLoadPromise not found, checking Amplify directly');
        }
        
        // Step 2: Check if Amplify is available (optional)
        if (typeof Amplify === 'undefined') {
            Logger.warn('⚠️ Amplify not available - continuing without authentication features');
            // Don't throw error - let platform work in guest mode
        }
        
        // Step 3: Initialize Auth service
        if (window.Auth && typeof window.Auth.initialize === 'function') {
            await window.Auth.initialize();
            Logger.log('✅ Auth service initialized');
            Logger.log('Auth state:', {
                isAuthenticated: window.Auth.isAuthenticated(),
                isGuest: window.Auth.isGuest,
                guestId: window.Auth.guestId
            });
        } else {
            throw new Error('Auth service not available');
        }
        
        // Step 4: Verify API service
        if (window.API) {
            Logger.log('✅ API service available');
        } else {
            throw new Error('API service not available');
        }
        
        // Step 5: Verify Analytics service and initialize
        if (window.Analytics) {
            Logger.log('✅ Analytics service available');
            // Initialize the Analytics batch timer
            if (typeof window.Analytics.initializeWhenReady === 'function') {
                window.Analytics.initializeWhenReady();
                Logger.log('✅ Analytics batch timer started');
            }
        } else {
            throw new Error('Analytics service not available');
        }
        
        // Step 6: Set initialization complete flag
        window.TriollInitialized = true;
        
        // Step 7: Dispatch custom event
        window.dispatchEvent(new CustomEvent('trioll-initialized', {
            detail: {
                auth: window.Auth,
                api: window.API,
                analytics: window.Analytics
            }
        }));
        
        Logger.log('🎉 Trioll Web Platform initialized successfully!');
        
    } catch (error) {
        Logger.error('❌ Initialization error:', error);
        
        // Fallback: Setup guest mode if Auth is available
        if (window.Auth && typeof window.Auth.setupGuestMode === 'function') {
            Logger.log('🔄 Setting up guest mode fallback...');
            window.Auth.setupGuestMode();
        }
        
        // Mark as initialized anyway
        window.TriollInitialized = true;
        
        // Dispatch event (platform can still work without full auth)
        window.dispatchEvent(new CustomEvent('trioll-initialized', {
            detail: {
                warning: error.message,
                guestOnly: true,
                auth: window.Auth,
                api: window.API,
                analytics: window.Analytics
            }
        }));
        
        Logger.log('🎮 Platform initialized in guest-only mode');
    }
})();