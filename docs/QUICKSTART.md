# Nettiauto Scraper - Quick Start Guide

## Overview
This feature scrapes Finnish car listings from Nettiauto and displays them on a beautiful GitHub Pages site.

## Quick Setup (5 minutes)

### Step 1: Enable GitHub Pages
1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under "Source", select:
   - Branch: `main` (or your default branch)
   - Folder: `/docs`
4. Click **Save**
5. Wait 2-3 minutes for deployment

Your site will be at: `https://<username>.github.io/<repo-name>/`

### Step 2: Run the Scraper

#### Option A: Manual Trigger (GitHub Actions)
1. Go to **Actions** tab
2. Select **Scrape Nettiauto** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for completion (~5-10 minutes)

#### Option B: Local Execution
```bash
npm install
npx playwright install chromium
npm run scrape
npm run build-pages
git add data docs
git commit -m "Update plates data"
git push
```

### Step 3: View on iPhone
1. Open Safari on your iPhone
2. Navigate to: `https://<username>.github.io/<repo-name>/`
3. Tap the **Share** button (box with arrow)
4. Select **Add to Home Screen**
5. Name it "Nettiauto Plates"
6. Tap **Add**

Now you have a native-looking app icon on your iPhone!

## Features
- 🔍 Real-time search (filter plates by typing)
- 📊 Live statistics (total plates, unique plates, last update)
- 📱 Mobile-responsive design (perfect for iPhone)
- 🎨 Beautiful gradient UI with smooth animations
- 🔗 Click any plate to open the original listing
- ⚡ Fast and lightweight (no frameworks)

## File Structure
```
├── scripts/scrape.js              # Main scraper (Node.js + Playwright)
├── data/
│   ├── plates.json                # Full scraped data
│   └── plates.txt                 # Unique plates list
├── docs/                          # GitHub Pages site
│   ├── index.html                 # Main page
│   ├── app.js                     # Frontend logic
│   └── data/                      # Data for Pages
│       ├── plates.json
│       └── plates.txt
└── .github/workflows/
    └── scrape-nettiauto.yml       # Automated scraping workflow
```

## Customization

### Change Search URL
Edit `scripts/scrape.js`:
```javascript
const SEARCH_URL = 'https://www.nettiauto.com/hakutulokset?haku=YOUR_SEARCH_ID';
```

### Adjust Rate Limiting
Edit `scripts/scrape.js`:
```javascript
const MAX_CONCURRENCY = 2;     // Number of concurrent pages
const MIN_DELAY = 500;          // Min delay between pages (ms)
const MAX_DELAY = 1200;         // Max delay between pages (ms)
```

### Change Schedule
Edit `.github/workflows/scrape-nettiauto.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # 2 AM UTC daily
  # Examples:
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 0 * * 0'    # Weekly on Sunday
```

## Troubleshooting

### "No plates found" error
- Make sure the workflow has run at least once
- Check GitHub Actions for errors
- Verify the search URL returns results

### Workflow fails
- Check if Playwright browsers installed correctly
- Verify Node.js 20+ is used
- Check for rate limiting from Nettiauto

### Pages not updating
- Ensure workflow commits were pushed
- Check if GitHub Pages is enabled
- Clear browser cache and reload

## Security & Ethics
- Uses random delays (500-1200ms) between requests
- Respects Nettiauto servers with max concurrency of 2
- Runs in headless mode (no visible browser)
- No secrets or credentials hardcoded
- All data is publicly available information

## Support
For issues or questions, please open an issue on GitHub.
