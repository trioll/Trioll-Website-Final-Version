// Trioll Analytics Service
class AnalyticsService {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.events = [];
        this.batchSize = Config.ANALYTICS_BATCH_SIZE || 10;
        this.flushInterval = Config.ANALYTICS_FLUSH_INTERVAL || 30000;
        this.platform = 'PC'; // Always PC for web platform
        this.initialized = false;
        
        // Delay batch timer start to ensure services are loaded
        this.timerStarted = false;
        
        // Flush on page unload (with safety check)
        window.addEventListener('beforeunload', () => {
            if (this.timerStarted && typeof API !== 'undefined') {
                this.flush(true);
            }
        });
        window.addEventListener('pagehide', () => {
            if (this.timerStarted && typeof API !== 'undefined') {
                this.flush(true);
            }
        });
        
        // Track session start
        this.sessionStartTime = Date.now();
        this.lastActivityTime = Date.now();
        
        // Track page visibility for accurate session time
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTime = Date.now();
            } else if (this.pauseTime) {
                // Subtract pause time from session
                const pauseDuration = Date.now() - this.pauseTime;
                this.sessionStartTime += pauseDuration;
                this.pauseTime = null;
            }
        });
    }

    track(event, properties = {}) {
        const eventData = {
            event,
            properties: {
                ...properties,
                sessionId: this.sessionId,
                timestamp: Date.now(),
                // CRITICAL: Mark as PC platform to distinguish from mobile app
                source: 'web',
                platform: 'pc', // Changed from 'browser' to 'pc' for clear separation
                devicePlatform: 'pc', // PC platform marker (vs 'mobile' for app)
                appVersion: 'pc-1.0.0', // PC version tracking
                analyticsSource: 'trioll-pc', // Separate from mobile app analytics
                url: window.location.href,
                referrer: document.referrer,
                device: {
                    type: this.getDeviceType(),
                    browser: this.getBrowser(),
                    os: this.getOS(),
                    screen: {
                        width: window.screen.width,
                        height: window.screen.height,
                        pixelRatio: window.devicePixelRatio || 1
                    },
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    language: navigator.language,
                    online: navigator.onLine
                }
            },
            userId: Auth?.getCurrentUserId() || null,
            isGuest: Auth?.isGuest || true,
            // Mark this as web analytics to ensure separate aggregation
            analyticsChannel: 'web-platform'
        };

        this.events.push(eventData);
        this.lastActivityTime = Date.now();

        // Flush if batch is full (only if timer has started)
        if (this.timerStarted && this.events.length >= this.batchSize) {
            this.flush();
        }
    }

    async flush(sync = false) {
        if (this.events.length === 0) return;
        
        // Safety check - don't flush if API isn't ready or running from file://
        if (typeof API === 'undefined' || !Config.API_BASE_URL || window.location.protocol === 'file:') {
            if (window.location.protocol === 'file:') {
                Logger.warn('Analytics: Skipping flush - file:// protocol detected');
            } else {
                Logger.warn('Analytics: Skipping flush - API not ready');
            }
            return;
        }

        const events = [...this.events];
        this.events = [];

        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-App-Source': 'web'
            };

            // Add auth headers if available
            if (typeof API !== 'undefined' && API.getHeaders) {
                const authHeaders = await API.getHeaders();
                Object.assign(headers, authHeaders);
            }

            const request = fetch(`${Config.API_BASE_URL}/analytics/events`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ 
                    events,
                    session: {
                        id: this.sessionId,
                        duration: this.getSessionDuration(),
                        source: 'web'
                    }
                }),
                keepalive: sync // For beforeunload
            });

            if (!sync) {
                await request;
                Logger.log(`Flushed ${events.length} analytics events`);
            }
        } catch (error) {
            // Re-queue events on failure
            this.events = [...events, ...this.events];
            Logger.error('Analytics flush failed:', error);
            
            // Store failed events in localStorage for retry
            this.storeFailedEvents(events);
        }
    }

    startBatchTimer() {
        // Don't start if already started
        if (this.timerStarted) return;
        
        // Clear existing timer
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        
        this.timerStarted = true;
        this.flushTimer = setInterval(() => {
            this.flush();
            
            // Also track session heartbeat
            this.track('session_heartbeat', {
                duration: this.getSessionDuration(),
                lastActivity: Date.now() - this.lastActivityTime
            });
        }, this.flushInterval);
    }
    
    // Initialize analytics (alias for compatibility)
    initialize() {
        this.initialized = true;
        this.initializeWhenReady();
    }

    // Safe initialization method to be called after platform is ready
    initializeWhenReady() {
        if (!this.timerStarted) {
            this.startBatchTimer();
        }
    }

    generateSessionId() {
        return `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSessionDuration() {
        if (this.pauseTime) {
            // Currently paused, calculate up to pause time
            return Math.floor((this.pauseTime - this.sessionStartTime) / 1000);
        }
        return Math.floor((Date.now() - this.sessionStartTime) / 1000);
    }

    getDeviceType() {
        // Check for touch capability
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Check screen size
        const width = window.innerWidth;
        
        if (hasTouch && width < 768) return 'mobile';
        if (hasTouch && width < 1024) return 'tablet';
        if (width < 1024) return 'small-desktop';
        return 'desktop';
    }

    getBrowser() {
        const ua = navigator.userAgent;
        let browser = "Unknown";
        
        if (ua.indexOf("Chrome") > -1 && ua.indexOf("Edg") === -1) {
            browser = "Chrome";
        } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
            browser = "Safari";
        } else if (ua.indexOf("Firefox") > -1) {
            browser = "Firefox";
        } else if (ua.indexOf("Edg") > -1) {
            browser = "Edge";
        } else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) {
            browser = "Opera";
        }
        
        // Try to get version
        const version = this.getBrowserVersion(ua, browser);
        if (version) {
            browser += ` ${version}`;
        }
        
        return browser;
    }

    getBrowserVersion(ua, browser) {
        let match;
        switch(browser) {
            case "Chrome":
                match = ua.match(/Chrome\/(\d+)/);
                break;
            case "Firefox":
                match = ua.match(/Firefox\/(\d+)/);
                break;
            case "Safari":
                match = ua.match(/Version\/(\d+)/);
                break;
            case "Edge":
                match = ua.match(/Edg\/(\d+)/);
                break;
        }
        return match ? match[1] : null;
    }

    getOS() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        
        if (ua.indexOf("Win") > -1) return "Windows";
        if (ua.indexOf("Mac") > -1) return "macOS";
        if (ua.indexOf("Linux") > -1) return "Linux";
        if (ua.indexOf("Android") > -1) return "Android";
        if (ua.indexOf("iOS") > -1 || /iPad|iPhone|iPod/.test(ua)) return "iOS";
        if (platform.indexOf("Win") > -1) return "Windows";
        if (platform.indexOf("Mac") > -1) return "macOS";
        if (platform.indexOf("Linux") > -1) return "Linux";
        
        return "Unknown";
    }

    // Store failed events for retry
    storeFailedEvents(events) {
        try {
            const stored = localStorage.getItem('trioll_failed_events');
            const existing = stored ? JSON.parse(stored) : [];
            const updated = [...existing, ...events].slice(-100); // Keep last 100
            localStorage.setItem('trioll_failed_events', JSON.stringify(updated));
        } catch (error) {
            Logger.error('Failed to store analytics events:', error);
        }
    }

    // Retry failed events on next load
    async retryFailedEvents() {
        try {
            const stored = localStorage.getItem('trioll_failed_events');
            if (!stored) return;
            
            const events = JSON.parse(stored);
            if (events.length === 0) return;
            
            // Add to current batch
            this.events.push(...events);
            localStorage.removeItem('trioll_failed_events');
            
            // Flush immediately
            await this.flush();
        } catch (error) {
            Logger.error('Failed to retry analytics events:', error);
        }
    }

    // Track specific game events
    trackGameEvent(gameId, event, additionalProps = {}) {
        this.track(`game_${event}`, {
            gameId,
            gameName: additionalProps.gameName,
            ...additionalProps
        });
    }

    // Track errors
    trackError(error, context = {}) {
        this.track('error', {
            errorMessage: error.message || String(error),
            errorStack: error.stack,
            errorType: error.name || 'Error',
            ...context
        });
    }
}

// Create singleton instance
const Analytics = new AnalyticsService();

// Make Analytics available globally
window.Analytics = Analytics;

// Retry failed events on load
setTimeout(() => {
    Analytics.retryFailedEvents();
}, 1000);