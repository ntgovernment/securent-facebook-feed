# SecureNT Facebook Feed Widget - Developer Guide

## Overview

The SecureNT Facebook Feed Widget is a lightweight, reusable ES6 module that fetches and displays Facebook posts in a configurable card-based layout with client-side pagination, filtering, and caching.

**Version:** 1.0.0  
**Build Tool:** Rollup  
**Target:** Modern browsers (ES6 support required)

---

## Architecture

### Module Structure

```
src/
├── index.js          # Entry point, auto-initialization, public API
├── widget.js         # Main widget class (FacebookFeedWidget)
├── api.js            # API communication, caching, error handling
├── consent.js        # Consent notice and cache notice UI
└── styles.css        # Widget styling (scoped CSS)
```

### Data Flow

```
HTML Data Attributes
        ↓
FacebookFeedWidget Constructor (Parse & Validate)
        ↓
buildApiUrl() (Add Query Parameters)
        ↓
fetchFeed() (API Call with Retry Logic)
        ↓
Cache (Store in localStorage)
        ↓
filterPosts() (Apply Keyword Filters)
        ↓
render() (Generate HTML & Pagination)
        ↓
User Interaction (Pagination, Refresh)
```

---

## Core Components

### 1. **widget.js** - FacebookFeedWidget Class

#### Initialization

```javascript
new FacebookFeedWidget(element, options);
```

**Options Object:**

| Option            | Type                       | Default                | Description                                             |
| ----------------- | -------------------------- | ---------------------- | ------------------------------------------------------- |
| `apiUrl`          | string                     | Custom proxy endpoint  | Graph API proxy URL (must include query params)         |
| `itemsPerPage`    | number                     | 5                      | Posts to display per page (client-side pagination)      |
| `fallbackUrl`     | string                     | Facebook.com/SecureNT  | Fallback link when API fails                            |
| `theme`           | string                     | 'light'                | CSS theme class ('light' or 'dark')                     |
| `title`           | string                     | 'Latest from SecureNT' | Widget header title                                     |
| `content`         | HTML string                | null                   | Custom HTML below title                                 |
| `fallbackMessage` | string                     | Localized message      | Error message when API unavailable                      |
| `startDate`       | string (YYYY-MM-DD)        | 1970-01-01             | Server-side date filter start                           |
| `endDate`         | string (YYYY-MM-DD)        | Tomorrow               | Server-side date filter end                             |
| `filterKeywords`  | semicolon-separated string | null                   | Client-side keyword filter (case-insensitive, OR logic) |

#### Key Methods

##### `buildApiUrl()`

- **Purpose:** Constructs complete API URL with mandatory query parameters
- **Returns:** `string` - Full URL with `since`, `until`, `limit=100`
- **Implementation:**
  - Converts Date objects to `YYYY-MM-DD` format
  - Detects existing `?` in base URL for proper separator (`?` or `&`)
  - URL-encodes date values
  - Hardcodes `limit=100` for maximum dataset

```javascript
// Example output:
// https://securent.nt.gov.au/.../facebook-graph-proxy?since=1970-01-01&until=2025-12-19&limit=100
```

##### `formatDateForApi(date)`

- **Purpose:** Converts JavaScript Date to API-compatible string
- **Parameters:** `date` (Date object)
- **Returns:** `string` in format `YYYY-MM-DD`
- **Handles:** Zero-padding for months/days

##### `loadFeed(isRefresh = false)`

- **Purpose:** Fetch posts from API and render widget
- **Parameters:** `isRefresh` (boolean) - Shows loading spinner if true
- **Logic:**
  1. Calls `buildApiUrl()` to construct full endpoint
  2. Calls `fetchFeed()` with constructed URL
  3. Applies `filterPosts()` (keyword filtering only - date filtering server-side)
  4. Stores pagination state and cache info
  5. Calls `render()` to update DOM

##### `filterPosts(posts)`

- **Purpose:** Client-side filtering of posts
- **Current Implementation:**
  - **Keyword Filtering** (OR logic): Posts matching ANY keyword in `filterKeywords` array
  - **Case-Insensitive:** Keyword comparison converts both to lowercase
  - **Date Filtering:** REMOVED - now handled server-side by API proxy
- **Returns:** Filtered array of posts
- **Note:** Date range filtering is performed server-side via `since`/`until` query parameters

**Keyword Filter Example:**

```
filterKeywords = ["fire", "alert", "cyclone"]
Posts containing "fire" OR "alert" OR "cyclone" are included
Case-insensitive match in post.message field
```

##### `render()`

- **Purpose:** Update widget DOM with posts and controls
- **Renders:**
  - Cache notice (if cached data)
  - Header with title and refresh button
  - Current page of posts
  - Pagination controls (if needed)
- **Event Binding:** Attaches listeners to buttons

##### `renderPost(post)`

- **Purpose:** Transform single post object to HTML
- **Post Structure Expected:**
  ```javascript
  {
    created_time: "2025-12-15T09:01:23+0000",  // ISO 8601 timestamp
    message: "Post text content",               // Optional
    id: "206409062742375_1270658055095024",    // Unique post ID
    attachments: {
      data: [
        {
          type: "share",
          title: "Link Title",
          unshimmed_url: "https://example.com"
        }
      ]
    }
  }
  ```
- **Rendered Output:**
  - Relative timestamp ("2 hours ago")
  - Post message with linkified URLs
  - Attachments as external links
  - Time tooltip with absolute datetime

##### `formatMessage(message)`

- **Purpose:** Convert plain text to safe HTML with link detection
- **Processing Steps:**
  1. HTML-escape all special characters
  2. Detect `https://...` URLs → convert to `<a>` tags
  3. Detect `www....` URLs → convert to `<a>` tags (prepend `https://`)
  4. Replace newlines with `<br>` tags
  5. All links: `target="_blank" rel="noopener noreferrer"`
- **Security:** Uses HTML escaping to prevent XSS attacks

##### `goToPage(page)`

- **Purpose:** Navigate to specific pagination page
- **Parameters:** `page` (1-indexed)
- **Behavior:**
  - Validates page number (1 to totalPages)
  - Updates `this.currentPage`
  - Calls `render()` to refresh DOM
  - Scrolls widget into view with smooth animation

#### Lazy Loading

**Current Implementation:** IntersectionObserver

- Widget only loads when scrolled into viewport (50px margin)
- Disconnects after first load
- Future optimization: Could be removed if server-side performance is sufficient

#### State Management

| Property         | Type    | Purpose                                |
| ---------------- | ------- | -------------------------------------- |
| `posts`          | Array   | Filtered, paginated posts              |
| `currentPage`    | number  | Current page (1-indexed)               |
| `isLoading`      | boolean | Fetch operation in progress            |
| `fromCache`      | boolean | Posts loaded from cache                |
| `cacheTimestamp` | Date    | Cache creation time                    |
| `startDate`      | Date    | Filter start date (1970-01-01 default) |
| `endDate`        | Date    | Filter end date (tomorrow default)     |
| `filterKeywords` | Array   | Keyword filter terms                   |

---

### 2. **api.js** - API Communication Layer

#### Functions

##### `fetchFeed(apiUrl)`

- **Purpose:** Fetch posts from Graph API proxy with retry logic
- **Parameters:** `apiUrl` (string) - Complete URL with query parameters
- **Returns:** Promise resolving to:
  ```javascript
  {
    data: Array,           // Posts array
    fromCache: boolean,    // Whether data is cached
    timestamp: Date        // Fetch/cache timestamp
  }
  ```

**Retry Logic:**

- **Timeout:** 5 seconds per request
- **Retries:** 3 total attempts (initial + 2 retries)
- **Backoff:** 1s, 2s delays between retries
- **No Retry on 4xx:** Client errors fail immediately
- **Retry on 5xx/Network:** Server errors and network failures retry

**Error Handling:**

- Network errors logged to console
- Cache fallback used if API fails
- If no cache available: Error UI displayed

**Cache Behavior:**

1. **On Success:** Save response to localStorage with timestamp
2. **On Failure:** Try to retrieve cached data
3. **Offline Support:** Uses cached data indefinitely if no network

##### `getCachedFeed()`

- **Purpose:** Retrieve previously cached posts
- **Returns:**
  ```javascript
  {
    data: Array,
    timestamp: Date
  }
  // or null if no cache exists
  ```
- **Implementation:** localStorage keys:
  - `securent-fb-cache` - JSON stringified posts
  - `securent-fb-cache-time` - ISO 8601 timestamp

#### Cache Keys

| Key                      | Format          | Purpose             |
| ------------------------ | --------------- | ------------------- |
| `securent-fb-cache`      | JSON array      | Serialized posts    |
| `securent-fb-cache-time` | ISO 8601 string | Cache creation time |

**Note:** Cache has no automatic expiration. Persists until browser storage cleared or overwritten by new API fetch.

---

### 3. **consent.js** - UI Components

#### createCacheNotice(timestamp)

- **Purpose:** Display notice when showing cached data
- **Parameters:** `timestamp` (Date object)
- **Output:** HTML with:
  - Warning icon
  - Formatted date string
  - Message: "Showing posts from {date}. Unable to load latest updates."
- **Accessibility:** `role="alert"` for screen readers

---

### 4. **index.js** - Entry Point

#### Auto-Initialization

- Runs on `DOMContentLoaded`
- Finds all `[data-securent-fb-widget]` elements
- Skips elements with `data-no-init` attribute
- Creates FacebookFeedWidget instance for each

#### Public API

```javascript
window.SecureNTFacebookWidget = {
  init: initWidgets, // Manual initialization
  create: (el, opts) => {}, // Programmatic creation
  getInstance: (el) => {}, // Retrieve widget instance
  version: "1.0.0",
};
```

**Usage Examples:**

```javascript
// Manual initialization (already auto-runs on DOMContentLoaded)
SecureNTFacebookWidget.init();

// Programmatic creation
const element = document.getElementById("my-feed");
const widget = SecureNTFacebookWidget.create(element, {
  apiUrl: "https://...",
  startDate: "2025-11-01",
  itemsPerPage: 10,
});

// Retrieve instance
const instance = SecureNTFacebookWidget.getInstance(element);
instance.loadFeed(true); // Refresh
```

---

## HTML Implementation

### Basic Usage

```html
<div
  data-securent-fb-widget=""
  data-api-url="https://securent.nt.gov.au/_design/.../facebook-graph-proxy"
  data-title="Latest News"
  data-start-date="2025-11-15"
  data-end-date="2025-12-10"
  data-items-per-page="5"
></div>

<script src="dist/widget.js"></script>
```

### Advanced Configuration

```html
<div
  data-securent-fb-widget=""
  data-api-url="https://securent.nt.gov.au/_design/.../facebook-graph-proxy"
  data-title="Emergency Alerts"
  data-content="<p>Real-time updates from SecureNT</p>"
  data-start-date="1970-01-01"
  data-end-date="2025-12-19"
  data-items-per-page="3"
  data-theme="dark"
  data-filter-keywords="fire; cyclone; alert"
  data-fallback-url="https://www.facebook.com/SecureNT"
  data-fallback-message="Facebook feed temporarily unavailable"
></div>
```

---

## API Proxy Implementation (Squiz Matrix)

### REST Resource Configuration

**Endpoint:** `https://securent.nt.gov.au/_design/integration-points/socials/facebook-graph-proxy`

**Mandatory Query Parameters:**

| Parameter | Type              | Example    | Description                    |
| --------- | ----------------- | ---------- | ------------------------------ |
| `since`   | date (YYYY-MM-DD) | 1970-01-01 | Post creation date (inclusive) |
| `until`   | date (YYYY-MM-DD) | 2025-12-19 | Post creation date (inclusive) |
| `limit`   | number (1-100)    | 100        | Maximum posts to return        |

**Example Request:**

```
GET https://securent.nt.gov.au/...?since=2025-11-15&until=2025-12-10&limit=100
```

**Expected Response:**

```json
{
  "data": [
    {
      "created_time": "2025-12-15T09:01:23+0000",
      "message": "Post content here",
      "id": "206409062742375_1270658055095024",
      "attachments": {
        "data": [
          {
            "type": "share",
            "title": "Link Title",
            "unshimmed_url": "https://example.com"
          }
        ]
      }
    }
  ]
}
```

**Security Notes:**

- Access token stored server-side (not exposed to client)
- Query parameters validated on server before calling Graph API
- CORS headers configured for website domain
- Response cached per parameters to reduce API rate limit usage

---

## Filtering Strategy

### Server-Side (Graph API)

**Date Filtering:**

- `since` parameter: Filters posts created on or after this date
- `until` parameter: Filters posts created on or before this date
- Timezone: Facebook API interprets as UTC
- Format: ISO 8601 date strings (YYYY-MM-DD)

**Defaults:**

- `since`: 1970-01-01 (captures all historical posts)
- `until`: Tomorrow's date (captures current and future posts)

### Client-Side (Widget)

**Keyword Filtering:**

- **Logic:** OR (posts matching ANY keyword are included)
- **Case-Sensitivity:** Insensitive (searches converted to lowercase)
- **Search Field:** `post.message` only
- **Separator:** Semicolon (`;`) in HTML attribute
- **Example:** `data-filter-keywords="fire; cyclone; alert"` matches any post containing fire, cyclone, or alert

**Date Filtering:**

- **REMOVED** - Handled by server-side `since`/`until` parameters
- Improves performance by reducing unnecessary data transfer

---

## Performance Considerations

### Optimizations

1. **Lazy Loading (via IntersectionObserver)**

   - Widget doesn't load until user scrolls into view
   - Reduces initial page load time
   - Can be disabled if above-fold placement needed

2. **Client-Side Pagination**

   - All posts loaded once, displayed in pages
   - Smooth UX without additional network requests
   - Trade-off: Larger initial payload for responsive interactions

3. **Local Storage Caching**

   - Failed API calls fallback to cached data
   - Offline support indefinitely
   - No cache expiration (persistent across sessions)

4. **API Query Filtering**

   - Server returns only `since`/`until` date range
   - Reduces data transfer vs fetching all posts
   - Keyword filtering done client-side (flexibility over multiple posts)

5. **Rollup Bundling**
   - Single entry point compiled to IIFE
   - No external dependencies (except DOM APIs)
   - Minified output ~15KB

### Potential Bottlenecks

1. **API Latency:** 5-second timeout, 3 retries can add 10+ seconds

   - Mitigation: Use cached data, show loading indicators

2. **Large Datasets:** 100 posts per request can be 50-100KB

   - Mitigation: Client-side pagination makes pagination fast despite size

3. **localStorage Quota:** Browser limit typically 5-10MB
   - Mitigation: Storing single post feed unlikely to approach limit

---

## Error Handling

### Error States

| Scenario            | Behavior                                       | User Sees                                           |
| ------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Network timeout     | Retry logic (up to 3x), then fallback to cache | Skeleton loader, then cached posts or error message |
| HTTP 4xx error      | Immediate failure, no retry                    | Error message with fallback link                    |
| HTTP 5xx error      | Retry with backoff                             | Skeleton loader during retries                      |
| No cache available  | Error UI rendered                              | Friendly error message + Facebook link              |
| Invalid date format | Console warning, fallback to defaults          | Widget loads with default date range                |
| Parsing error       | Logged, empty feed displayed                   | Empty state (no posts shown)                        |

### Console Messages

**Warnings:**

- `Invalid start date provided, using default (1970-01-01)`
- `Invalid end date provided, using default (tomorrow)`

**Errors:** Logged with full stack trace for debugging

---

## Customization Guide

### CSS Theming

**Theme Classes:**

- `securent-fb-theme-light` - Light background, dark text (default)
- `securent-fb-theme-dark` - Dark background, light text

**Custom Styling:**

```css
.securent-fb-widget {
  --primary-color: #007bff;
  --text-color: #333;
  --border-color: #ddd;
}
```

### Extending Widget Functionality

```javascript
// Create subclass with custom behavior
class CustomWidget extends FacebookFeedWidget {
  filterPosts(posts) {
    // Custom filtering logic
    return posts.filter((post) => {
      // ... custom filter
      return super.filterPosts([post]).length > 0;
    });
  }

  renderPost(post) {
    // Custom post rendering
    return `<custom-post>${super.renderPost(post)}</custom-post>`;
  }
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Widget loads and displays posts
- [ ] Pagination controls work (next/prev)
- [ ] Refresh button fetches new data
- [ ] Caching works (offline scenario)
- [ ] Error state shows fallback UI
- [ ] Keyword filtering works (OR logic)
- [ ] Date range filtering works (server-side)
- [ ] Mobile responsive layout
- [ ] Lazy loading works (scroll into view)
- [ ] Accessibility (keyboard navigation, screen reader support)

### Debug Mode

```javascript
// Retrieve widget instance for inspection
const widget = window.SecureNTFacebookWidget.getInstance(
  document.querySelector("[data-securent-fb-widget]")
);

// Check state
console.log(widget.posts);
console.log(widget.fromCache);
console.log(widget.cacheTimestamp);

// Manual refresh
widget.loadFeed(true);
```

---

## Browser Compatibility

**Minimum Requirements:**

- ES6 (ECMAScript 2015) support
- Fetch API
- localStorage
- IntersectionObserver (for lazy loading)

**Tested Browsers:**

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Android Chrome 60+

---

## Troubleshooting

### Widget Not Displaying

**Check:**

1. Script loaded: `<script src="dist/widget.js"></script>`
2. Element has `data-securent-fb-widget` attribute
3. Browser console for errors
4. API endpoint accessible and returning valid JSON

### API Returns 403 Forbidden

**Causes:**

- Access token expired
- IP allowlist on Squiz Matrix
- CORS configuration incorrect

**Solution:** Verify token in server-side proxy, check network requests in DevTools

### Posts Not Filtering

**For Keywords:**

- Use semicolon separator: `data-filter-keywords="fire; alert"` (note space after semicolon)
- Keywords match substring in post.message
- Comparison is case-insensitive

**For Dates:**

- Format must be YYYY-MM-DD
- Server-side filtering via API query parameters
- Verify API proxy receives since/until parameters

### Pagination Not Working

- Ensure `data-items-per-page` > 0
- Check that posts array has multiple items
- Verify `render()` called after `filterPosts()`

---

## Build & Deployment

### Build Process

```bash
npm install
npm run build        # Build for development
npm run build:prod   # Minified production build
```

**Output Files:**

- `dist/widget.js` - Main bundle (dev)
- `dist/widget.min.js` - Minified bundle (prod)
- `dist/widget.css` - Stylesheet

### Deployment

1. Add `dist/` files to Squiz Matrix asset
2. Update HTML to include script: `<script src="dist/widget.js"></script>`
3. Add CSS link: `<link rel="stylesheet" href="dist/widget.css">`
4. Deploy REST Resource proxy to Squiz Matrix
5. Test widget on staging site
6. Deploy to production

---

## Changelog

### Version 1.0.0

- Initial release
- Graph API integration with server-side date filtering
- Client-side keyword filtering (OR logic)
- Caching with localStorage
- Pagination with lazy loading
- Error handling with fallback

---

## Support & Contribution

For bugs, feature requests, or questions:

1. Check this guide for troubleshooting
2. Review browser console for errors
3. Open issue on project repository
4. Include reproducible test case and browser info

---

_Last Updated: December 18, 2025_  
_Maintained by: SecureNT Development Team_
