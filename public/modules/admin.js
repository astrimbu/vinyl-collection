export class AdminManager {
    constructor(app) {
        this.app = app;
        this.vinylForm = document.getElementById('vinylForm');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');
        this.updateArtworkBtn = document.getElementById('updateArtworkBtn');
        this.updateProgress = document.getElementById('updateProgress');
        this.closeProgress = document.getElementById('closeProgress');
        
        this.updateResults = {
            success: [],
            failed: []
        };
    }

    async init() {
        if (!this.app.auth.isAuthenticated()) return;

        // Show admin section
        document.getElementById('adminAddSection').classList.remove('hidden');
        
        // Initialize event listeners
        this.vinylForm.addEventListener('submit', (e) => this.handleAddVinyl(e));
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImport(e));
        this.updateArtworkBtn.addEventListener('click', (e) => this.updateMissingArtwork(e));
        this.closeProgress.addEventListener('click', () => this.hideProgress());
    }

    async handleAddVinyl(e) {
        e.preventDefault();
        
        try {
            const formData = {
                artist_name: document.getElementById('artist_name').value,
                title: document.getElementById('title').value,
                identifier: document.getElementById('identifier').value,
                weight: document.getElementById('weight').value ? parseInt(document.getElementById('weight').value) : null,
                notes: document.getElementById('notes').value,
                dupe: document.getElementById('dupe').checked
            };

            const response = await fetch('/api/vinyl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.app.auth.getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to add vinyl record');
            }

            this.vinylForm.reset();
            await this.app.vinyl.loadVinyls();
            this.app.ui.showError('Record added successfully', 2000);
        } catch (error) {
            console.error('Error adding vinyl:', error);
            this.app.ui.showError('Failed to add vinyl record');
        }
    }

    async editVinyl(id) {
        const vinyl = this.app.vinyl.collection.find(v => v.id === id);
        if (!vinyl) return;

        const modalContent = `
            <form id="editForm">
                <div class="form-group">
                    <label for="edit-artist_name">Artist Name:</label>
                    <input type="text" id="edit-artist_name" required value="${this.app.vinyl.escapeHtml(vinyl.artist_name)}">
                </div>
                <div class="form-group">
                    <label for="edit-title">Title:</label>
                    <input type="text" id="edit-title" required value="${this.app.vinyl.escapeHtml(vinyl.title)}">
                </div>
                <div class="form-group">
                    <label for="edit-identifier">Identifier:</label>
                    <input type="text" id="edit-identifier" value="${this.app.vinyl.escapeHtml(vinyl.identifier || '')}">
                </div>
                <div class="form-group">
                    <label for="edit-weight">Weight (g):</label>
                    <input type="number" id="edit-weight" value="${vinyl.weight || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-notes">Notes:</label>
                    <textarea id="edit-notes">${this.app.vinyl.escapeHtml(vinyl.notes || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-dupe" ${vinyl.dupe ? 'checked' : ''}>
                        Duplicate Copy
                    </label>
                </div>
            </form>
        `;

        const handleSave = async (closeModal) => {
            try {
                const formData = {
                    artist_name: document.getElementById('edit-artist_name').value,
                    title: document.getElementById('edit-title').value,
                    identifier: document.getElementById('edit-identifier').value,
                    weight: document.getElementById('edit-weight').value ? parseInt(document.getElementById('edit-weight').value) : null,
                    notes: document.getElementById('edit-notes').value,
                    dupe: document.getElementById('edit-dupe').checked
                };

                const response = await fetch(`/api/vinyl/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.app.auth.getAuthHeaders()
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update vinyl record');
                }

                await this.app.vinyl.loadVinyls();
                closeModal();
                this.app.ui.showError('Record updated successfully', 2000);
            } catch (error) {
                console.error('Error updating vinyl:', error);
                this.app.ui.showError('Failed to update vinyl record');
            }
        };

        this.app.modal.showFormModal('Edit Record', modalContent, handleSave);
    }

    async deleteVinyl(id) {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            const response = await fetch(`/api/vinyl/${id}`, {
                method: 'DELETE',
                headers: this.app.auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete vinyl record');
            }

            await this.app.vinyl.loadVinyls();
            this.app.ui.showError('Record deleted successfully', 2000);
        } catch (error) {
            console.error('Error deleting vinyl:', error);
            this.app.ui.showError('Failed to delete vinyl record');
        }
    }

    async handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.app.ui.showLoading('Importing records...');
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const csvContent = e.target.result;
                    const response = await fetch('/api/vinyl/import', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'text/csv',
                            ...this.app.auth.getAuthHeaders()
                        },
                        body: csvContent
                    });

                    if (!response.ok) {
                        throw new Error('Import failed');
                    }

                    const result = await response.json();
                    this.app.ui.showError(`Successfully imported ${result.count} records`, 3000);
                    await this.app.vinyl.loadVinyls();
                } catch (error) {
                    console.error('Import error:', error);
                    this.app.ui.showError('Failed to import records');
                } finally {
                    this.app.ui.hideLoading();
                    event.target.value = ''; // Reset file input
                }
            };

            reader.readAsText(file);
        } catch (error) {
            console.error('Import error:', error);
            this.app.ui.showError('Failed to import records');
            this.app.ui.hideLoading();
        }
    }

    async updateMissingArtwork(e) {
        e.preventDefault();
        
        try {
            this.updateResults = { success: [], failed: [] };
            document.getElementById('successList').innerHTML = '';
            document.getElementById('failedList').innerHTML = '';
            document.getElementById('progressSummary').classList.add('hidden');
            
            this.updateArtworkBtn.disabled = true;
            this.updateProgress.classList.add('visible');
            
            const response = await fetch('/api/vinyl/update-artwork', {
                method: 'POST',
                headers: this.app.auth.getAuthHeaders()
            });

            const data = await response.json();
            
            if (data.totalRecords === 0) {
                this.app.ui.showError('No records need artwork updates!');
                this.updateArtworkBtn.disabled = false;
                this.hideProgress();
                return;
            }

            // Start polling for progress
            this.pollArtworkProgress(data.totalRecords);
        } catch (error) {
            console.error('Error updating artwork:', error);
            this.app.ui.showError('Failed to update artwork');
            this.updateArtworkBtn.disabled = false;
            this.hideProgress();
        }
    }

    async pollArtworkProgress(totalRecords) {
        try {
            const response = await fetch('/api/vinyl/update-artwork/progress', {
                headers: this.app.auth.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update progress UI
            const progressCount = document.getElementById('progressCount');
            const progressFill = document.querySelector('.progress-fill');
            const totalCount = document.getElementById('totalCount');
            
            // Set total count
            totalCount.textContent = totalRecords;
            
            if (data.currentRecord) {
                const currentCount = data.results.success.length + data.results.failed.length;
                
                if (data.currentRecord.completed) {
                    // Process is complete
                    progressCount.textContent = totalRecords;
                    progressFill.style.width = '100%';
                    
                    // Update the results
                    this.updateResults = data.results;
                    
                    // Show the summary
                    document.getElementById('progressSummary').classList.remove('hidden');
                    this.showProgressSummary();
                    this.updateArtworkBtn.disabled = false;
                    return;
                }
                
                progressCount.textContent = currentCount;
                progressFill.style.width = `${(currentCount / totalRecords) * 100}%`;
                
                // Continue polling
                setTimeout(() => this.pollArtworkProgress(totalRecords), 500);
            }
        } catch (error) {
            console.error('Error polling progress:', error);
            this.app.ui.showError('Error tracking progress');
            this.updateArtworkBtn.disabled = false;
            this.hideProgress();
        }
    }

    showProgressSummary() {
        const successCount = document.getElementById('successCount');
        const failedCount = document.getElementById('failedCount');
        const successList = document.getElementById('successList');
        const failedList = document.getElementById('failedList');
        
        successCount.textContent = this.updateResults.success.length;
        failedCount.textContent = this.updateResults.failed.length;
        
        successList.innerHTML = this.updateResults.success
            .map(record => `<li>✓ ${this.app.vinyl.escapeHtml(record.artist_name)} - ${this.app.vinyl.escapeHtml(record.title)}</li>`)
            .join('');
        
        failedList.innerHTML = this.updateResults.failed
            .map(record => `
                <li>
                    <a href="#" onclick="app.search.searchForRecord(${JSON.stringify(record)}); return false;">
                        ✗ ${this.app.vinyl.escapeHtml(record.artist_name)} - ${this.app.vinyl.escapeHtml(record.title)}
                    </a>
                </li>
            `)
            .join('');
    }

    hideProgress() {
        this.updateProgress.classList.remove('visible');
    }
}