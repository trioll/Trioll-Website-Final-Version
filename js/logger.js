/**
 * Logger Service for Trioll Web Platform
 * Replaces console.* statements with environment-aware logging
 */

const Logger = {
    // Configuration
    enabled: true,
    enabledInProduction: false,
    logLevel: 'debug', // debug, info, warn, error
    
    // Log levels
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    },
    
    // Initialize logger based on environment
    init() {
        // Detect environment
        const isProduction = window.location.hostname !== 'localhost' && 
                           !window.location.hostname.includes('127.0.0.1') &&
                           !window.location.protocol.includes('file:');
        
        // Disable in production unless explicitly enabled
        if (isProduction && !this.enabledInProduction) {
            this.enabled = false;
        }
        
        // Set log level from config if available
        if (typeof Config !== 'undefined' && Config.LOG_LEVEL) {
            this.logLevel = Config.LOG_LEVEL;
        }
        
        // Override console methods in production
        if (isProduction) {
            this._overrideConsoleMethods();
        }
    },
    
    // Override console methods to prevent accidental logging in production
    _overrideConsoleMethods() {
        const noop = () => {};
        console.log = noop;
        console.debug = noop;
        console.info = noop;
        console.warn = noop;
        // Keep console.error for critical issues
    },
    
    // Check if logging is allowed for given level
    _shouldLog(level) {
        if (!this.enabled) return false;
        return this.levels[level] >= this.levels[this.logLevel];
    },
    
    // Format log message with timestamp and level
    _format(level, args) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        return [prefix, ...args];
    },
    
    // Core logging methods
    debug(...args) {
        if (this._shouldLog('debug')) {
            console.log(...this._format('debug', args));
        }
    },
    
    info(...args) {
        if (this._shouldLog('info')) {
            console.info(...this._format('info', args));
        }
    },
    
    log(...args) {
        // Alias for info
        this.info(...args);
    },
    
    warn(...args) {
        if (this._shouldLog('warn')) {
            console.warn(...this._format('warn', args));
        }
    },
    
    error(...args) {
        if (this._shouldLog('error')) {
            console.error(...this._format('error', args));
            // In production, could send to error tracking service
            this._trackError(args);
        }
    },
    
    // Group logging for better organization
    group(label) {
        if (this.enabled && console.group) {
            console.group(label);
        }
    },
    
    groupEnd() {
        if (this.enabled && console.groupEnd) {
            console.groupEnd();
        }
    },
    
    // Table logging for structured data
    table(data) {
        if (this.enabled && console.table) {
            console.table(data);
        }
    },
    
    // Performance timing
    time(label) {
        if (this.enabled && console.time) {
            console.time(label);
        }
    },
    
    timeEnd(label) {
        if (this.enabled && console.timeEnd) {
            console.timeEnd(label);
        }
    },
    
    // Error tracking (stub for future implementation)
    _trackError(errorArgs) {
        // In production, send to error tracking service
        // Example: Sentry, LogRocket, etc.
        if (typeof Analytics !== 'undefined' && Analytics.track) {
            Analytics.track('error_logged', {
                error: errorArgs.join(' '),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        }
    },
    
    // Network logging helpers
    api(method, url, data) {
        this.debug(`API ${method}`, url, data);
    },
    
    apiResponse(method, url, response) {
        this.debug(`API ${method} Response`, url, response);
    },
    
    apiError(method, url, error) {
        this.error(`API ${method} Error`, url, error);
    }
};

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Logger.init());
} else {
    Logger.init();
}

// Make Logger globally available
window.Logger = Logger;