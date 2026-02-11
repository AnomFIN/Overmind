# Nettiauto Scraper - Architecture

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        GITHUB REPOSITORY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │ scripts/scrape.js│      │ .github/workflows │                │
│  │  (Playwright)    │◄─────┤scrape-nettiauto.yml│               │
│  └────────┬─────────┘      └──────────────────┘                │
│           │                                                       │
│           │ scrapes                                               │
│           ▼                                                       │
│  ┌─────────────────┐                                             │
│  │   Nettiauto.com │                                             │
│  │  Search Results │                                             │
│  └────────┬────────┘                                             │
│           │                                                       │
│           │ outputs                                               │
│           ▼                                                       │
│  ┌─────────────────┐      npm run build-pages                   │
│  │   data/         │─────────────────────┐                      │
│  │  plates.json    │                     │                      │
│  │  plates.txt     │                     │ copies               │
│  └─────────────────┘                     ▼                      │
│                                  ┌─────────────────┐             │
│                                  │ docs/data/      │             │
│                                  │  plates.json    │             │
│                                  │  plates.txt     │             │
│                                  └────────┬────────┘             │
│                                           │                      │
│  ┌────────────────────────────────────────┘                     │
│  │                                                                │
│  │  ┌──────────────────┐                                        │
│  └─►│ docs/            │                                        │
│     │  index.html      │◄───── GitHub Pages                     │
│     │  app.js          │       (serves from /docs)              │
│     └──────────────────┘                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ user visits
                              ▼
                    ┌──────────────────┐
                    │  GitHub Pages    │
                    │  https://user.   │
                    │  github.io/repo/ │
                    └────────┬─────────┘
                             │
                             │ views on
                             ▼
                    ┌──────────────────┐
                    │     iPhone       │
                    │  (Add to Home    │
                    │   Screen ready)  │
                    └──────────────────┘
```

## Component Details

### 1. Scraper (scripts/scrape.js)
- **Technology**: Node.js + Playwright (Chromium)
- **Features**:
  - Pagination through all result pages
  - Finnish plate extraction (ABC-123, AB-12 format)
  - Rate limiting (500-1200ms random delays)
  - Max concurrency: 2 pages
  - Retry logic: 3 attempts per page
  - Error handling and logging

### 2. GitHub Actions Workflow
- **Triggers**:
  - Manual: workflow_dispatch
  - Automatic: nightly at 2 AM UTC (cron: '0 2 * * *')
- **Steps**:
  1. Checkout repository
  2. Setup Node.js 20
  3. Install dependencies (npm ci)
  4. Install Playwright browsers
  5. Run scraper (npm run scrape)
  6. Build pages (npm run build-pages)
  7. Commit and push changes

### 3. Data Layer
- **data/plates.json**: Full database with schema
  ```json
  {
    "source": "https://www.nettiauto.com/...",
    "scrapedAt": "2026-02-11T12:00:00.000Z",
    "count": 150,
    "items": [
      {
        "url": "https://...",
        "plate": "ABC-123",
        "model": "Toyota Corolla 2018",
        "error": null
      }
    ]
  }
  ```
- **data/plates.txt**: Newline-separated unique plates
  ```
  ABC-123
  DEF-456
  GHI-789
  ```

### 4. GitHub Pages Site
- **docs/index.html**:
  - Responsive design with gradient UI
  - Mobile-first approach
  - Statistics cards (total, unique, last update)
  - Search box with real-time filtering
  - Plate cards grid layout
  
- **docs/app.js**:
  - Fetches data/plates.json via AJAX
  - Dynamic rendering of plate cards
  - Debounced search (300ms)
  - Click to open listing URL
  - Error handling for missing data

### 5. Build Process
- **npm run scrape**: Executes scraper, updates data/
- **npm run build-pages**: Copies data/ to docs/data/
- **git commit/push**: Automated by GitHub Actions

## Security Features

1. **Rate Limiting**: Random delays between requests (500-1200ms)
2. **Concurrency Control**: Max 2 simultaneous pages
3. **No Secrets**: No hardcoded credentials or API keys
4. **Headless Mode**: Runs without UI in GitHub Actions
5. **Dependency Security**: Playwright 1.55.1+ (patched version)
6. **CodeQL Scanning**: Passed with no vulnerabilities

## iPhone Integration

1. User opens Safari: `https://anomfin.github.io/Overmind/`
2. Taps Share button → Add to Home Screen
3. Names app "Nettiauto Plates"
4. Icon appears on home screen
5. Opens like native app (full screen, no browser UI)

## Customization Options

### Change Search URL
```javascript
// scripts/scrape.js
const SEARCH_URL = 'https://www.nettiauto.com/hakutulokset?haku=YOUR_ID';
```

### Adjust Rate Limiting
```javascript
// scripts/scrape.js
const MAX_CONCURRENCY = 2;     // Concurrent pages
const MIN_DELAY = 500;          // Min delay (ms)
const MAX_DELAY = 1200;         // Max delay (ms)
```

### Change Schedule
```yaml
# .github/workflows/scrape-nettiauto.yml
schedule:
  - cron: '0 2 * * *'  # 2 AM UTC daily
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 0 * * 0'    # Weekly on Sunday
```

## File Statistics

| File | Size | Purpose |
|------|------|---------|
| scripts/scrape.js | 8,668 bytes | Main scraper logic |
| docs/index.html | 6,190 bytes | GitHub Pages UI |
| docs/app.js | 3,856 bytes | Frontend JavaScript |
| docs/QUICKSTART.md | 3,513 bytes | Quick setup guide |
| .github/workflows/scrape-nettiauto.yml | 1,163 bytes | Automation workflow |
| data/plates.json | Variable | Scraped data (JSON) |
| data/plates.txt | Variable | Unique plates (TXT) |

**Total**: ~23,600 bytes of new code + documentation
