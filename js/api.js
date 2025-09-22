// Trioll Web Platform API Service
class TriollAPI {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Get base URL
    getBaseURL() {
        return (typeof Config !== 'undefined' && Config.API_BASE_URL) 
            ? Config.API_BASE_URL 
            : 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod';
    }

    // Get headers for API calls
    async getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'X-Platform': 'pc',
            'X-App-Source': 'web'
        };

        // Add device info if Analytics is available
        try {
            if (typeof Analytics !== 'undefined' && Analytics.getDeviceType) {
                headers['X-Device-Type'] = Analytics.getDeviceType();
                headers['X-Browser'] = Analytics.getBrowser();
                headers['X-OS'] = Analytics.getOS();
                headers['X-Screen-Resolution'] = `${window.screen.width}x${window.screen.height}`;
            }
        } catch (e) {
            // Ignore if Analytics isn't ready yet
        }

        // Only add authorization if we have a valid token
        if (typeof Auth !== 'undefined' && Auth.getIdToken) {
            try {
                const token = await Auth.getIdToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                } else if (Auth.isGuest && Auth.getGuestId) {
                    const guestId = Auth.getGuestId();
                    headers['Authorization'] = `Bearer guest-${guestId}`;
                }
            } catch (error) {
                Logger.warn('Could not get auth token:', error);
            }
        }

        return headers;
    }

    // Games API
    async getGames(filters = {}) {
        const params = new URLSearchParams({
            limit: filters.limit || 20,
            ...filters
        });

        const cacheKey = `games_${params.toString()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const url = `${this.getBaseURL()}/games?${params}`;
            const headers = await this.getHeaders();
            
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                const errorText = await response.text();
                Logger.error('API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Transform the games data to ensure consistent field names
            if (data.games && Array.isArray(data.games)) {
                data.games = data.games
                    .map(game => this.transformGame(game))
                    .filter(game => {
                        // Filter out stat tracking entries (v0 records)
                        // These typically have "Untitled Game" as the name
                        const gameName = game.name || game.title || '';
                        return gameName.toLowerCase() !== 'untitled game' && gameName !== '';
                    });
            }
            
            this.setCache(cacheKey, data);
            return data;
            
        } catch (error) {
            Logger.error('Failed to fetch games:', error);
            Logger.warn('Using mock data for development...');
            
            // Temporarily use mock data if API fails
            try {
                const mockResponse = await fetch('/mock-games-data.json');
                if (mockResponse.ok) {
                    const mockData = await mockResponse.json();
                    Logger.log('Loaded mock games data');
                    return mockData;
                }
            } catch (mockError) {
                Logger.error('Failed to load mock data:', mockError);
            }
            
            throw error;
        }
    }

    async getGame(gameId) {
        const cacheKey = `game_${gameId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`${this.getBaseURL()}/games/${gameId}`, {
                headers: await this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Game not found: ${gameId}`);
            }

            const game = await response.json();
            const transformedGame = this.transformGame(game);
            
            this.setCache(cacheKey, transformedGame);
            return transformedGame;

        } catch (error) {
            Logger.error('Failed to fetch game:', error);
            throw error;
        }
    }

    // Transform game data for consistency
    transformGame(game) {
        return {
            id: game.gameId || game.id,
            gameId: game.gameId || game.id,
            name: game.name || game.title || 'Untitled Game',
            title: game.name || game.title || 'Untitled Game',
            category: game.category || 'uncategorized',
            description: game.description || '',
            thumbnailUrl: game.thumbnailUrl || game.image || game.thumbnail,
            gameUrl: game.gameUrl || game.url,
            developerName: game.developerName || game.developer || 'Unknown',
            uploadedAt: game.uploadedAt || game.createdAt,
            
            // PC-specific stats
            pc: game.pc || {
                plays: 0,
                likes: 0,
                ratings: 0,
                averageRating: 0,
                comments: 0
            },
            
            // Total stats (for reference)
            total: {
                plays: game.playCount || game.plays || 0,
                likes: game.likeCount || game.likes || 0,
                ratings: game.ratingCount || game.ratings || 0,
                averageRating: game.averageRating || 0,
                comments: game.commentCount || game.comments || 0
            }
        };
    }

    // User Interactions
    async likeGame(gameId) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/likes`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                platform: 'pc',
                deviceType: this.detectDevice(),
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to like game');
        }

        this.clearCache(`game_${gameId}`);
        return response.json();
    }

    async unlikeGame(gameId) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/likes`, {
            method: 'DELETE',
            headers: await this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to unlike game');
        }

        this.clearCache(`game_${gameId}`);
        return response.json();
    }

    async rateGame(gameId, rating) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/ratings`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({ 
                rating,
                platform: 'pc',
                deviceType: this.detectDevice(),
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to rate game');
        }

        this.clearCache(`game_${gameId}`);
        return response.json();
    }

    async bookmarkGame(gameId) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/bookmarks`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                platform: 'pc',
                deviceType: this.detectDevice(),
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to bookmark game');
        }

        this.clearCache(`game_${gameId}`);
        return response.json();
    }

    async unbookmarkGame(gameId) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/bookmarks`, {
            method: 'DELETE',
            headers: await this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to unbookmark game');
        }

        this.clearCache(`game_${gameId}`);
        return response.json();
    }

    async trackPlay(gameId) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/plays`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                platform: 'pc',
                deviceType: this.detectDevice(),
                timestamp: new Date().toISOString(),
                source: 'web-player'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to track play');
        }

        return response.json();
    }

    async trackPurchaseIntent(gameId, intent) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/purchase-intent`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({ 
                intent,
                platform: 'pc',
                deviceType: this.detectDevice(),
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to track purchase intent');
        }

        return response.json();
    }

    async getComments(gameId, limit = 20, lastEvaluatedKey = null) {
        const params = new URLSearchParams({ limit });
        if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/comments?${params}`, {
            headers: await this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch comments');
        }

        return response.json();
    }

    async postComment(gameId, text, rating = null) {
        const response = await fetch(`${this.getBaseURL()}/games/${gameId}/comments`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                text,
                rating,
                platform: 'pc',
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to post comment');
        }

        return response.json();
    }

    // Search games
    async searchGames(query) {
        if (!query || query.trim().length < 2) {
            return { games: [] };
        }

        const response = await fetch(`${this.getBaseURL()}/games/search?q=${encodeURIComponent(query)}`, {
            headers: await this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();
        
        // Transform search results
        if (data.games && Array.isArray(data.games)) {
            data.games = data.games.map(game => this.transformGame(game));
        }
        
        return data;
    }

    // User profile
    async getUserProfile(userId) {
        const response = await fetch(`${this.getBaseURL()}/users/${userId || 'me'}`, {
            headers: await this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        return response.json();
    }

    async updateUserProfile(updates) {
        const response = await fetch(`${this.getBaseURL()}/users/me`, {
            method: 'PUT',
            headers: await this.getHeaders(),
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        return response.json();
    }

    // Cache management
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clearCache(keyPattern = null) {
        if (!keyPattern) {
            this.cache.clear();
        } else {
            for (const key of this.cache.keys()) {
                if (key.includes(keyPattern)) {
                    this.cache.delete(key);
                }
            }
        }
    }

    // Utility methods
    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad/.test(userAgent)) {
            return 'mobile';
        } else if (/tablet/.test(userAgent)) {
            return 'tablet';
        }
        return 'desktop';
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Get user interactions for a specific game
    async getUserInteractions(gameId) {
        try {
            const response = await fetch(`${this.getBaseURL()}/users/me/games/${gameId}/interactions`, {
                headers: await this.getHeaders()
            });
            
            if (!response.ok) {
                // Return default state if endpoint doesn't exist
                return { liked: false, bookmarked: false, rated: false };
            }
            
            return response.json();
        } catch (error) {
            Logger.warn('Failed to get user interactions:', error);
            // Fallback to local storage check
            return {
                liked: this.isGameLiked(gameId),
                bookmarked: this.isGameBookmarked(gameId),
                rated: false
            };
        }
    }

    // Track local activity (no API call, just local storage)
    trackLocalActivity(action, gameId, data = {}) {
        try {
            const activities = JSON.parse(localStorage.getItem('trioll_activities') || '[]');
            activities.push({
                action,
                gameId,
                timestamp: Date.now(),
                ...data
            });
            
            // Keep last 100 activities
            if (activities.length > 100) {
                activities.splice(0, activities.length - 100);
            }
            
            localStorage.setItem('trioll_activities', JSON.stringify(activities));
        } catch (error) {
            Logger.warn('Failed to track local activity:', error);
        }
    }

    // Helper methods for local storage
    isGameLiked(gameId) {
        const likedGames = JSON.parse(localStorage.getItem('likedGames') || '[]');
        return likedGames.includes(gameId);
    }

    isGameBookmarked(gameId) {
        const bookmarkedGames = JSON.parse(localStorage.getItem('bookmarkedGames') || '[]');
        return bookmarkedGames.includes(gameId);
    }
}

// Create singleton instance
const API = new TriollAPI();

// Make API available globally
window.API = API;