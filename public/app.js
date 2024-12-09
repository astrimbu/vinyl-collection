// Import modules
import { AuthManager } from './modules/auth.js';
import { VinylManager } from './modules/vinyl.js';
import { UIManager } from './modules/ui.js';
import { AdminManager } from './modules/admin.js';
import { SearchManager } from './modules/search.js';
import { ModalManager } from './modules/modal.js';

// Main App class to coordinate all functionality
class App {
    constructor() {
        // Initialize managers
        this.auth = new AuthManager(this);
        this.vinyl = new VinylManager(this);
        this.ui = new UIManager(this);
        this.admin = new AdminManager(this);
        this.search = new SearchManager(this);
        this.modal = new ModalManager(this);
        
        // Set initial auth state
        document.body.dataset.auth = this.auth.isAuthenticated() ? 'admin' : 'guest';
    }

    async init() {
        try {
            // Initialize UI components
            this.ui.initializeViewSwitcher();
            this.ui.initializeEventListeners();
            
            // Check authentication and setup appropriate view
            if (this.auth.isAuthenticated()) {
                await this.admin.init();
            }
            
            // Load initial vinyl data
            await this.vinyl.loadVinyls();
            
            // Initialize search functionality
            this.search.init();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.ui.showError('Failed to initialize application');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    app.init();
});

// Export for potential testing or console debugging
export default App; 