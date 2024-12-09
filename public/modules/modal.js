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
                        <label for="username">Username:</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" required>
                    </div>
                </form>
            </div>
            <div class="tab-content hidden" id="registerTab">
                <form id="registrationForm">
                    <div class="form-group">
                        <label for="reg-username">Username:</label>
                        <input type="text" id="reg-username" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-email">Email:</label>
                        <input type="email" id="reg-email" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-password">Password:</label>
                        <input type="password" id="reg-password" required minlength="4">
                        <small>Password must be at least 4 characters long</small>
                    </div>
                    <div class="form-group">
                        <label for="reg-password-confirm">Confirm Password:</label>
                        <input type="password" id="reg-password-confirm" required>
                    </div>
                </form>
            </div>
        `;

        this.showFormModal('Authentication', modalContent, async (closeModal) => {
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            
            if (activeTab === 'login') {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                try {
                    await this.app.auth.login(username, password);
                    closeModal();
                } catch (error) {
                    this.app.ui.showError('Login failed');
                }
            } else {
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
                    this.app.ui.showError('Registration successful! Please log in.', 2000);
                    document.querySelector('[data-tab="login"]').click();
                } catch (error) {
                    this.app.ui.showError('Registration failed');
                }
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

    showFormModal(title, content, onSave) {
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

        artwork.innerHTML = vinyl.artwork_url ? 
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
} 