// Browser Compatibility Checks for Trioll Web Platform
class CompatibilityChecker {
    constructor() {
        this.requirements = {
            webgl: this.checkWebGL(),
            audio: this.checkAudioContext(),
            canvas: this.checkCanvas(),
            fetch: this.checkFetch(),
            promises: this.checkPromises(),
            localStorage: this.checkLocalStorage(),
            es6: this.checkES6()
        };
    }

    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    checkAudioContext() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    checkCanvas() {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    }

    checkFetch() {
        return typeof fetch !== 'undefined';
    }

    checkPromises() {
        return typeof Promise !== 'undefined';
    }

    checkLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    checkES6() {
        try {
            new Function('(a = 0) => a');
            return true;
        } catch (e) {
            return false;
        }
    }

    isCompatible() {
        return Object.values(this.requirements).every(req => req === true);
    }

    getMissingFeatures() {
        return Object.entries(this.requirements)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        const browser = {
            name: 'Unknown',
            version: 'Unknown'
        };

        if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
            browser.name = 'Chrome';
            const match = ua.match(/Chrome\/(\d+)/);
            if (match) browser.version = match[1];
        } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
            browser.name = 'Safari';
            const match = ua.match(/Version\/(\d+)/);
            if (match) browser.version = match[1];
        } else if (ua.indexOf('Firefox') > -1) {
            browser.name = 'Firefox';
            const match = ua.match(/Firefox\/(\d+)/);
            if (match) browser.version = match[1];
        } else if (ua.indexOf('Edg') > -1) {
            browser.name = 'Edge';
            const match = ua.match(/Edg\/(\d+)/);
            if (match) browser.version = match[1];
        }

        return browser;
    }

    showCompatibilityWarning(missing) {
        const browser = this.getBrowserInfo();
        let message = `Your browser (${browser.name} ${browser.version}) may not support all features required for the best gaming experience.\n\n`;
        message += `Missing features: ${missing.join(', ')}\n\n`;
        message += 'Please update your browser or try Chrome, Firefox, or Edge for the best experience.';
        
        console.warn('Compatibility issues detected:', missing);
        
        // Only show alert for critical features
        const criticalFeatures = ['webgl', 'canvas', 'fetch'];
        if (missing.some(feature => criticalFeatures.includes(feature))) {
            // Don't block, just warn
            console.error('Critical features missing:', missing.filter(f => criticalFeatures.includes(f)));
        }
    }
}

// Initialize compatibility checker
const compatibility = new CompatibilityChecker();

// Check compatibility on load
if (!compatibility.isCompatible()) {
    const missing = compatibility.getMissingFeatures();
    compatibility.showCompatibilityWarning(missing);
}

// Export for use in other scripts
window.CompatibilityChecker = CompatibilityChecker;