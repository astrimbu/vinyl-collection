// DOM Elements
const searchInput = document.getElementById('searchInput');
const vinylTableBody = document.getElementById('vinylTableBody');

// State
let vinylCollection = [];
let currentSort = { field: 'artist_name', ascending: true };

// Fetch vinyls
async function fetchVinyls() {
    try {
        const response = await fetch('/api/vinyl');
        const data = await response.json();
        vinylCollection = data;
        displayVinyls(vinylCollection);
    } catch (error) {
        console.error('Error fetching vinyls:', error);
    }
}

// Display vinyls
function displayVinyls(vinyls) {
    vinylTableBody.innerHTML = '';
    
    vinyls.forEach(vinyl => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(vinyl.artist_name)}</td>
            <td>${escapeHtml(vinyl.title)}</td>
            <td>${escapeHtml(vinyl.identifier || '')}</td>
            <td>${vinyl.weight || ''}</td>
            <td>${escapeHtml(vinyl.notes || '')}</td>
            ${vinyl.dupe ? '<td><span class="dupe-badge">Duplicate</span></td>' : '<td></td>'}
        `;
        vinylTableBody.appendChild(row);
    });
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredVinyls = vinylCollection.filter(vinyl => 
        vinyl.artist_name.toLowerCase().includes(searchTerm) ||
        vinyl.title.toLowerCase().includes(searchTerm) ||
        (vinyl.notes && vinyl.notes.toLowerCase().includes(searchTerm)) ||
        (vinyl.identifier && vinyl.identifier.toLowerCase().includes(searchTerm))
    );
    displayVinyls(filteredVinyls);
});

// Sorting functionality
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

// Utility function to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initial load
document.addEventListener('DOMContentLoaded', fetchVinyls);
