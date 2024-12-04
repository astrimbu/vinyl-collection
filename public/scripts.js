// DOM Elements
const searchInput = document.getElementById('searchInput');
const vinylTableBody = document.getElementById('vinylTableBody');
const vinylList = document.getElementById('vinylList');
const vinylGrid = document.getElementById('vinylGrid');
const viewButtons = document.querySelectorAll('.view-btn');

// State management
let vinylCollection = [];
let currentSort = { field: 'artist_name', ascending: true };

// Fetch vinyls
async function fetchVinyls() {
    try {
        const response = await fetch('/api/public/vinyl');
        const data = await response.json();
        vinylCollection = data;
        await displayVinyls(vinylCollection);
    } catch (error) {
        console.error('Error fetching vinyls:', error);
    }
}

// Display vinyls
function displayVinyls(vinyls) {
    // Table view
    vinylTableBody.innerHTML = '';
    
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
            ${vinyl.dupe ? '<td><span class="dupe-badge">Duplicate</span></td>' : '<td></td>'}
        `;
        vinylTableBody.appendChild(row);
    });

    // Grid view
    vinylGrid.innerHTML = '';
    
    vinyls.forEach(vinyl => {
        const card = document.createElement('div');
        card.className = 'vinyl-card';
        card.innerHTML = `
            <div class="artwork">
                ${vinyl.artwork_url ? 
                    `<img src="${escapeHtml(vinyl.artwork_url)}" alt="Album artwork">` : 
                    '<div class="no-artwork">No Image</div>'
                }
            </div>
            <div class="info">
                <div class="artist">${escapeHtml(vinyl.artist_name)}</div>
                <div class="title">${escapeHtml(vinyl.title)}</div>
                <div class="metadata">
                    ${vinyl.identifier ? `ID: ${escapeHtml(vinyl.identifier)}<br>` : ''}
                    ${vinyl.weight ? `Weight: ${vinyl.weight}<br>` : ''}
                    ${vinyl.dupe ? '<span class="dupe-badge">Duplicate</span>' : ''}
                </div>
            </div>
        `;
        vinylGrid.appendChild(card);
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

// Add view switching functionality
viewButtons.forEach(button => {
    button.addEventListener('click', () => {
        const view = button.dataset.view;
        
        // Update active button
        viewButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show/hide appropriate view
        if (view === 'table') {
            vinylList.classList.remove('hidden');
            vinylGrid.classList.add('hidden');
        } else {
            vinylList.classList.add('hidden');
            vinylGrid.classList.remove('hidden');
        }
        
        // Refresh the display
        displayVinyls(vinylCollection);
    });
});

// Initial load
document.addEventListener('DOMContentLoaded', fetchVinyls);
