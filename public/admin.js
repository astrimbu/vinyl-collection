// DOM Elements
const authSection = document.getElementById('authSection');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const vinylForm = document.getElementById('vinylForm');
const adminVinylTableBody = document.getElementById('adminVinylTableBody');

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

// Add at the top with other state variables
let currentSort = { field: 'artist_name', ascending: true };

// Add vinylCollection state variable at the top
let vinylCollection = [];

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
vinylForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        artist_name: document.getElementById('artist_name').value,
        title: document.getElementById('title').value,
        identifier: document.getElementById('identifier').value,
        weight: document.getElementById('weight').value || null,
        notes: document.getElementById('notes').value,
        dupe: document.getElementById('dupe').checked
    };

    try {
        const response = await fetch('/api/vinyl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            vinylForm.reset();
            fetchVinyls();
        } else {
            alert('Failed to add vinyl record');
        }
    } catch (error) {
        console.error('Error adding vinyl:', error);
        alert('Failed to add vinyl record');
    }
});

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
});
