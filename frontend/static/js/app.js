// Main Application Controller
class MathSolverApp {
    constructor() {
        this.components = {};
        this.isInitialized = false;
        
        this.initializeApp();
    }
    
    async initializeApp() {
        console.log('🚀 Initializing MathSolver App...');
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Initialize notifications system
            this.initializeNotifications();
            
            this.isInitialized = true;
            console.log('✅ MathSolver App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize MathSolver App:', error);
        }
    }
    
    async initializeComponents() {
        // Components are initialized by their respective files
        // This method waits for them to be available
        
        const maxWaitTime = 5000; // 5 seconds
        const checkInterval = 100; // 100ms
        let waitTime = 0;
        
        const requiredComponents = [
            'userDataManager',
            'themeManager',
            'navigationManager', 
            'chatbotManager',
            'profileManager',
            'taskManager'
        ];
        
        while (waitTime < maxWaitTime) {
            const allComponentsReady = requiredComponents.every(
                component => window[component] !== undefined
            );
            
            if (allComponentsReady) {
                // Store references to components
                this.components = {
                    userData: window.userDataManager,
                    theme: window.themeManager,
                    navigation: window.navigationManager,
                    chatbot: window.chatbotManager,
                    profile: window.profileManager,
                    taskManager: window.taskManager
                };
                
                console.log('📦 All components loaded:', Object.keys(this.components));
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        
        console.warn('⚠️ Some components may not have loaded within the timeout period');
    }
    
    setupGlobalEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to open chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (this.components.chatbot) {
                    this.components.chatbot.openChat();
                }
            }
            
            // Ctrl/Cmd + P to open profile
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                if (this.components.profile) {
                    this.components.profile.openProfile();
                }
            }
            
            // Ctrl/Cmd + T to toggle theme
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                if (this.components.theme) {
                    this.components.theme.toggle();
                }
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }
    
    initializeNotifications() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }
    
    handleWindowResize() {
        // Handle responsive behavior
        const width = window.innerWidth;
        
        if (width < 768) {
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
        }
        
        // Notify components about resize
        Object.values(this.components).forEach(component => {
            if (component && typeof component.handleResize === 'function') {
                component.handleResize();
            }
        });
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden
            console.log('📱 App went to background');
        } else {
            // Page is visible
            console.log('📱 App came to foreground');
        }
    }
    
    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public API methods
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        const bgColor = type === 'success' ? '#28a745' : 
                       type === 'error' ? '#dc3545' : 
                       type === 'warning' ? '#ffc107' : '#17a2b8';
        
        notification.style.cssText = `
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            margin-bottom: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
        `;
        
        const container = document.getElementById('notification-container');
        if (container) {
            container.appendChild(notification);
            
            // Auto remove
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            }, duration);
            
            // Click to dismiss
            notification.addEventListener('click', () => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            });
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    // Component access methods
    getComponent(name) {
        return this.components[name];
    }
    
    isComponentReady(name) {
        return this.components[name] !== undefined;
    }
    
    // App state methods
    getCurrentTheme() {
        return this.components.theme?.isDarkTheme() ? 'dark' : 'light';
    }
    
    getCurrentTab() {
        return this.components.navigation?.getCurrentTab() || 'main';
    }
}

// Initialize the app
window.mathSolverApp = new MathSolverApp();

// Global utility functions
window.showNotification = function(message, type = 'info', duration = 3000) {
    if (window.mathSolverApp) {
        window.mathSolverApp.showNotification(message, type, duration);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathSolverApp;
}

// MathJax rendering function
function renderMathJax(element = document) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        return window.MathJax.typesetPromise([element]).catch((err) => {
            console.warn('MathJax rendering error:', err);
        });
    }
    return Promise.resolve();
}

// Make renderMathJax globally available
window.renderMathJax = renderMathJax;

window.updateContentWithMath = function(element, content) {
    if (element) {
        element.innerHTML = content;
        renderMathJax(element);
    }
};
// Color Customizer functionality
function initializeColorCustomizer() {
    const toggle = document.getElementById('colorCustomizerToggle');
    const customizer = document.getElementById('colorCustomizer');
    const closeBtn = document.getElementById('closeCustomizerBtn');
    const presets = document.querySelectorAll('.color-preset');
    const startColorInput = document.getElementById('startColor');
    const endColorInput = document.getElementById('endColor');
    const applyBtn = document.getElementById('applyCustomColorsBtn');
    const previewHeader = document.getElementById('previewHeader');
    
    if (!toggle || !customizer) return;
    
    // Open customizer
    toggle.addEventListener('click', () => {
        customizer.style.display = 'flex';
    });
    
    // Close customizer
    closeBtn.addEventListener('click', closeCustomizer);
    customizer.addEventListener('click', (e) => {
        if (e.target === customizer) {
            closeCustomizer();
        }
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && customizer.style.display === 'flex') {
            closeCustomizer();
        }
    });
    
    // Preset selection
    presets.forEach(preset => {
        preset.addEventListener('click', () => {
            const startColor = preset.dataset.start;
            const endColor = preset.dataset.end;
            
            // Update active state
            presets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            
            // Update color inputs
            startColorInput.value = startColor;
            endColorInput.value = endColor;
            
            // Apply colors
            applyColors(startColor, endColor);
        });
    });
    
    // Custom color inputs
    startColorInput.addEventListener('input', updatePreview);
    endColorInput.addEventListener('input', updatePreview);
    
    // Apply custom colors
    applyBtn.addEventListener('click', () => {
        const startColor = startColorInput.value;
        const endColor = endColorInput.value;
        applyColors(startColor, endColor);
        
        // Remove active state from presets
        presets.forEach(p => p.classList.remove('active'));
    });
    
    function closeCustomizer() {
        customizer.style.display = 'none';
    }
    
    function updatePreview() {
        const startColor = startColorInput.value;
        const endColor = endColorInput.value;
        
        if (previewHeader) {
            previewHeader.style.background = `linear-gradient(45deg, ${startColor}, ${endColor})`;
        }
    }
    
    function applyColors(startColor, endColor) {
        // Update CSS custom properties
        document.documentElement.style.setProperty('--panel-header-start', startColor);
        document.documentElement.style.setProperty('--panel-header-end', endColor);
        
        // Update preview
        updatePreview();
        
        // Save to localStorage
        localStorage.setItem('panel-header-colors', JSON.stringify({
            start: startColor,
            end: endColor
        }));
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Цвета заголовков обновлены!', 'success');
        }
    }
    
    // Load saved colors on page load
    function loadSavedColors() {
        const saved = localStorage.getItem('panel-header-colors');
        if (saved) {
            try {
                const colors = JSON.parse(saved);
                applyColors(colors.start, colors.end);
                startColorInput.value = colors.start;
                endColorInput.value = colors.end;
            } catch (e) {
                console.warn('Failed to load saved colors:', e);
            }
        }
    }
    
    // Initialize
    loadSavedColors();
    updatePreview();
}

// Initialize color customizer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeColorCustomizer();
});