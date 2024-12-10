export class SearchManager {
    constructor(app) {
        this.app = app;
        this.searchInput = document.getElementById('searchInput');
        this.searchTimeout = null;
        this.lastSearchTerm = '';
    }

    init() {
        // Direct input event for typing in search box
        this.searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        // Focus event to select all text
        this.searchInput.addEventListener('focus', (e) => {
            // Only select all if it wasn't triggered by keyboard shortcut
            if (!e.detail?.fromShortcut) {
                e.target.select();
            }
        });

        // Handle paste events
        this.searchInput.addEventListener('paste', (e) => {
            // Let the paste complete, then search
            setTimeout(() => {
                this.performSearch(e.target.value);
            }, 0);
        });
    }

    performSearch(searchTerm) {
        // Debounce search for performance
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            searchTerm = searchTerm.toLowerCase();
            this.lastSearchTerm = searchTerm;

            const filteredVinyls = this.app.vinyl.collection.filter(vinyl => 
                vinyl.artist_name.toLowerCase().includes(searchTerm) ||
                vinyl.title.toLowerCase().includes(searchTerm) ||
                (vinyl.notes && vinyl.notes.toLowerCase().includes(searchTerm)) ||
                (vinyl.identifier && vinyl.identifier.toLowerCase().includes(searchTerm))
            );

            this.app.vinyl.displayVinyls(filteredVinyls);
        }, 150); // Small delay to prevent too many updates
    }

    // Method to programmatically set search and focus
    setSearchAndFocus(text, selectAll = true) {
        this.searchInput.value = text;
        this.searchInput.focus({
            // Pass custom detail to prevent auto-select when triggered by keyboard
            detail: { fromShortcut: true }
        });
        if (selectAll) {
            this.searchInput.select();
        }
        this.performSearch(text);
    }

    // Method to handle keyboard shortcuts
    handleKeyboardSearch(key) {
        if (key === 'Backspace') {
            // Remove last character
            const newValue = this.searchInput.value.slice(0, -1);
            this.setSearchAndFocus(newValue, false);
        } else if (key.length === 1) {
            // Only append character if the input is not focused
            if (document.activeElement !== this.searchInput) {
                const newValue = this.searchInput.value + key;
                this.setSearchAndFocus(newValue, false);
            }
        }
    }

    // Method to clear search
    clearSearch() {
        this.searchInput.value = '';
        this.performSearch('');
    }

    // Get current search term
    getCurrentSearchTerm() {
        return this.lastSearchTerm;
    }

    // Method to search for a specific record (used in progress summary)
    searchForRecord(record) {
        const searchTerm = record.title;
        this.setSearchAndFocus(searchTerm, true);
    }
} 