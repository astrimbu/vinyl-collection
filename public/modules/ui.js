export class UIManager {
    constructor(app) {
        this.app = app;
        this.viewButtons = document.querySelectorAll('.view-btn');
        this.searchInput = document.getElementById('searchInput');
        this.vinylList = document.getElementById('vinylList');
        this.vinylGrid = document.getElementById('vinylGrid');
        this.errorTimeout = null;
        this.notificationContainer = document.getElementById('notificationContainer');
        this.googleSheetsBtn = document.getElementById('googleSheetsBtn');
        this.syncSheetsBtn = document.getElementById('syncSheetsBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
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
        // Initialize settings modal
        if (this.settingsBtn && this.settingsModal) {
            this.settingsBtn.addEventListener('click', () => {
                this.settingsModal.classList.remove('hidden');
            });

            // Close button in settings modal
            const closeBtn = this.settingsModal.querySelector('.close-button');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.settingsModal.classList.add('hidden');
                });
            }

            // Close on click outside
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) {
                    this.settingsModal.classList.add('hidden');
                }
            });
        }

        // Initialize collapsible functionality
        const header = document.querySelector('.collapsible-header');
        const content = document.querySelector('.collapsible-content');
        
        if (header && content) {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
                
                // Update the expand icon rotation based on state
                const icon = header.querySelector('.material-icons');
                if (icon) {
                    icon.style.transform = header.classList.contains('collapsed') ? 
                        'rotate(-90deg)' : 'rotate(0deg)';
                }
            });
        }

        // Google Sheets integration
        if (this.googleSheetsBtn) {
            this.googleSheetsBtn.addEventListener('click', async () => {
                if (this.app.googleSheets.isConnected) {
                    this.app.googleSheets.disconnect();
                } else {
                    await this.app.googleSheets.connect();
                }
            });
        }

        if (this.syncSheetsBtn) {
            this.syncSheetsBtn.addEventListener('click', async () => {
                try {
                    this.syncSheetsBtn.disabled = true;
                    this.syncSheetsBtn.textContent = 'Syncing...';
                    
                    await this.app.googleSheets.syncCollection();
                    
                    this.showSuccess('Collection synced with Google Sheets');
                } catch (error) {
                    console.error('Error syncing collection:', error);
                    
                    // Check if the spreadsheet was deleted
                    if (error.response && error.response.data && error.response.data.errorCode === 'SPREADSHEET_NOT_FOUND') {
                        this.showError('This spreadsheet could not be found. It may have been deleted.');
                        
                        // Show a modal to explain and guide the user
                        this.app.modal.showModal({
                            title: 'Spreadsheet Not Found',
                            content: `
                                <p>The Google Sheet used for your vinyl collection could not be found. It may have been deleted.</p>
                                <p>To fix this:</p>
                                <ol>
                                    <li>Click "Disconnect" from Google Sheets</li>
                                    <li>Then "Connect" again to create a new spreadsheet</li>
                                </ol>
                            `,
                            buttons: [
                                {
                                    text: 'Disconnect Now',
                                    class: 'btn-primary',
                                    action: () => {
                                        this.app.googleSheets.disconnect();
                                        this.app.modal.closeAllModals();
                                    }
                                },
                                {
                                    text: 'Close',
                                    class: 'btn-secondary',
                                    action: () => this.app.modal.closeAllModals()
                                }
                            ]
                        });
                    } else {
                        this.showError('Failed to sync with Google Sheets: ' + (error.message || 'Unknown error'));
                    }
                } finally {
                    this.syncSheetsBtn.disabled = false;
                    this.syncSheetsBtn.textContent = 'Sync with Sheets';
                }
            });
        }

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

    showNotification(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.notificationContainer.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('visible'), 10);

        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300); // Match transition duration
        }, duration);
    }

    showError(message, duration = 3000) {
        this.showNotification(message, 'error', duration);
    }

    showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
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
        } else {
            loadingContainer.querySelector('.loading-message').textContent = message;
        }
        loadingContainer.classList.add('visible');
    }

    hideLoading() {
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.classList.remove('visible');
            // Remove the element after animation
            setTimeout(() => {
                loadingContainer.remove();
            }, 300); // Match your CSS transition duration
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

    updateGoogleSheetsUI(isConnected) {
        if (this.googleSheetsBtn) {
            const text = this.googleSheetsBtn.querySelector('span:not(.material-icons)');
            if (text) {
                text.textContent = isConnected ? 'Disconnect Google Sheets' : 'Connect Google Sheets';
            }
            this.googleSheetsBtn.classList.toggle('connected', isConnected);
        }
        
        if (this.syncSheetsBtn) {
            this.syncSheetsBtn.classList.toggle('hidden', !isConnected);
        }
    }
} 