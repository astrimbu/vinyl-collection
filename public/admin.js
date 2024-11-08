// DOM Elements
const authSection = document.getElementById('authSection');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const vinylForm = document.getElementById('vinylForm');
const adminVinylTableBody = document.getElementById('adminVinylTableBody');
const adminSearchInput = document.getElementById('adminSearchInput');

// State variables
let currentSort = { field: 'artist_name', ascending: true };
let vinylCollection = [];

// Check if user is already logged in
function checkAuthStatus() {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        showAdminPanel();
        fetchVinyls();
    }
}

// Login handling
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

        if (response.ok) {
            const { token } = await response.json();
            sessionStorage.setItem('adminToken', token);
            showAdminPanel();
            fetchVinyls();
        } else {
            alert('Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Show admin panel after successful login
function showAdminPanel() {
    authSection.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
}

// Logout handling
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('adminToken');
    location.reload();
});

// Add sorting function
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

// Fetch and display vinyl records
async function fetchVinyls() {
    try {
        const response = await fetch('/api/vinyl');
        vinylCollection = await response.json();
        displayVinyls(vinylCollection);
    } catch (error) {
        console.error('Error fetching vinyls:', error);
    }
}

// Display vinyl records with edit/delete buttons
function displayVinyls(vinyls) {
    adminVinylTableBody.innerHTML = '';
    
    vinyls.forEach(vinyl => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(vinyl.artist_name)}</td>
            <td>${escapeHtml(vinyl.title)}</td>
            <td>${escapeHtml(vinyl.identifier || '')}</td>
            <td>${vinyl.weight || ''}</td>
            <td>${escapeHtml(vinyl.notes || '')}</td>
            <td>${vinyl.dupe ? '<span class="dupe-badge">Yes</span>' : ''}</td>
            <td>
                <button onclick="editVinyl(${vinyl.id})" class="action-btn">Edit</button>
                <button onclick="deleteVinyl(${vinyl.id})" class="action-btn delete-btn">Delete</button>
            </td>
        `;
        adminVinylTableBody.appendChild(row);
    });
}

// Add new vinyl record
async function handleAddVinyl(e) {
    e.preventDefault();
    const formData = {
        artist_name: document.getElementById('artist_name').value,
        title: document.getElementById('title').value,
        identifier: document.getElementById('identifier').value,
        weight: document.getElementById('weight').value ? parseInt(document.getElementById('weight').value) : null,
        notes: document.getElementById('notes').value,
        dupe: document.getElementById('dupe').checked
    };

    console.log('Submitting form data:', formData); // Debug log

    try {
        const response = await fetch('/api/vinyl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });

        const responseData = await response.json();
        console.log('Server response:', responseData); // Debug log

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to add vinyl record');
        }

        // Reset form and refresh display
        vinylForm.reset();
        fetchVinyls();
    } catch (error) {
        console.error('Error adding vinyl:', error);
        alert(error.message || 'Failed to add vinyl record');
    }
}

// Delete vinyl record
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

// Edit vinyl record
async function editVinyl(id) {
    const vinyl = vinylCollection.find(v => v.id === id);
    if (!vinyl) return;

    // Create modal HTML
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

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners
    const modalOverlay = document.querySelector('.modal-overlay');
    const editForm = document.getElementById('editForm');

    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeEditModal();
        }
    });

    // Handle form submission
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

            // Close modal and refresh display
            closeEditModal();
            fetchVinyls();
        } catch (error) {
            console.error('Error updating vinyl:', error);
            alert('Failed to update vinyl record');
        }
    });

    // Add escape key listener
    document.addEventListener('keydown', handleEscapeKey);
}

// Close modal function
function closeEditModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.remove();
        document.removeEventListener('keydown', handleEscapeKey);
    }
}

// Handle escape key press
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeEditModal();
    }
}

// Utility function to prevent XSS (reused from scripts.js)
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Admin initialization
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
        showLoginForm(); // Default to login form if check fails
    }
}

// Show initialization form
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

// Show login form
function showLoginForm() {
    authSection.innerHTML = `
        <form id="loginForm">
            <h2>Admin Login</h2>
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" required>
            </div>
            <button type="submit">Login</button>
        </form>
    `;
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

async function handleInitAdmin(e) {
    e.preventDefault();
    const username = document.getElementById('init-username').value;
    const password = document.getElementById('init-password').value;

    try {
        const response = await fetch('/api/init-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            alert('Admin account created successfully. Please log in.');
            showLoginForm();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to create admin account');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
        alert('Failed to create admin account');
    }
}

// Update initialization
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        showAdminPanel();
        fetchVinyls();
    } else {
        checkAdminExists();
    }

    vinylForm.addEventListener('submit', handleAddVinyl);
});

// Add search event listener
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

// Get token from session storage
function getToken() {
    return sessionStorage.getItem('adminToken');
}
