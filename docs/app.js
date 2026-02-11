/**
 * Finnish Car Plates - Frontend Application
 * Loads and displays scraped plate data from Nettiauto
 */

let allPlates = [];
let platesData = null;

/**
 * Load plates data from JSON
 */
async function loadPlatesData() {
    try {
        const response = await fetch('data/plates.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        platesData = await response.json();
        
        // Extract unique plates
        allPlates = platesData.items
            .filter(item => item.plate)
            .map(item => item.plate);
        
        // Remove duplicates and sort
        allPlates = [...new Set(allPlates)].sort();
        
        displayData();
        
    } catch (error) {
        console.error('Error loading plates data:', error);
        showError(`Failed to load plates data: ${error.message}`);
    }
}

/**
 * Display the loaded data
 */
function displayData() {
    // Hide loading message
    document.getElementById('loadingMessage').style.display = 'none';
    
    // Update statistics
    document.getElementById('totalCount').textContent = platesData.count || allPlates.length;
    document.getElementById('totalListings').textContent = platesData.items.length;
    
    // Format last updated time
    const scrapedDate = new Date(platesData.scrapedAt);
    const formattedDate = formatDateTime(scrapedDate);
    document.getElementById('lastUpdated').textContent = formattedDate;
    
    // Display plates
    renderPlates(allPlates);
    
    // Show plates container
    document.getElementById('platesContainer').style.display = 'grid';
}

/**
 * Render plates to the grid
 */
function renderPlates(plates) {
    const container = document.getElementById('platesContainer');
    container.innerHTML = '';
    
    if (plates.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No plates found</p>';
        return;
    }
    
    plates.forEach(plate => {
        const plateDiv = document.createElement('div');
        plateDiv.className = 'plate';
        plateDiv.textContent = plate;
        plateDiv.setAttribute('data-plate', plate.toLowerCase());
        container.appendChild(plateDiv);
    });
}

/**
 * Filter plates based on search input
 */
function filterPlates(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const plateElements = document.querySelectorAll('.plate');
    
    let visibleCount = 0;
    
    plateElements.forEach(plateEl => {
        const plateText = plateEl.getAttribute('data-plate');
        
        if (term === '' || plateText.includes(term)) {
            plateEl.classList.remove('hidden');
            visibleCount++;
        } else {
            plateEl.classList.add('hidden');
        }
    });
    
    // Update total count display
    if (term !== '') {
        document.getElementById('totalCount').textContent = visibleCount;
    } else {
        document.getElementById('totalCount').textContent = platesData.count || allPlates.length;
    }
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('loadingMessage').style.display = 'none';
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

/**
 * Format date and time for display
 */
function formatDateTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}`;
    }
}

/**
 * Initialize the application
 */
function init() {
    // Load plates data
    loadPlatesData();
    
    // Setup search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        filterPlates(e.target.value);
    });
    
    // Add keyboard shortcut for search (Cmd/Ctrl + F)
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
