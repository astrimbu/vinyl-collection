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

// Add document-level keyboard listener
document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in another input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Handle Ctrl+A to focus and select search input text
    if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
        return;
    }
    
    // Ignore other special keys (ctrl, alt, etc.)
    if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
    }

    // Only handle alphanumeric keys, space, and backspace
    if (e.key.length === 1 || e.key === 'Backspace') {
        if (e.key === 'Backspace') {
            searchInput.value = searchInput.value.slice(0, -1);
        } else {
            searchInput.value += e.key;
        }
        
        // Trigger the search
        const searchTerm = searchInput.value.toLowerCase();
        const filteredVinyls = vinylCollection.filter(vinyl => 
            vinyl.artist_name.toLowerCase().includes(searchTerm) ||
            vinyl.title.toLowerCase().includes(searchTerm) ||
            (vinyl.notes && vinyl.notes.toLowerCase().includes(searchTerm)) ||
            (vinyl.identifier && vinyl.identifier.toLowerCase().includes(searchTerm))
        );
        displayVinyls(filteredVinyls);
    }
});

// Add input event listener for direct searchInput interactions
searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
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
