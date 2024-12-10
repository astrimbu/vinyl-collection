export class VinylManager {
    constructor(app) {
        this.app = app;
        this.collection = [];
        this.currentSort = { field: 'artist_name', ascending: true };
    }

    async loadVinyls() {
        try {
            const endpoint = this.app.auth.isAuthenticated() ? '/api/vinyl' : '/api/public/vinyl';
            const headers = this.app.auth.getAuthHeaders();
            
            const response = await fetch(endpoint, { headers });
            if (!response.ok) throw new Error('Failed to fetch vinyl records');
            
            this.collection = await response.json();
            this.displayVinyls();
        } catch (error) {
            console.error('Error loading vinyls:', error);
            this.app.ui.showError('Failed to load vinyl collection');
        }
    }

    displayVinyls(vinyls = this.collection) {
        const isAdmin = this.app.auth.isAuthenticated();
        const currentView = document.querySelector('.view-btn.active').dataset.view;
        
        if (currentView === 'table') {
            this.displayTableView(vinyls, isAdmin);
        } else {
            this.displayGridView(vinyls, isAdmin);
        }
    }

    displayTableView(vinyls, isAdmin) {
        const tbody = document.getElementById('vinylTableBody');
        tbody.innerHTML = '';
        
        vinyls.forEach(vinyl => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${vinyl.artwork_url ? 
                        `<img src="${this.escapeHtml(vinyl.artwork_url)}" alt="Album artwork" class="album-thumb">` : 
                        '<div class="no-artwork">No Image</div>'
                    }
                    ${this.escapeHtml(vinyl.artist_name)}
                </td>
                <td>${this.escapeHtml(vinyl.title)}</td>
                <td class="notes-cell">${this.escapeHtml(vinyl.notes || '')}</td>
                <td>${vinyl.dupe ? '<span class="dupe-badge">Duplicate</span>' : ''}</td>
            `;
            
            row.addEventListener('click', () => {
                this.app.modal.showAlbumModal(vinyl);
            });
            
            tbody.appendChild(row);
        });
    }

    displayGridView(vinyls, isAdmin) {
        const grid = document.getElementById('vinylGrid');
        grid.innerHTML = '';
        
        vinyls.forEach(vinyl => {
            const card = document.createElement('div');
            card.className = 'vinyl-card';
            card.innerHTML = `
                <div class="artwork">
                    ${vinyl.artwork_url ? 
                        `<img src="${this.escapeHtml(vinyl.artwork_url)}" alt="Album artwork">` : 
                        '<div class="no-artwork">No Image</div>'
                    }
                    ${isAdmin ? `
                        <div class="admin-actions">
                            <button onclick="app.admin.editVinyl(${vinyl.id})" class="edit-btn">Edit</button>
                            <button onclick="app.admin.deleteVinyl(${vinyl.id})" class="delete-btn">Delete</button>
                        </div>
                    ` : ''}
                </div>
                <div class="info">
                    <div class="artist">${this.escapeHtml(vinyl.artist_name)}</div>
                    <div class="title">${this.escapeHtml(vinyl.title)}</div>
                    <div class="metadata">
                        ${vinyl.dupe ? '<span class="dupe-badge">Duplicate</span>' : ''}
                    </div>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.admin-actions')) {
                    this.app.modal.showAlbumModal(vinyl);
                }
            });
            
            grid.appendChild(card);
        });
    }

    sortVinyls(field) {
        if (this.currentSort.field === field) {
            this.currentSort.ascending = !this.currentSort.ascending;
        } else {
            this.currentSort.field = field;
            this.currentSort.ascending = true;
        }

        const sortedVinyls = [...this.collection].sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';
            return this.currentSort.ascending ? 
                String(aVal).localeCompare(String(bVal)) : 
                String(bVal).localeCompare(String(aVal));
        });

        this.displayVinyls(sortedVinyls);
    }

    async fetchTracks(vinyl) {
        try {
            if (!vinyl.id) {
                throw new Error('Invalid vinyl record ID');
            }

            const endpoint = this.app.auth.isAuthenticated() ? 
                `/api/vinyl/${vinyl.id}/tracks` : 
                `/api/public/vinyl/${vinyl.id}/tracks`;
            
            const headers = this.app.auth.getAuthHeaders();
            
            const response = await fetch(endpoint, { headers });
            
            if (!response.ok) throw new Error('Failed to fetch tracks');
            
            const data = await response.json();
            return data.tracks || [];
        } catch (error) {
            console.error('Error fetching tracks:', error);
            throw error;
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
} 