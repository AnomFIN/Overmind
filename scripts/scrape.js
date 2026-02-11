#!/usr/bin/env node

/**
 * Nettiauto Car Listing Scraper
 * 
 * Scrapes Finnish car listings from Nettiauto search results.
 * Extracts registration numbers (Finnish plates) from each listing.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SEARCH_URL = 'https://www.nettiauto.com/hakutulokset?haku=P3453547734';
const MAX_CONCURRENCY = 2;
const MIN_DELAY = 500;
const MAX_DELAY = 1200;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Helper function to add random delay
function randomDelay() {
  const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function to navigate with retries
async function navigateWithRetry(page, url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      return true;
    } catch (error) {
      console.error(`Navigation attempt ${i + 1} failed for ${url}: ${error.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        return false;
      }
    }
  }
  return false;
}

// Extract listing URLs from search results page
async function extractListingUrls(page) {
  try {
    // Wait for listings to load
    await page.waitForSelector('a[href*="/cardetails/"]', { timeout: 10000 }).catch(() => {});
    
    const urls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/cardetails/"]'));
      const uniqueUrls = new Set();
      links.forEach(link => {
        const href = link.href;
        if (href && href.includes('/cardetails/')) {
          uniqueUrls.add(href);
        }
      });
      return Array.from(uniqueUrls);
    });
    
    return urls;
  } catch (error) {
    console.error('Error extracting listing URLs:', error.message);
    return [];
  }
}

// Check if there's a next page
async function hasNextPage(page) {
  try {
    const nextButton = await page.$('a[aria-label*="Next"], a.pagination-next, button[aria-label*="seuraava"]');
    return nextButton !== null;
  } catch (error) {
    return false;
  }
}

// Go to next page
async function goToNextPage(page) {
  try {
    const nextButton = await page.$('a[aria-label*="Next"], a.pagination-next, button[aria-label*="seuraava"]');
    if (nextButton) {
      await nextButton.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await randomDelay();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error navigating to next page:', error.message);
    return false;
  }
}

// Extract registration number from listing page
async function extractPlateFromListing(page, url) {
  try {
    // Try to find the registration number in the page
    const plate = await page.evaluate(() => {
      // Look for common field labels in Finnish
      const labels = ['Rekisteritunnus', 'Rekisterinumero', 'Registration number'];
      
      for (const label of labels) {
        // Try to find the label element
        const elements = Array.from(document.querySelectorAll('*'));
        for (const el of elements) {
          if (el.textContent && el.textContent.includes(label)) {
            // Look for the value in next sibling or parent's children
            let valueEl = el.nextElementSibling;
            if (!valueEl) {
              valueEl = el.parentElement?.querySelector('span, div, td');
            }
            if (valueEl) {
              const text = valueEl.textContent?.trim();
              // Match Finnish plate format: 2-3 letters, hyphen, 1-3 digits
              const plateMatch = text?.match(/\b([A-Z]{2,3})-(\d{1,3})\b/);
              if (plateMatch) {
                return plateMatch[0];
              }
            }
          }
        }
      }
      
      // Fallback: search entire page text for plate pattern
      const bodyText = document.body.textContent || '';
      const plateMatch = bodyText.match(/\b([A-Z]{2,3})-(\d{1,3})\b/);
      return plateMatch ? plateMatch[0] : null;
    });
    
    // Try to extract model information
    const model = await page.evaluate(() => {
      const titleEl = document.querySelector('h1, .title, [class*="vehicle-title"]');
      return titleEl ? titleEl.textContent?.trim() : '';
    });
    
    return { plate, model: model || undefined };
  } catch (error) {
    console.error(`Error extracting plate from ${url}:`, error.message);
    return { plate: null, error: error.message };
  }
}

// Process a batch of listing URLs
async function processBatch(browser, urls) {
  const results = [];
  
  for (const url of urls) {
    const page = await browser.newPage();
    try {
      console.log(`Scraping: ${url}`);
      const success = await navigateWithRetry(page, url);
      
      if (success) {
        const data = await extractPlateFromListing(page, url);
        results.push({
          url,
          ...data
        });
      } else {
        results.push({
          url,
          plate: null,
          error: 'Navigation failed after retries'
        });
      }
      
      await randomDelay();
    } catch (error) {
      console.error(`Error processing ${url}:`, error.message);
      results.push({
        url,
        plate: null,
        error: error.message
      });
    } finally {
      await page.close();
    }
  }
  
  return results;
}

// Main scraping function
async function scrape() {
  console.log('Starting Nettiauto scraper...');
  console.log(`Search URL: ${SEARCH_URL}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to search results
    console.log('Loading search results page...');
    const success = await navigateWithRetry(page, SEARCH_URL);
    if (!success) {
      throw new Error('Failed to load search results page');
    }
    
    // Collect all listing URLs from all pages
    const allListingUrls = [];
    let pageNum = 1;
    
    do {
      console.log(`Extracting URLs from page ${pageNum}...`);
      const urls = await extractListingUrls(page);
      console.log(`Found ${urls.length} listings on page ${pageNum}`);
      allListingUrls.push(...urls);
      
      await randomDelay();
      
      const hasNext = await hasNextPage(page);
      if (hasNext) {
        const navigated = await goToNextPage(page);
        if (!navigated) break;
        pageNum++;
      } else {
        break;
      }
    } while (pageNum < 100); // Safety limit
    
    await page.close();
    
    console.log(`Total listings found: ${allListingUrls.length}`);
    
    // Process listings in batches with max concurrency
    const results = [];
    for (let i = 0; i < allListingUrls.length; i += MAX_CONCURRENCY) {
      const batch = allListingUrls.slice(i, i + MAX_CONCURRENCY);
      console.log(`Processing batch ${Math.floor(i / MAX_CONCURRENCY) + 1}/${Math.ceil(allListingUrls.length / MAX_CONCURRENCY)}...`);
      const batchResults = await processBatch(browser, batch);
      results.push(...batchResults);
    }
    
    // Prepare output data
    const scrapedAt = new Date().toISOString();
    const outputData = {
      source: SEARCH_URL,
      scrapedAt,
      count: results.length,
      items: results
    };
    
    // Save JSON output
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const jsonPath = path.join(dataDir, 'plates.json');
    fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2));
    console.log(`Saved JSON to: ${jsonPath}`);
    
    // Save text output (unique plates only)
    const uniquePlates = [...new Set(
      results
        .map(r => r.plate)
        .filter(p => p !== null && p !== undefined)
    )].sort();
    
    const txtPath = path.join(dataDir, 'plates.txt');
    fs.writeFileSync(txtPath, uniquePlates.join('\n') + '\n');
    console.log(`Saved ${uniquePlates.length} unique plates to: ${txtPath}`);
    
    console.log('Scraping completed successfully!');
    
  } catch (error) {
    console.error('Scraping failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the scraper
if (require.main === module) {
  scrape()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrape };
