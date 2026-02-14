#!/usr/bin/env node
/**
 * Nettiauto Car Listing Scraper
 * Scrapes Finnish car listings and extracts registration plates
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SEARCH_URL = 'https://www.nettiauto.com/hakutulokset?haku=P3453547734';
const MAX_CONCURRENCY = 2;
const MIN_DELAY = 500;
const MAX_DELAY = 1200;
const MAX_RETRIES = 3;
const MAX_PAGES = 100;
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_JSON = path.join(DATA_DIR, 'plates.json');
const OUTPUT_TXT = path.join(DATA_DIR, 'plates.txt');

// Finnish plate patterns: ABC-123, AB-12, etc.
const PLATE_REGEX = /\b([A-Z]{2,3})-(\d{1,3})\b/;
const PLATE_REGEX_GLOBAL = /\b([A-Z]{2,3})-(\d{1,3})\b/g;

/**
 * Sleep for a random duration
 */
function randomDelay() {
    const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Retry wrapper for async functions
 */
async function withRetry(fn, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`Retry ${i + 1}/${retries} after error:`, error.message);
            await randomDelay();
        }
    }
}

/**
 * Extract all listing URLs from search results pages
 */
async function extractListingUrls(browser) {
    const page = await browser.newPage();
    const listingUrls = new Set();
    
    try {
        console.log('Navigating to search results...');
        await withRetry(async () => {
            await page.goto(SEARCH_URL, { waitUntil: 'networkidle', timeout: 30000 });
        });
        
        let currentPage = 1;
        
        while (currentPage <= MAX_PAGES) {
            console.log(`Scraping page ${currentPage}...`);
            await randomDelay();
            
            // Extract listing links from current page
            const links = await page.$$eval('a[href*="/auto/"]', anchors => {
                return anchors
                    .map(a => a.href)
                    .filter(href => href.includes('/auto/') && !href.includes('/hakutulokset'));
            });
            
            links.forEach(link => {
                // Normalize URL (remove query params and fragments)
                const url = new URL(link);
                const cleanUrl = `${url.origin}${url.pathname}`;
                listingUrls.add(cleanUrl);
            });
            
            console.log(`Found ${links.length} listings on page ${currentPage} (total: ${listingUrls.size})`);
            
            // Check for next page button
            const nextButton = await page.$('a[rel="next"], a:has-text("Seuraava"), button:has-text("Seuraava")');
            
            if (!nextButton) {
                console.log('No more pages found.');
                break;
            }
            
            // Navigate to next page
            try {
                await withRetry(async () => {
                    const freshNextButton = await page.$('a[rel="next"], a:has-text("Seuraava"), button:has-text("Seuraava")');
                    if (!freshNextButton) {
                        throw new Error('Next page button not found during navigation retry');
                    }
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
                        freshNextButton.click()
                    ]);
                });
                currentPage++;
            } catch (error) {
                console.log('Could not navigate to next page:', error.message);
                break;
            }
        }
        
    } finally {
        await page.close();
    }
    
    return Array.from(listingUrls);
}

/**
 * Extract registration plate from a listing page
 */
async function extractPlate(browser, url) {
    const page = await browser.newPage();
    
    try {
        console.log(`Scraping: ${url}`);
        
        await withRetry(async () => {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        });
        
        await randomDelay();
        
        let plate = null;
        let model = null;
        
        // Try to extract model/title
        try {
            const titleElement = await page.$('h1, .vehicle-title, [class*="title"]');
            if (titleElement) {
                model = (await titleElement.textContent()).trim();
            }
        } catch (e) {
            // Ignore model extraction errors
        }
        
        // Method 1: Look for "Rekisteritunnus" or "Rekisterinumero" field
        try {
            const labelSelectors = [
                'dt:has-text("Rekisteritunnus") + dd',
                'dt:has-text("Rekisterinumero") + dd',
                '*:has-text("Rekisteritunnus:") + *',
                '*:has-text("Rekisterinumero:") + *',
                'label:has-text("Rekisteritunnus") + *',
                'label:has-text("Rekisterinumero") + *'
            ];
            
            for (const selector of labelSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const text = (await element.textContent()).trim();
                        const match = text.match(PLATE_REGEX);
                        if (match) {
                            plate = match[0];
                            console.log(`  ✓ Found plate (labeled): ${plate}`);
                            break;
                        }
                    }
                } catch (e) {
                    // Try next selector
                }
            }
        } catch (error) {
            console.log(`  ⚠ Label search error: ${error.message}`);
        }
        
        // Method 2: Regex fallback - search entire page content
        if (!plate) {
            try {
                const bodyText = await page.textContent('body');
                const matches = [...bodyText.matchAll(PLATE_REGEX_GLOBAL)];
                
                if (matches.length > 0) {
                    // Take the first match
                    plate = matches[0][0];
                    console.log(`  ✓ Found plate (regex): ${plate}`);
                }
            } catch (error) {
                console.log(`  ⚠ Regex search error: ${error.message}`);
            }
        }
        
        if (!plate) {
            console.log(`  ✗ No plate found`);
        }
        
        return { url, plate, model: model || undefined };
        
    } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        return { url, plate: null, model: undefined, error: error.message };
    } finally {
        await page.close();
    }
}

/**
 * Process listings in batches with concurrency control
 */
async function processListings(browser, urls) {
    const results = [];
    const batches = [];
    
    // Split URLs into batches
    for (let i = 0; i < urls.length; i += MAX_CONCURRENCY) {
        batches.push(urls.slice(i, i + MAX_CONCURRENCY));
    }
    
    console.log(`\nProcessing ${urls.length} listings in ${batches.length} batches...`);
    
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\nBatch ${i + 1}/${batches.length}:`);
        
        const batchResults = await Promise.all(
            batch.map(url => extractPlate(browser, url))
        );
        
        results.push(...batchResults);
        
        // Delay between batches
        if (i < batches.length - 1) {
            await randomDelay();
        }
    }
    
    return results;
}

/**
 * Main scraper function
 */
async function scrape() {
    console.log('Starting Nettiauto scraper...\n');
    console.log(`Search URL: ${SEARCH_URL}`);
    console.log(`Max concurrency: ${MAX_CONCURRENCY}`);
    console.log(`Delay range: ${MIN_DELAY}-${MAX_DELAY}ms\n`);
    
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        // Step 1: Extract all listing URLs
        const listingUrls = await extractListingUrls(browser);
        console.log(`\nTotal listings found: ${listingUrls.length}\n`);
        
        if (listingUrls.length === 0) {
            console.log('No listings found. Writing empty outputs and exiting.');
            
            const scrapedAt = new Date().toISOString();
            const items = [];
            const uniquePlates = [];
            
            const outputData = {
                source: SEARCH_URL,
                scrapedAt: scrapedAt,
                count: uniquePlates.length,
                items: items
            };
            
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(OUTPUT_JSON, JSON.stringify(outputData, null, 2), 'utf8');
            await fs.writeFile(OUTPUT_TXT, uniquePlates.join('\n'), 'utf8');
            
            console.log(`\n✓ Saved empty JSON: ${OUTPUT_JSON}`);
            console.log(`✓ Saved empty TXT: ${OUTPUT_TXT}`);
            
            return;
        }
        
        // Step 2: Extract plates from each listing
        const items = await processListings(browser, listingUrls);
        
        // Step 3: Generate output data
        const scrapedAt = new Date().toISOString();
        const plates = items
            .filter(item => item.plate)
            .map(item => item.plate);
        
        const uniquePlates = [...new Set(plates)].sort();
        
        const outputData = {
            source: SEARCH_URL,
            scrapedAt: scrapedAt,
            count: uniquePlates.length,
            items: items
        };
        
        // Step 4: Save outputs
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        await fs.writeFile(OUTPUT_JSON, JSON.stringify(outputData, null, 2), 'utf8');
        console.log(`\n✓ Saved JSON: ${OUTPUT_JSON}`);
        
        await fs.writeFile(OUTPUT_TXT, uniquePlates.join('\n'), 'utf8');
        console.log(`✓ Saved TXT: ${OUTPUT_TXT}`);
        
        // Print summary
        console.log('\n=== Summary ===');
        console.log(`Total listings: ${items.length}`);
        console.log(`Plates found: ${plates.length}`);
        console.log(`Unique plates: ${uniquePlates.length}`);
        console.log(`Errors: ${items.filter(i => i.error).length}`);
        
        if (uniquePlates.length > 0) {
            console.log(`\nSample plates:`);
            uniquePlates.slice(0, 5).forEach(plate => console.log(`  - ${plate}`));
        }
        
    } finally {
        await browser.close();
    }
}

// Run the scraper
if (require.main === module) {
    scrape()
        .then(() => {
            console.log('\n✓ Scraping complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrape };
