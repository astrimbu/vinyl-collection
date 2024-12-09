export class UIManager {
    constructor(app) {
        this.app = app;
        this.viewButtons = document.querySelectorAll('.view-btn');
        this.searchInput = document.getElementById('searchInput');
        this.vinylList = document.getElementById('vinylList');
        this.vinylGrid = document.getElementById('vinylGrid');
        this.errorTimeout = null;
    }

    initializeViewSwitcher() {
        this.viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                this.switchView(view);
                this.app.vinyl.displayVinyls();
            });
        });
    }

    initializeEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Handle Ctrl+A to focus search
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.searchInput.focus();
                this.searchInput.select();
                return;
            }
            
            // Ignore other special keys
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }

            // Handle alphanumeric keys for quick search
            if (e.key.length === 1 || e.key === 'Backspace') {
                this.searchInput.focus();
                if (e.key === 'Backspace') {
                    this.searchInput.value = this.searchInput.value.slice(0, -1);
                } else {
                    this.searchInput.value += e.key;
                }
                
                // Trigger search
                this.app.search.performSearch(this.searchInput.value);
            }
        });

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.app.modal.closeAllModals();
            }
        });

        // Handle modal overlay clicks
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.app.modal.closeAllModals();
                }
            });
        });
    }

    switchView(view) {
        // Update active button state
        this.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Show/hide appropriate view
        if (view === 'table') {
            this.vinylList.classList.remove('hidden');
            this.vinylGrid.classList.add('hidden');
        } else {
            this.vinylList.classList.add('hidden');
            this.vinylGrid.classList.remove('hidden');
        }
    }

    showError(message, duration = 5000) {
        // Clear any existing error timeout
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
        }

        // Create or get error container
        let errorContainer = document.getElementById('errorContainer');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'errorContainer';
            errorContainer.className = 'error-container';
            document.body.appendChild(errorContainer);
        }

        // Show error message
        errorContainer.textContent = message;
        errorContainer.classList.add('visible');

        // Hide after duration
        this.errorTimeout = setTimeout(() => {
            errorContainer.classList.remove('visible');
        }, duration);
    }

    showLoading(message = 'Loading...') {
        let loadingContainer = document.getElementById('loadingContainer');
        if (!loadingContainer) {
            loadingContainer = document.createElement('div');
            loadingContainer.id = 'loadingContainer';
            loadingContainer.className = 'loading-container';
            loadingContainer.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            document.body.appendChild(loadingContainer);
        }
        loadingContainer.classList.add('visible');
    }

    hideLoading() {
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.classList.remove('visible');
        }
    }

    updateProgressBar(current, total, message = '') {
        const progressContainer = document.getElementById('updateProgress');
        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressCount = document.getElementById('progressCount');
        const totalCount = document.getElementById('totalCount');
        
        const percentage = (current / total) * 100;
        progressFill.style.width = `${percentage}%`;
        progressCount.textContent = current;
        totalCount.textContent = total;
        
        if (message) {
            const progressText = progressContainer.querySelector('.progress-text');
            progressText.textContent = message;
        }
    }

    showProgressSummary(results) {
        const summary = document.getElementById('progressSummary');
        const successCount = document.getElementById('successCount');
        const failedCount = document.getElementById('failedCount');
        const successList = document.getElementById('successList');
        const failedList = document.getElementById('failedList');
        
        successCount.textContent = results.success.length;
        failedCount.textContent = results.failed.length;
        
        successList.innerHTML = results.success
            .map(record => `<li>✓ ${this.app.vinyl.escapeHtml(record.artist_name)} - ${this.app.vinyl.escapeHtml(record.title)}</li>`)
            .join('');
            
        failedList.innerHTML = results.failed
            .map(record => `<li>✗ ${this.app.vinyl.escapeHtml(record.artist_name)} - ${this.app.vinyl.escapeHtml(record.title)}</li>`)
            .join('');
            
        summary.classList.remove('hidden');
    }
} 