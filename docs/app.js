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
        const message = document.createElement('p');
        message.textContent = 'No plates found';
        message.style.gridColumn = '1 / -1';
        message.style.textAlign = 'center';
        message.style.color = '#999';
        container.appendChild(message);
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
    // Validate date
    if (!date || isNaN(date.getTime())) {
        return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now - date;
    
    // Handle future dates
    if (diffMs < 0) {
        return 'N/A';
    }
    
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
 * Nettiauto Plates - Frontend Application
 * Loads and displays scraped plate data from plates.json
 */

let allData = null;
let filteredItems = [];

// Format date for display
function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('fi-FI', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Render plates to the grid
function renderPlates(items) {
  const container = document.getElementById('platesContainer');
  
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="loading">No plates found.</div>';
    return;
  }
  
  const platesGrid = document.createElement('div');
  platesGrid.className = 'plates-grid';
  
  items.forEach(item => {
    if (item.plate) {
      const card = document.createElement('div');
      card.className = 'plate-card';
      
      const plate = document.createElement('div');
      plate.textContent = item.plate;
      card.appendChild(plate);
      
      if (item.model) {
        const model = document.createElement('div');
        model.className = 'plate-model';
        model.textContent = item.model;
        card.appendChild(model);
      }
      
      // Make clickable to open listing URL
      if (item.url) {
        card.onclick = () => window.open(item.url, '_blank', 'noopener,noreferrer');
        card.style.cursor = 'pointer';
      }
      
      platesGrid.appendChild(card);
    }
  });
  
  container.innerHTML = '';
  container.appendChild(platesGrid);
}

// Update statistics
function updateStats() {
  if (!allData) return;
  
  const totalPlates = allData.count || 0;
  const uniquePlates = new Set(
    allData.items
      .filter(item => item.plate)
      .map(item => item.plate)
  ).size;
  
  document.getElementById('totalPlates').textContent = totalPlates;
  document.getElementById('uniquePlates').textContent = uniquePlates;
  document.getElementById('lastUpdated').textContent = formatDate(allData.scrapedAt);
  
  if (allData.source) {
    const sourceLink = document.getElementById('sourceLink');
    sourceLink.href = allData.source;
  }
}

// Filter plates based on search query
function filterPlates(query) {
  if (!allData) return;
  
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    filteredItems = allData.items || [];
  } else {
    filteredItems = (allData.items || []).filter(item => {
      const plate = (item.plate || '').toLowerCase();
      const model = (item.model || '').toLowerCase();
      return plate.includes(searchTerm) || model.includes(searchTerm);
    });
  }
  
  renderPlates(filteredItems);
}

// Load plates data from JSON file
async function loadPlates() {
  try {
    const response = await fetch('data/plates.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    allData = await response.json();
    filteredItems = allData.items || [];
    
    updateStats();
    renderPlates(filteredItems);
    
  } catch (error) {
    console.error('Error loading plates data:', error);
    const container = document.getElementById('platesContainer');
    container.innerHTML = '';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';

    const strong = document.createElement('strong');
    strong.textContent = 'Error loading data:';
    errorDiv.appendChild(strong);

    const messageText = document.createTextNode(' ' + (error && error.message ? error.message : 'Unknown error'));
    errorDiv.appendChild(messageText);

    const infoParagraph = document.createElement('p');
    infoParagraph.textContent = 'Make sure the workflow has run at least once and GitHub Pages is enabled.';
    errorDiv.appendChild(infoParagraph);

    container.appendChild(errorDiv);
  }
}

// Initialize search functionality
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  let debounceTimer;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterPlates(e.target.value);
    }, 300);
  });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  loadPlates();
  initSearch();
});
