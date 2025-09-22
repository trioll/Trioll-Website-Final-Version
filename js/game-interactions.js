// Game interaction functions that connect to backend API
(function() {
    'use strict';
    
    Logger.log('🎮 Initializing game interactions with PC platform tracking...');
    
    // Helper to check if user is authenticated
    function isAuthenticated() {
        return window.Auth && window.Auth.isAuthenticated();
    }
    
    // Helper to show auth modal or redirect to login
    function showAuthModal() {
        // Since we removed the auth modal from HTML, redirect to login
        if (confirm('Please login to interact with games. Go to login page?')) {
            window.location.href = 'login.html';
        }
    }
    
    // Toggle Like
    window.toggleLike = async function(event, gameId) {
        event.stopPropagation();
        Logger.log('❤️ Toggling like for game:', gameId);
        
        if (!isAuthenticated()) {
            showAuthModal();
            return;
        }
        
        const button = event.currentTarget;
        const isLiked = button.classList.contains('liked');
        
        try {
            // Optimistic UI update
            button.classList.toggle('liked');
            button.disabled = true;
            
            if (isLiked) {
                // Unlike
                await API.unlikeGame(gameId);
                Logger.log('✅ Game unliked');
            } else {
                // Like
                await API.likeGame(gameId);
                Logger.log('✅ Game liked');
            }
            
            // Update stats display
            updateGameStats(gameId);
            
        } catch (error) {
            Logger.error('❌ Failed to toggle like:', error);
            // Revert UI on error
            button.classList.toggle('liked');
            alert('Failed to update like. Please try again.');
        } finally {
            button.disabled = false;
        }
    };
    
    // Toggle Bookmark
    window.toggleBookmark = async function(event, gameId) {
        event.stopPropagation();
        Logger.log('🔖 Toggling bookmark for game:', gameId);
        
        if (!isAuthenticated()) {
            showAuthModal();
            return;
        }
        
        const button = event.currentTarget;
        const isBookmarked = button.classList.contains('bookmarked');
        
        try {
            // Optimistic UI update
            button.classList.toggle('bookmarked');
            button.disabled = true;
            
            if (isBookmarked) {
                // Remove bookmark
                await API.unbookmarkGame(gameId);
                Logger.log('✅ Bookmark removed');
            } else {
                // Add bookmark
                await API.bookmarkGame(gameId);
                Logger.log('✅ Game bookmarked');
            }
            
        } catch (error) {
            Logger.error('❌ Failed to toggle bookmark:', error);
            // Revert UI on error
            button.classList.toggle('bookmarked');
            alert('Failed to update bookmark. Please try again.');
        } finally {
            button.disabled = false;
        }
    };
    
    // Show Rating Modal
    window.showRateModal = function(event, gameId) {
        event.stopPropagation();
        Logger.log('⭐ Opening rating modal for game:', gameId);
        
        if (!isAuthenticated()) {
            showAuthModal();
            return;
        }
        
        // Store current game ID for rating
        window.currentRatingGameId = gameId;
        
        // Show the rating modal
        const modal = document.getElementById('ratingModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Reset stars
            const stars = modal.querySelectorAll('.star');
            stars.forEach(star => star.classList.remove('active'));
            window.currentRating = 0;
        } else {
            Logger.error('Rating modal not found');
        }
    };
    
    // Submit Rating
    window.submitRating = async function() {
        const gameId = window.currentRatingGameId;
        const rating = window.currentRating;
        
        if (!gameId || !rating) {
            alert('Please select a rating');
            return;
        }
        
        Logger.log(`⭐ Submitting rating ${rating} for game ${gameId}`);
        
        try {
            await API.rateGame(gameId, rating);
            Logger.log('✅ Rating submitted');
            
            // Close modal
            const modal = document.getElementById('ratingModal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // Update stats display
            updateGameStats(gameId);
            
            // Show success message
            showMessage('Rating submitted successfully!', 'success');
            
        } catch (error) {
            Logger.error('❌ Failed to submit rating:', error);
            alert('Failed to submit rating. Please try again.');
        }
    };
    
    // Go to Comments
    window.goToComments = function(event, gameId) {
        event.stopPropagation();
        Logger.log('💬 Going to comments for game:', gameId);
        
        // Navigate to game page with comments section
        window.location.href = `game.html?id=${gameId}#comments`;
    };
    
    // Share Game
    window.shareGame = async function(event, gameId, gameName) {
        event.stopPropagation();
        Logger.log('🔗 Sharing game:', gameId, gameName);
        
        const gameUrl = `${window.location.origin}/game.html?id=${gameId}`;
        const shareText = `Check out ${gameName || 'this game'} on Trioll!`;
        
        try {
            if (navigator.share) {
                // Use Web Share API if available
                await navigator.share({
                    title: gameName || 'Trioll Game',
                    text: shareText,
                    url: gameUrl
                });
                Logger.log('✅ Game shared');
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(gameUrl);
                showMessage('Game link copied to clipboard!', 'success');
            }
        } catch (error) {
            Logger.error('❌ Failed to share:', error);
            // Final fallback
            prompt('Copy this link to share:', gameUrl);
        }
    };
    
    // Update game stats after interaction
    async function updateGameStats(gameId) {
        try {
            // Find the game card
            const cards = document.querySelectorAll('.game-card');
            let targetCard = null;
            
            cards.forEach(card => {
                const likeBtn = card.querySelector('.like-btn');
                if (likeBtn && likeBtn.getAttribute('onclick')?.includes(gameId)) {
                    targetCard = card;
                }
            });
            
            if (!targetCard) return;
            
            // Fetch updated game data
            const game = await API.getGame(gameId);
            
            // Update stats display
            const statsContainer = targetCard.querySelector('.game-stats');
            if (statsContainer && game) {
                statsContainer.innerHTML = `
                    <span title="PC Platform Likes">
                        👍 ${(game.platforms?.pc?.likes || game.likeCount || 0).toLocaleString()}
                    </span>
                    <span title="PC Platform Plays">
                        ▶️ ${(game.platforms?.pc?.plays || game.playCount || 0).toLocaleString()}
                    </span>
                    <span title="Average Rating">⭐ ${game.averageRating || 0}</span>
                `;
            }
        } catch (error) {
            Logger.error('Failed to update game stats:', error);
        }
    }
    
    // Helper to show messages
    function showMessage(message, type = 'info') {
        // Check if there's a message container
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            `;
            document.body.appendChild(messageContainer);
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.style.cssText = `
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            margin-bottom: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
        `;
        messageDiv.textContent = message;
        
        messageContainer.appendChild(messageDiv);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
    
    // Add CSS for animations
    if (!document.getElementById('gameInteractionStyles')) {
        const style = document.createElement('style');
        style.id = 'gameInteractionStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .card-action-btn.liked {
                color: #ff4757;
            }
            .card-action-btn.bookmarked {
                color: #4CAF50;
            }
            .card-action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
    
    Logger.log('✅ Game interactions initialized with PC platform tracking');
})();