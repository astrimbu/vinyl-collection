const authSection = document.getElementById('authSection');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const vinylForm = document.getElementById('vinylForm');
const adminVinylTableBody = document.getElementById('adminVinylTableBody');
const adminSearchInput = document.getElementById('adminSearchInput');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const updateArtworkBtn = document.getElementById('updateArtworkBtn');
const updateProgress = document.getElementById('updateProgress');
const progressCount = document.getElementById('progressCount');
const totalCount = document.getElementById('totalCount');
const currentRecord = document.getElementById('currentRecord');

let currentSort = { field: 'artist_name', ascending: true };
let vinylCollection = [];

function checkAuthStatus() {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        showAdminPanel();
        fetchVinyls();
    }
}

function showAdminPanel() {
    authSection.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
}

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('adminToken');
    location.reload();
});

function sortVinyls(field) {
    if (currentSort.field === field) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.field = field;
        currentSort.ascending = true;
    }

    const sortedVinyls = [...vinylCollection].sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        return currentSort.ascending ? 
            String(aVal).localeCompare(String(bVal)) : 
            String(bVal).localeCompare(String(aVal));
    });

    displayVinyls(sortedVinyls);
}

async function fetchVinyls() {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch('/api/vinyl', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch vinyls');
        }
        
        const data = await response.json();
        vinylCollection = data;
        displayVinyls(data);
    } catch (error) {
        console.error('Error fetching vinyls:', error);
    }
}

function displayVinyls(vinyls) {
    const adminVinylTableBody = document.getElementById('adminVinylTableBody');
    adminVinylTableBody.innerHTML = '';
    
    if (!Array.isArray(vinyls)) {
        console.error('Expected array of vinyls, got:', vinyls);
        return;
    }
    
    vinyls.forEach(vinyl => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                ${vinyl.artwork_url ? 
                    `<img src="${escapeHtml(vinyl.artwork_url)}" alt="Album artwork" class="album-thumb">` : 
                    '<div class="no-artwork">No Image</div>'
                }
                ${escapeHtml(vinyl.artist_name)}
            </td>
            <td>${escapeHtml(vinyl.title)}</td>
            <td>${escapeHtml(vinyl.identifier || '')}</td>
            <td>${vinyl.weight || ''}</td>
            <td>${escapeHtml(vinyl.notes || '')}</td>
            <td>${vinyl.dupe ? '<span class="dupe-badge">Duplicate</span>' : ''}</td>
            <td>
                <button onclick="editVinyl(${vinyl.id})" class="edit-btn">Edit</button>
                <button onclick="deleteVinyl(${vinyl.id})" class="delete-btn">Delete</button>
            </td>
        `;
        adminVinylTableBody.appendChild(row);
    });
}

async function handleAddVinyl(e) {
    e.preventDefault();
    
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch('/api/vinyl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(vinylData)
        });

        if (!response.ok) {
            throw new Error('Failed to add vinyl record');
        }

        vinylForm.reset();
        fetchVinyls();
    } catch (error) {
        console.error('Error adding vinyl:', error);
        alert(error.message || 'Failed to add vinyl record');
    }
}

async function deleteVinyl(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
        const response = await fetch(`/api/vinyl/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });

        if (response.ok) {
            fetchVinyls();
        } else {
            alert('Failed to delete vinyl record');
        }
    } catch (error) {
        console.error('Error deleting vinyl:', error);
        alert('Failed to delete vinyl record');
    }
}

async function editVinyl(id) {
    const vinyl = vinylCollection.find(v => v.id === id);
    if (!vinyl) return;

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h2>Edit Record</h2>
                <form id="editForm">
                    <div class="form-group">
                        <label for="edit-artist_name">Artist Name:</label>
                        <input type="text" id="edit-artist_name" required value="${escapeHtml(vinyl.artist_name)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-title">Title:</label>
                        <input type="text" id="edit-title" required value="${escapeHtml(vinyl.title)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-identifier">Identifier:</label>
                        <input type="text" id="edit-identifier" value="${escapeHtml(vinyl.identifier || '')}">
                    </div>
                    <div class="form-group">
                        <label for="edit-weight">Weight (g):</label>
                        <input type="number" id="edit-weight" value="${vinyl.weight || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-notes">Notes:</label>
                        <textarea id="edit-notes">${escapeHtml(vinyl.notes || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="edit-dupe" ${vinyl.dupe ? 'checked' : ''}>
                            Duplicate Copy
                        </label>
                    </div>
                    <div class="modal-buttons">
                        <button type="button" class="cancel-btn" onclick="closeEditModal()">Cancel</button>
                        <button type="submit" class="update-btn">Update Record</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalOverlay = document.querySelector('.modal-overlay');
    const editForm = document.getElementById('editForm');

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeEditModal();
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            artist_name: document.getElementById('edit-artist_name').value,
            title: document.getElementById('edit-title').value,
            identifier: document.getElementById('edit-identifier').value,
            weight: document.getElementById('edit-weight').value ? parseInt(document.getElementById('edit-weight').value) : null,
            notes: document.getElementById('edit-notes').value,
            dupe: document.getElementById('edit-dupe').checked
        };

        try {
            const response = await fetch(`/api/vinyl/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update vinyl record');
            }

            closeEditModal();
            fetchVinyls();
        } catch (error) {
            console.error('Error updating vinyl:', error);
            alert('Failed to update vinyl record');
        }
    });

    document.addEventListener('keydown', handleEscapeKey);
}

function closeEditModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.remove();
        document.removeEventListener('keydown', handleEscapeKey);
    }
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeEditModal();
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function checkAdminExists() {
    try {
        const response = await fetch('/api/admin-exists');
        const data = await response.json();
        
        if (!data.exists) {
            showInitForm();
        } else {
            showLoginForm();
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        showLoginForm();
    }
}

function showInitForm() {
    authSection.innerHTML = `
        <form id="initAdminForm">
            <h2>Initialize Admin Account</h2>
            <div class="form-group">
                <label for="init-username">Username:</label>
                <input type="text" id="init-username" required>
            </div>
            <div class="form-group">
                <label for="init-password">Password:</label>
                <input type="password" id="init-password" required minlength="4">
            </div>
            <button type="submit">Create Admin</button>
        </form>
    `;
    document.getElementById('initAdminForm').addEventListener('submit', handleInitAdmin);
}

function showLoginForm() {
    authSection.innerHTML = `
        <form id="loginForm">
            <h2>Login</h2>
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" required>
            </div>
            <button type="submit">Login</button>
            <p class="auth-switch">
                Need an account? <a href="#" onclick="showRegistrationForm(); return false;">Register</a>
            </p>
        </form>
    `;
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('adminToken', data.token);
            sessionStorage.setItem('userData', JSON.stringify({
                id: data.user.id,
                username: data.user.username,
                email: data.user.email
            }));
            showAdminPanel();
            fetchVinyls();
        } else {
            alert(data.error || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

function showRegistrationForm() {
    authSection.innerHTML = `
        <form id="registrationForm">
            <h2>Create Account</h2>
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
            <button type="submit">Register</button>
            <p class="auth-switch">
                Already have an account? <a href="#" onclick="showLoginForm(); return false;">Login</a>
            </p>
        </form>
    `;
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password !== passwordConfirm) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 4) {
        alert('Password must be at least 4 characters long');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration successful! Please log in.');
            showLoginForm();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        showAdminPanel();
        fetchVinyls();
    } else {
        showLoginForm();
    }

    vinylForm.addEventListener('submit', handleAddVinyl);
    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const csvContent = e.target.result;
                const token = sessionStorage.getItem('adminToken');
                
                const response = await fetch('/api/vinyl/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/csv',
                        'Authorization': `Bearer ${token}`
                    },
                    body: csvContent
                });

                if (!response.ok) {
                    throw new Error('Import failed');
                }

                const result = await response.json();
                alert(`Successfully imported ${result.count} records`);
                fetchVinyls();
            } catch (error) {
                console.error('Import error:', error);
                alert('Failed to import records. Please check the file format and try again.');
            }
        };
        reader.readAsText(file);
    });

    updateArtworkBtn.addEventListener('click', updateMissingArtwork);
});

adminSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredVinyls = vinylCollection.filter(vinyl => 
        vinyl.artist_name.toLowerCase().includes(searchTerm) ||
        vinyl.title.toLowerCase().includes(searchTerm) ||
        (vinyl.notes && vinyl.notes.toLowerCase().includes(searchTerm)) ||
        (vinyl.identifier && vinyl.identifier.toLowerCase().includes(searchTerm))
    );
    displayVinyls(filteredVinyls);
});

function getToken() {
    return sessionStorage.getItem('adminToken');
}

async function updateMissingArtwork(e) {
    e.preventDefault();
    
    try {
        updateResults = { success: [], failed: [] };
        successList.innerHTML = '';
        failedList.innerHTML = '';
        progressSummary.classList.add('hidden');
        
        updateArtworkBtn.disabled = true;
        updateProgress.classList.add('visible');
        
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch('/api/vinyl/update-artwork', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.totalRecords === 0) {
            alert('No records need artwork updates!');
            updateArtworkBtn.disabled = false;
            updateProgress.classList.remove('visible');
            return;
        }

        totalCount.textContent = data.totalRecords;
        let processedCount = 0;

        const pollInterval = setInterval(async () => {
            const progressResponse = await fetch('/api/vinyl/update-artwork/progress', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const progressData = await progressResponse.json();
            
            processedCount = progressData.processed;
            progressCount.textContent = processedCount;
            
            if (progressData.results) {
                updateResults = progressData.results;
                updateSummary();
            }
            
            const progressPercent = (processedCount / data.totalRecords) * 100;
            document.querySelector('.progress-fill').style.width = `${progressPercent}%`;

            if (progressData.completed || processedCount >= data.totalRecords) {
                clearInterval(pollInterval);
                updateArtworkBtn.disabled = false;
                progressSummary.classList.remove('hidden');
                fetchVinyls();
            }
        }, 2000);

    } catch (error) {
        console.error('Error updating artwork:', error);
        alert('Failed to update artwork');
        updateArtworkBtn.disabled = false;
        updateProgress.classList.remove('visible');
    }
}

function updateSummary() {
    successCount.textContent = updateResults.success.length;
    failedCount.textContent = updateResults.failed.length;
    
    successList.innerHTML = updateResults.success
        .map(record => `<li>✓ ${record.artist_name} - ${record.title}</li>`)
        .join('');
    
    failedList.innerHTML = updateResults.failed
        .map(record => `
            <li>
                <a href="#" onclick="searchFor('${record.title}')">
                    ✗ ${escapeHtml(record.artist_name)} - ${escapeHtml(record.title)}
                </a>
            </li>
        `)
        .join('');
}

function searchFor(searchTerm) {
    adminSearchInput.value = searchTerm;
    const event = new Event('input');
    adminSearchInput.dispatchEvent(event);
    updateProgress.classList.remove('visible');
}

closeProgress.addEventListener('click', () => {
    updateProgress.classList.remove('visible');
});
