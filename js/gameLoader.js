// Game Loading Service
class GameLoaderService {
    constructor() {
        this.currentGame = null;
        this.engine = null;
        this.startTime = null;
        this.loadingTips = Config.LOADING_TIPS || [];
        this.tipInterval = null;
        this.progressInterval = null;
    }

    async loadGame(gameId) {
        Logger.log('🎮 GameLoader.loadGame called with:', gameId);
        try {
            // Show loading screen
            this.showLoading();
            
            // Track game load start
            Analytics.track('game_load_start', {
                gameId,
                source: 'web'
            });
            
            Logger.log('📡 Fetching game details for:', gameId);
            // Fetch game details
            const game = await API.getGame(gameId);
            Logger.log('✅ Game details received:', game);
            this.currentGame = game;
            
            // Update page title and header
            document.title = `${game.name} - Play on Trioll`;
            const header = document.getElementById('gameNameHeader');
            if (header) header.textContent = game.name;
            
            // Check compatibility
            const compatibility = await GameCompatibility.check(game);
            if (!compatibility.webCompatible) {
                this.showIncompatibleMessage(compatibility);
                Analytics.track('game_incompatible', {
                    gameId,
                    issues: compatibility.issues,
                    source: 'web'
                });
                return;
            }
            
            // Track play start
            await API.trackPlay(gameId);
            
            // Record start time for session tracking
            this.startTime = Date.now();
            
            Analytics.track('game_start', {
                gameId: game.id || game.gameId,
                gameName: game.name,
                engine: game.engine || 'html5',
                source: 'web',
                device: API.detectDevice(),
                category: game.category
            });
            
            // Load based on engine type
            await this.loadByEngine(game);
            
        } catch (error) {
            Logger.error('Failed to load game:', error);
            this.showError(error.message);
            
            Analytics.trackError(error, {
                gameId,
                phase: 'game_load'
            });
        }
    }

    async loadByEngine(game) {
        Logger.log('🎮 loadByEngine called with game:', game);
        const wrapper = document.getElementById('gameWrapper');
        Logger.log('🎮 Game wrapper element:', wrapper);
        
        if (!wrapper) {
            throw new Error('Game wrapper element not found');
        }
        
        wrapper.innerHTML = ''; // Clear previous game
        
        // Select appropriate loader
        const engine = game.engine || 'html5';
        Logger.log('🎮 Using engine:', engine);
        
        switch(engine.toLowerCase()) {
            case 'unity':
            case 'unity-webgl':
                this.engine = new UnityWebGLLoader();
                break;
            case 'godot':
                this.engine = new GodotLoader();
                break;
            case 'construct':
            case 'construct3':
                this.engine = new Construct3Loader();
                break;
            case 'html5':
            default:
                this.engine = new HTML5Loader();
        }
        
        // Set up loading progress tracking
        this.engine.onProgress = (progress) => {
            this.updateProgress(progress);
        };
        
        try {
            await this.engine.load(wrapper, game);
            this.hideLoading();
            this.setupGameControls();
            
            Analytics.track('game_loaded', {
                gameId: game.id || game.gameId,
                loadTime: Date.now() - this.startTime,
                engine: engine,
                source: 'web'
            });
        } catch (error) {
            throw new Error(`Failed to load ${engine} game: ${error.message}`);
        }
    }

    setupGameControls() {
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.onclick = () => {
                this.engine.toggleFullscreen();
                Analytics.track('game_fullscreen', {
                    gameId: this.currentGame.id,
                    source: 'web'
                });
            };
        }
        
        // Track game end on page unload
        window.addEventListener('beforeunload', () => {
            if (this.startTime) {
                const playTime = Math.floor((Date.now() - this.startTime) / 1000);
                Analytics.track('game_end', {
                    gameId: this.currentGame.id,
                    gameName: this.currentGame.name,
                    playTime,
                    source: 'web'
                });
            }
        });
        
        // Track game pause/resume with visibility API
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.engine.pause) this.engine.pause();
                Analytics.track('game_pause', {
                    gameId: this.currentGame.id,
                    source: 'web'
                });
            } else {
                if (this.engine.resume) this.engine.resume();
                Analytics.track('game_resume', {
                    gameId: this.currentGame.id,
                    source: 'web'
                });
            }
        });
    }

    showLoading() {
        document.getElementById('loadingScreen').classList.remove('hidden');
        document.getElementById('gameWrapper').classList.add('hidden');
        document.getElementById('compatError').classList.add('hidden');
        
        // Reset progress
        this.updateProgress(0);
        
        // Start showing tips
        this.showLoadingTips();
        
        // Simulate progress if not getting real updates
        let simulatedProgress = 0;
        this.progressInterval = setInterval(() => {
            if (simulatedProgress < 90) {
                simulatedProgress += Math.random() * 10;
                this.updateProgress(Math.min(simulatedProgress, 90));
            }
        }, 500);
    }

    showLoadingTips() {
        const tipElement = document.getElementById('loadingTip');
        if (!tipElement || this.loadingTips.length === 0) return;
        
        let tipIndex = 0;
        
        // Show first tip immediately
        tipElement.textContent = this.loadingTips[tipIndex];
        
        // Rotate tips every 3 seconds
        this.tipInterval = setInterval(() => {
            tipIndex = (tipIndex + 1) % this.loadingTips.length;
            tipElement.style.opacity = '0';
            
            setTimeout(() => {
                tipElement.textContent = this.loadingTips[tipIndex];
                tipElement.style.opacity = '1';
            }, 300);
        }, 3000);
    }

    updateProgress(percent) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    hideLoading() {
        // Clear intervals
        if (this.tipInterval) {
            clearInterval(this.tipInterval);
            this.tipInterval = null;
        }
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        // Complete progress animation
        this.updateProgress(100);
        
        // Hide loading screen after animation
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            const gameWrapper = document.getElementById('gameWrapper');
            
            Logger.log('🎮 Hiding loading screen...', {
                loadingScreen,
                gameWrapper
            });
            
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                loadingScreen.style.display = 'none'; // Force hide
            }
            
            if (gameWrapper) {
                gameWrapper.classList.remove('hidden');
                gameWrapper.style.display = 'block'; // Force show
            }
            
            Logger.log('✅ Loading screen hidden, game should be visible');
        }, 500);
    }

    showIncompatibleMessage(compatibility) {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('compatError').classList.remove('hidden');
        
        const messageEl = document.getElementById('compatMessage');
        const issuesEl = document.getElementById('compatIssues');
        
        if (messageEl) {
            messageEl.textContent = 'This game cannot be played on your device.';
        }
        
        if (issuesEl && compatibility.issues.length > 0) {
            issuesEl.innerHTML = `
                <h3>Issues:</h3>
                <ul>
                    ${compatibility.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
                ${compatibility.warnings.length > 0 ? `
                    <h3>Warnings:</h3>
                    <ul>
                        ${compatibility.warnings.map(warning => `<li>${warning}</li>`).join('')}
                    </ul>
                ` : ''}
            `;
        }
    }

    showError(message) {
        this.showIncompatibleMessage({
            webCompatible: false,
            issues: [message],
            warnings: []
        });
    }
}

// HTML5 Game Loader
class HTML5Loader {
    constructor() {
        this.iframe = null;
        this.onProgress = null;
    }

    async load(container, game) {
        Logger.log('🎮 HTML5Loader.load called');
        Logger.log('🎮 Container:', container);
        Logger.log('🎮 Game data:', game);
        
        // Report initial progress
        if (this.onProgress) this.onProgress(10);
        
        const iframe = document.createElement('iframe');
        
        // Determine game URL
        let gameUrl;
        if (game.gameUrl) {
            gameUrl = game.gameUrl;
        } else if (game.versions?.web?.url) {
            gameUrl = game.versions.web.url + 'index.html';
        } else {
            // Default CDN URL pattern
            const gameId = game.id || game.gameId;
            gameUrl = `${Config.GAME_CDN_URL}/${gameId}/index.html`;
        }
        
        Logger.log('🎮 Game URL:', gameUrl);
        iframe.src = gameUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'accelerometer; gyroscope; autoplay');
        
        // Return a promise that resolves when the iframe loads
        return new Promise((resolve, reject) => {
            iframe.onload = () => {
                Logger.log('🎮 iframe loaded successfully');
                if (this.onProgress) this.onProgress(100);
                resolve();
            };
            
            iframe.onerror = (error) => {
                Logger.error('🎮 iframe failed to load:', error);
                reject(new Error('Failed to load game iframe'));
            };
            
            // Simulate progress updates
            setTimeout(() => { if (this.onProgress) this.onProgress(30); }, 200);
            setTimeout(() => { if (this.onProgress) this.onProgress(60); }, 500);
            setTimeout(() => { if (this.onProgress) this.onProgress(80); }, 800);
            
            container.appendChild(iframe);
            this.iframe = iframe;
            
            // Add resize handler for responsive games
            this.handleResize();
            window.addEventListener('resize', () => this.handleResize());
        });
    }
    
    handleResize() {
        if (!this.iframe) return;
        
        // Some games need explicit size messages
        try {
            this.iframe.contentWindow.postMessage({
                type: 'resize',
                width: this.iframe.offsetWidth,
                height: this.iframe.offsetHeight
            }, '*');
        } catch (e) {
            // Cross-origin, ignore
        }
    }
    
    toggleFullscreen() {
        if (!this.iframe) return;
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.iframe.requestFullscreen().catch(err => {
                Logger.error('Fullscreen failed:', err);
                alert('Press F11 for fullscreen mode');
            });
        }
    }
    
    pause() {
        // Send pause message to game if supported
        try {
            this.iframe.contentWindow.postMessage({ type: 'pause' }, '*');
        } catch (e) {
            // Cross-origin, ignore
        }
    }
    
    resume() {
        // Send resume message to game if supported
        try {
            this.iframe.contentWindow.postMessage({ type: 'resume' }, '*');
        } catch (e) {
            // Cross-origin, ignore
        }
    }
}

// Unity WebGL Loader
class UnityWebGLLoader {
    constructor() {
        this.unityInstance = null;
        this.canvas = null;
        this.onProgress = null;
    }

    async load(container, game) {
        // Create container div
        const unityContainer = document.createElement('div');
        unityContainer.id = 'unity-container';
        unityContainer.style.width = '100%';
        unityContainer.style.height = '100%';
        container.appendChild(unityContainer);
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'unity-canvas';
        unityContainer.appendChild(this.canvas);
        
        // Load Unity loader script
        const script = document.createElement('script');
        const gameUrl = game.versions?.web?.url || `${Config.GAME_CDN_URL}/${game.id}/`;
        script.src = `${gameUrl}Build/UnityLoader.js`;
        
        return new Promise((resolve, reject) => {
            script.onload = () => {
                // Initialize Unity
                if (typeof UnityLoader === 'undefined') {
                    reject(new Error('Unity loader not found'));
                    return;
                }
                
                this.unityInstance = UnityLoader.instantiate('unity-canvas', `${gameUrl}Build/game.json`, {
                    onProgress: (progress) => {
                        if (this.onProgress) {
                            this.onProgress(progress * 100);
                        }
                    }
                });
                
                // Consider loaded when instance is created
                setTimeout(() => resolve(), 1000);
            };
            
            script.onerror = () => reject(new Error('Failed to load Unity loader'));
            
            document.head.appendChild(script);
        });
    }
    
    toggleFullscreen() {
        if (this.canvas) {
            this.unityInstance?.SetFullscreen(1);
        }
    }
    
    pause() {
        // Unity games typically handle this automatically
        if (this.unityInstance?.SendMessage) {
            this.unityInstance.SendMessage('GameController', 'Pause');
        }
    }
    
    resume() {
        if (this.unityInstance?.SendMessage) {
            this.unityInstance.SendMessage('GameController', 'Resume');
        }
    }
}

// Godot Engine Loader (placeholder)
class GodotLoader {
    constructor() {
        this.engine = null;
        this.onProgress = null;
    }
    
    async load(container, game) {
        throw new Error('Godot support coming soon');
    }
    
    toggleFullscreen() {
        // TODO: Implement
    }
}

// Construct 3 Loader (placeholder)
class Construct3Loader {
    constructor() {
        this.runtime = null;
        this.onProgress = null;
    }
    
    async load(container, game) {
        throw new Error('Construct 3 support coming soon');
    }
    
    toggleFullscreen() {
        // TODO: Implement
    }
}

// Initialize on page load
const GameLoader = new GameLoaderService();

// Make GameLoader available globally
window.GameLoader = GameLoader;