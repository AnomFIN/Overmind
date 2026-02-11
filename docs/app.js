/**
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
        card.onclick = () => window.open(item.url, '_blank');
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
    container.innerHTML = `
      <div class="error">
        <strong>Error loading data:</strong> ${error.message}
        <p>Make sure the workflow has run at least once and GitHub Pages is enabled.</p>
      </div>
    `;
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
