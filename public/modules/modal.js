export class ModalManager {
    constructor(app) {
        this.app = app;
        this.activeModals = new Set();
        
        // Add event listener for album modal close button
        const albumModal = document.getElementById('albumModal');
        const closeBtn = albumModal.querySelector('.close-button');
        closeBtn.addEventListener('click', () => {
            albumModal.classList.add('hidden');
        });
    }

    showAuthModal() {
        const modalContent = `
            <div class="auth-tabs">
                <button class="tab-btn active" data-tab="login">Login</button>
                <button class="tab-btn" data-tab="register">Register</button>
            </div>
            <div class="tab-content" id="loginTab">
                <form id="loginForm">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit" class="submit-btn">Log In</button>
                </form>
            </div>
            <div class="tab-content hidden" id="registerTab">
                <form id="registrationForm">
                    <div class="form-group">
                        <label for="reg-username">Username</label>
                        <input type="text" id="reg-username" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-email">Email</label>
                        <input type="email" id="reg-email" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-password">Password</label>
                        <input type="password" id="reg-password" required minlength="4">
                        <small>Password must be at least 4 characters long</small>
                    </div>
                    <div class="form-group">
                        <label for="reg-password-confirm">Confirm Password</label>
                        <input type="password" id="reg-password-confirm" required>
                    </div>
                    <button type="submit" class="submit-btn">Create Account</button>
                </form>
            </div>
        `;

        this.showFormModal('Authentication', modalContent, null, false);

        // Add form submission handlers
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                await this.app.auth.login(username, password);
                this.closeAllModals();
            } catch (error) {
                this.app.ui.showError('Login failed');
            }
        });

        document.getElementById('registrationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const passwordConfirm = document.getElementById('reg-password-confirm').value;

            if (password !== passwordConfirm) {
                this.app.ui.showError('Passwords do not match');
                return;
            }

            try {
                await this.app.auth.register({ username, email, password });
                // Clear the registration form
                e.target.reset();
                // Switch to login tab
                document.querySelector('[data-tab="login"]').click();
                // Show success message in the modal
                const loginTab = document.getElementById('loginTab');
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Registration successful! Please log in.';
                loginTab.insertBefore(successMsg, loginTab.firstChild);
                
                // Remove the message after 30 seconds
                setTimeout(() => successMsg.remove(), 30000);
            } catch (error) {
                this.app.ui.showError('Registration failed');
            }
        });

        // Add tab switching functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}Tab`).classList.remove('hidden');
            });
        });
    }

    showFormModal(title, content, onSave, showButtons = true) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                <div class="modal-buttons">
                    <button class="cancel-btn">Cancel</button>
                    <button class="save-btn">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModals.add(modal);

        const closeModal = () => {
            modal.remove();
            this.activeModals.delete(modal);
        };

        modal.querySelector('.close-button').addEventListener('click', closeModal);
        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
        modal.querySelector('.save-btn').addEventListener('click', () => onSave(closeModal));

        const buttonSection = modal.querySelector('.modal-buttons');
        if (!showButtons) {
            buttonSection.classList.add('hidden');
        }

        return modal;
    }

    showAlbumModal(vinyl) {
        const modal = document.getElementById('albumModal');
        
        // Add close button if it doesn't exist
        if (!modal.querySelector('.close-button')) {
            const closeButton = document.createElement('button');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '&times;';
            closeButton.onclick = () => modal.classList.add('hidden');
            modal.insertAdjacentElement('afterbegin', closeButton);
        }

        const artwork = modal.querySelector('.album-artwork');
        const artist = modal.querySelector('.album-artist');
        const title = modal.querySelector('.album-title');
        const notes = modal.querySelector('.album-notes');
        const metadata = modal.querySelector('.album-metadata');
        const tracksContainer = modal.querySelector('.tracks-container');

        artwork.innerHTML = (vinyl.artwork_url && !vinyl.artwork_url.includes('spacer.gif')) ? 
            `<img src="${this.app.vinyl.escapeHtml(vinyl.artwork_url)}" alt="Album artwork">` : 
            '<div class="no-artwork">No Image</div>';
        artist.textContent = vinyl.artist_name;
        title.textContent = vinyl.title;
        notes.textContent = vinyl.notes || '';
        metadata.innerHTML = `
            ${vinyl.identifier ? `<div>ID: ${this.app.vinyl.escapeHtml(vinyl.identifier)}</div>` : ''}
            ${vinyl.weight ? `<div>Weight: ${vinyl.weight}g</div>` : ''}
            ${vinyl.dupe ? '<div><span class="dupe-badge">Duplicate</span></div>' : ''}
        `;

        this.loadTracks(vinyl, tracksContainer);
        modal.classList.remove('hidden');

        // Add admin actions if user is authenticated
        const isAdmin = this.app.auth.isAuthenticated();
        const adminActions = modal.querySelector('.admin-actions');
        if (adminActions) {
            adminActions.remove(); // Remove existing actions if present
        }
        
        if (isAdmin) {
            const actionsHtml = `
                <div class="admin-actions">
                    <button onclick="app.admin.editVinyl(${vinyl.id})" class="edit-btn">Edit</button>
                    <button class="change-release-btn">Change Release</button>
                    <button onclick="app.admin.deleteVinyl(${vinyl.id})" class="delete-btn">Delete</button>
                </div>
            `;
            modal.querySelector('.album-details').insertAdjacentHTML('beforeend', actionsHtml);
            
            // Add event listener for change release button
            const changeReleaseBtn = modal.querySelector('.change-release-btn');
            changeReleaseBtn.addEventListener('click', () => {
                this.showReleaseSelector(vinyl);
            });
        }
    }

    async loadTracks(vinyl, container) {
        container.innerHTML = `
            <div class="loading-tracks">
                <div class="loading-spinner"></div>
                <p>Loading tracks...</p>
            </div>
        `;

        try {
            // Check if vinyl has an ID
            if (!vinyl.id) {
                throw new Error('Invalid vinyl record');
            }

            const tracks = await this.app.vinyl.fetchTracks(vinyl);
            
            // More robust check for valid track data
            if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
                container.innerHTML = '<p class="text-secondary">No track information available</p>';
                return;
            }

            container.innerHTML = tracks.map(track => `
                <div class="track-item">
                    <span class="track-position">${this.app.vinyl.escapeHtml(track.position)}</span>
                    <span class="track-title">${this.app.vinyl.escapeHtml(track.title)}</span>
                    <span class="track-duration">${this.app.vinyl.escapeHtml(track.duration || '')}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading tracks:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Failed to load tracks</p>
                    <div class="error-details">
                        <p>Search attempted with:</p>
                        <pre>Artist: ${this.app.vinyl.escapeHtml(vinyl.artist_name)}
Title: ${this.app.vinyl.escapeHtml(vinyl.title)}</pre>
                    </div>
                    <button onclick="app.modal.loadTracks(${JSON.stringify(vinyl)}, this.closest('.tracks-container'))">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    closeAllModals() {
        this.activeModals.forEach(modal => modal.remove());
        this.activeModals.clear();
        
        // Also close the album modal
        document.getElementById('albumModal').classList.add('hidden');
    }

    async showReleaseSelector(vinyl) {
        const container = document.querySelector('.tracks-container');
        container.innerHTML = `
            <div class="loading-tracks">
                <div class="loading-spinner"></div>
                <p>Loading alternate releases...</p>
            </div>
        `;

        try {
            const response = await fetch(`/api/vinyl/${vinyl.id}/alternate-releases`, {
                headers: this.app.auth.getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Failed to fetch releases');
            
            const releases = await response.json();

            let displayCount = 5;
            
            const renderReleases = (count) => {
                const visibleReleases = releases.slice(0, count);
                return `
                    <div class="release-selector">
                        <h4>Select Correct Release:</h4>
                        <div class="release-list">
                            ${visibleReleases.map(release => `
                                <div class="release-option" data-release-id="${release.id}">
                                    <img src="${release.thumb}" alt="Release thumbnail">
                                    <div class="release-details">
                                        <div class="release-title">${release.title}</div>
                                        <div class="release-meta">
                                            ${release.year} · ${release.country} · ${release.format}
                                            <br>Label: ${release.label}
                                        </div>
                                    </div>
                                    <div class="release-buttons">
                                        <button class="select-release-btn">Select Release</button>
                                        <button class="artwork-only-btn">Use Artwork Only</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${releases.length > count ? `
                            <button class="see-more-btn">
                                <span>Show More Results (${releases.length - count} remaining)</span>
                            </button>
                        ` : ''}
                    </div>
                `;
            };

            const updateContent = (count) => {
                container.innerHTML = renderReleases(count);
                
                // Add click handlers for full release selection
                container.querySelectorAll('.select-release-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const releaseId = e.target.closest('.release-option').dataset.releaseId;
                        await this.updateRelease(vinyl, releaseId, false);
                    });
                });

                // Add click handlers for artwork-only selection
                container.querySelectorAll('.artwork-only-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const releaseId = e.target.closest('.release-option').dataset.releaseId;
                        await this.updateRelease(vinyl, releaseId, true);
                    });
                });

                // Add click handler for "See More" button
                const seeMoreBtn = container.querySelector('.see-more-btn');
                if (seeMoreBtn) {
                    seeMoreBtn.addEventListener('click', () => {
                        displayCount += 5;
                        updateContent(displayCount);
                    });
                }
            };

            updateContent(displayCount);

        } catch (error) {
            console.error('Error loading releases:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <p>Failed to load alternate releases</p>
                <button class="try-again-btn">Try Again</button>
            `;
            
            const tryAgainBtn = errorDiv.querySelector('.try-again-btn');
            tryAgainBtn.addEventListener('click', () => this.showReleaseSelector(vinyl));
            
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }

    async updateRelease(vinyl, releaseId, artworkOnly = false) {
        const container = document.querySelector('.tracks-container');
        container.innerHTML = `
            <div class="loading-tracks">
                <div class="loading-spinner"></div>
                <p>Updating release information...</p>
            </div>
        `;

        try {
            const response = await fetch(`/api/vinyl/${vinyl.id}/update-release`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.app.auth.getAuthHeaders()
                },
                body: JSON.stringify({ releaseId, artworkOnly })
            });

            if (!response.ok) throw new Error('Failed to update release');
            
            const data = await response.json();
            
            // Update the vinyl object with new data
            vinyl.artwork_url = data.artwork_url;
            if (!artworkOnly) {
                vinyl.tracks = JSON.stringify(data.tracks);
            }
            
            // Refresh the modal display
            this.showAlbumModal(vinyl);
            
            // Refresh the main collection display
            await this.app.vinyl.loadVinyls();
            
            this.app.ui.showSuccess(artworkOnly ? 'Artwork updated successfully' : 'Release updated successfully');
        } catch (error) {
            console.error('Error updating release:', error);
            this.app.ui.showError('Failed to update release');
            this.loadTracks(vinyl, container);
        }
    }
} 