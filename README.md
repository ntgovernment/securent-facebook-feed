# SecureNT Facebook Feed Widget

A highly configurable, privacy-compliant Facebook feed widget for the NT Government's SecureNT website. Features lazy loading, date/keyword filtering, automatic URL detection, and offline caching.

## Features

- ✅ **Non-blocking lazy loading** - Uses Intersection Observer API
- ✅ **Date range filtering** - Filter posts by start and end date
- ✅ **Keyword filtering** - Filter posts by keywords (case-insensitive)
- ✅ **Automatic URL linking** - Converts URLs and www. links to clickable links
- ✅ **Photo attachments** - Displays clickable photo links from Facebook posts
- ✅ **Offline fallback** - Displays cached data when API is unavailable
- ✅ **Pagination** - Navigate through posts with configurable items per page
- ✅ **Manual refresh** - Update feed without page reload
- ✅ **Customizable header** - Custom title and HTML content support
- ✅ **Responsive design** - Works on mobile and desktop
- ✅ **Accessible** - WCAG 2.1 AA compliant with ARIA labels
- ✅ **Modern browsers only** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- ✅ **No hard-coded tokens** - All API access handled server-side

## Installation

### For Development

```bash
npm install
npm run build
```

This will generate:

- `dist/securent-fb-widget.js` (development version)
- `dist/securent-fb-widget.min.js` (production version)
- `dist/securent-fb-widget.css` (minified styles)

### For Production (Squiz Matrix via Git FileBridge)

The `dist/` folder is committed to Git and served via FileBridge. Reference the built files directly:

```html
<!-- In your Squiz Matrix page -->
<link
  rel="stylesheet"
  href="https://your-filebridge-url/dist/securent-fb-widget.css"
/>

<section class="facebook-feed">
  <div class="container">
    <div data-securent-fb-widget></div>
  </div>
</section>

<script src="https://your-filebridge-url/dist/securent-fb-widget.min.js"></script>
```

## Configuration

Configure the widget using data attributes:

```html
<div
  data-securent-fb-widget
  data-title="Latest from SecureNT"
  data-content="<p>View latest updates from SecureNT Facebook.</p>"
  data-filter-keywords="Tropical; Cyclone; Fina"
  data-start-date="2025-11-15"
  data-end-date="2025-12-10"
  data-api-url="https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent"
  data-fallback-url="https://www.facebook.com/SecureNT"
  data-fallback-message="Unable to load posts at this time."
  data-items-per-page="5"
  data-theme="light"
></div>
```

### Configuration Options

| Attribute                | Default                                                                                    | Description                                         |
| ------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `data-api-url`           | `https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent/_nocache` | API endpoint URL (server-side proxy, no tokens)     |
| `data-title`             | `"Latest from SecureNT"`                                                                   | Widget header title                                 |
| `data-content`           | `null`                                                                                     | HTML content below title (from WYSIWYG editor)      |
| `data-filter-keywords`   | `null`                                                                                     | Semicolon-separated keywords (case-insensitive)     |
| `data-start-date`        | `null`                                                                                     | Filter posts from this date (YYYY-MM-DD)            |
| `data-end-date`          | `null`                                                                                     | Filter posts until this date (YYYY-MM-DD)           |
| `data-items-per-page`    | `5`                                                                                        | Number of posts per page                            |
| `data-fallback-url`      | `https://www.facebook.com/SecureNT`                                                        | URL to show when API fails                          |
| `data-fallback-message`  | `"Unable to load posts at this time."`                                                     | Custom error message                                |
| `data-theme`             | `light`                                                                                    | Theme: `light` or `dark`                            |

## Usage Examples

### Basic Usage (Auto-initialization)

The widget auto-initializes on DOM ready:

```html
<link rel="stylesheet" href="dist/securent-fb-widget.css" />

<div data-securent-fb-widget></div>

<script src="dist/securent-fb-widget.min.js"></script>
```

### With Filtering (Cyclone Fina Updates)

```html
<div
  data-securent-fb-widget
  data-title="Tropical Cyclone Fina"
  data-content="<p>Facebook feeds about Tropical Cyclone Fina from 15 November 2025 to 10 December 2025.</p>"
  data-filter-keywords="Fina; cyclone"
  data-start-date="2025-11-15"
  data-end-date="2025-12-10"
  data-items-per-page="5"
></div>
```

### Custom Configuration with WYSIWYG Content

```html
<div
  data-securent-fb-widget
  data-title="Emergency Updates"
  data-content="<p>Stay informed about current emergencies.</p><p>For urgent assistance call <strong>000</strong>.</p>"
  data-items-per-page="10"
  data-theme="dark"
></div>
```

### Programmatic Initialization

```javascript
// Create widget manually
const container = document.getElementById("my-widget");
const widget = SecureNTFacebookWidget.create(container, {
  apiUrl:
    "https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent",
  title: "Latest Updates",
  content: "<p>View our latest posts.</p>",
  filterKeywords: "emergency; alert; warning",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  itemsPerPage: 5,
  fallbackUrl: "https://www.facebook.com/SecureNT",
  fallbackMessage: "Posts unavailable. Visit our Facebook page.",
  theme: "light",
});

// Get existing widget instance
const instance = SecureNTFacebookWidget.getInstance(container);

// Manually initialize all widgets
SecureNTFacebookWidget.init();
```

## Filter Functionality

### Date Filtering

Filter posts by date range:

```html
<div
  data-securent-fb-widget
  data-start-date="2025-11-15"
  data-end-date="2025-12-10"
></div>
```

- Posts are filtered inclusively (start date 00:00:00 to end date 23:59:59)
- Dates must be in `YYYY-MM-DD` format
- Can use start date only, end date only, or both
- Invalid dates are ignored

### Keyword Filtering

Filter posts containing specific keywords:

```html
<div
  data-securent-fb-widget
  data-filter-keywords="tropical; cyclone; fina"
></div>
```

- Keywords are separated by semicolons (`;`)
- Case-insensitive matching
- Posts must contain at least ONE keyword (OR logic)
- Matches anywhere in the message text

### Combined Filtering

Use both date and keyword filters together:

```html
<div
  data-securent-fb-widget
  data-filter-keywords="emergency; alert"
  data-start-date="2025-11-01"
  data-end-date="2025-11-30"
></div>
```

Posts must match BOTH conditions:
1. Created between the date range AND
2. Contains at least one keyword

## Automatic URL Detection

The widget automatically converts URLs in post messages to clickable links:

### Supported URL Formats

1. **Full URLs with protocol**
   - `https://securent.nt.gov.au` → clickable link
   - `http://example.com` → clickable link

2. **www. URLs without protocol**
   - `www.securent.nt.gov.au` → clickable link (adds https://)
   - `www.example.com` → clickable link (adds https://)

All links open in a new tab with security attributes (`rel="noopener noreferrer"`).

## Photo Attachments

The widget displays photo attachments from Facebook posts:

- Posts with photos show a "View Photo" button with a photo icon
- Clicking the button opens the photo on Facebook in a new tab
- Photo links are visually distinct with a blue background
- Supports ARIA labels for screen readers

**Note**: The widget displays links to Facebook photos, not embedded images. To display actual photos inline, your server-side API would need to return direct image URLs from Facebook Graph API's `attachments{media}` field.

## Customizing Header Content

The widget supports custom HTML content below the title, perfect for WYSIWYG editor integration:

```html
<div
  data-securent-fb-widget
  data-title="Tropical Cyclone Fina"
  data-content="&lt;p&gt;Latest updates from 15 November to 10 December 2025.&lt;/p&gt;&lt;p&gt;For emergencies call &lt;strong&gt;000&lt;/strong&gt;.&lt;/p&gt;"
></div>
```

- Content is rendered as HTML (not escaped)
- Use HTML entities in data attributes (`&lt;` for `<`, `&gt;` for `>`)
- Supports any HTML from Squiz Matrix WYSIWYG editor
- Content appears on its own row, left-aligned, full width

## Security Features

- **No hard-coded tokens or API keys** - All Facebook API access handled server-side
- **Server-side proxy required** - Widget calls internal API endpoint, not Facebook directly
- External links use `rel="noopener noreferrer"`
- Links open in new tab (`target="_blank"`)
- Visual external link indicator for accessibility
- HTML escaping prevents XSS attacks in post content
- WYSIWYG content rendered safely (sanitized on server)
- No inline scripts or eval()
- Content Security Policy (CSP) compatible

## API Integration

### Server-Side Proxy Required

The widget does **NOT** contain any Facebook access tokens. It calls a server-side proxy endpoint that:

1. Handles Facebook Graph API authentication
2. Caches responses server-side
3. Returns sanitized data to the widget
4. Protects API keys and access tokens

### Expected API Endpoint

```
GET https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent
```

No authentication required from client-side (handled server-side).

### API Response Format

The widget expects JSON data in this format:

```json
[
  {
    "created_time": "2025-12-15T09:01:23+0000",
    "message": "Post content here with https://securent.nt.gov.au links...",
    "id": "206409062742375_1270658055095024",
    "attachments": {
      "data": [
        {
          "type": "share",
          "title": "Link title",
          "unshimmed_url": "https://example.com"
        }
      ]
    }
  }
]
```

### Required Fields

- `created_time` (ISO 8601 format)
- `message` (post text)
- `id` (unique post ID)

### Optional Fields

- `attachments.data[]` (array of attachments)
  - `type` (attachment type: `"share"`, `"photo"`, etc.)
  - `title` (link title for share attachments)
  - `unshimmed_url` (URL for attachment - photo page or shared link)

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Modern browsers only (ES6+ features used without polyfills).

## Caching Behavior

- Successful API responses are cached indefinitely in localStorage
- Cache is used as fallback when API is unavailable
- Cache displays timestamp indicator to users
- Manual refresh always attempts to fetch fresh data
- Filtered results are cached based on original data

## Performance

- **Lazy loading** - Widget only loads when scrolled into view
- **Non-blocking** - Doesn't delay page load
- **Lightweight** - ~15KB minified JS + ~5KB CSS
- **Efficient filtering** - Client-side filtering on cached data
- **Retry logic** - Automatic retry with exponential backoff
- **5-second timeout** - Prevents long waits

## Accessibility

- WCAG 2.1 AA compliant
- ARIA labels and live regions
- Keyboard navigation support
- Screen reader announcements
- Focus management
- Semantic HTML

## Development

### Build Commands

```bash
# Install dependencies
npm install

# Development build (unminified)
npm run build

# Development with watch mode
npm run dev

# Clean dist folder
npm run clean
```

### Project Structure

```
securent-facebook-feed/
├── src/
│   ├── index.js        # Main entry point & auto-initialization
│   ├── widget.js       # Widget class with filtering logic
│   ├── api.js          # API integration with caching
│   ├── consent.js      # Cache notice display
│   └── styles.css      # Widget styles
├── dist/               # Built files (committed to Git)
│   ├── securent-fb-widget.js       # Development build
│   ├── securent-fb-widget.min.js   # Production build (minified)
│   └── securent-fb-widget.css      # Minified styles
├── package.json
├── rollup.config.js    # Rollup bundler configuration
├── README.md           # This file
└── DEVELOPER_GUIDE.md  # Detailed technical documentation
```

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ntgovernment/securent-facebook-feed.git
   cd securent-facebook-feed
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run serve
   ```
   Opens http://127.0.0.1:8080 with test page

4. **Make changes to src/ files**

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

### Testing

Test with different configurations:

```html
<!-- Test date filtering -->
<div data-securent-fb-widget 
     data-start-date="2025-11-15" 
     data-end-date="2025-12-10"></div>

<!-- Test keyword filtering -->
<div data-securent-fb-widget 
     data-filter-keywords="emergency; alert"></div>

<!-- Test custom content -->
<div data-securent-fb-widget 
     data-title="Test Widget"
     data-content="<p>Test HTML content</p>"></div>
```

## License

MIT License - Copyright (c) 2025 Northern Territory Government

## Support

For issues or questions, contact the **Web Design and Support - Frontend Design team**.

## Changelog

### v1.3.0 (2025-12-18)
- Added photo attachment support with clickable "View Photo" links
- Added localhost detection for automatic mock data usage during development
- Enhanced attachment rendering to handle both photos and link shares
- Added visual distinction for photo attachments (blue styling)

### v1.2.0 (2025-12-18)
- Added automatic URL detection and linking (http/https/www.)
- Added support for www. URLs without protocol
- Enhanced link styling with hover effects

### v1.1.0 (2025-12-17)
- Added date range filtering (start-date, end-date)
- Added keyword filtering (semicolon-separated)
- Added customizable header title and HTML content
- Added custom fallback messages
- Updated header layout (title/button on one row, content on separate row)
- Improved WYSIWYG editor integration

### v1.0.0 (2025-12-15)
- Initial release
- Lazy loading with Intersection Observer
- Pagination support
- LocalStorage caching
- Retry logic with exponential backoff
- Responsive design
- Accessibility features (WCAG 2.1 AA)
- Privacy compliance (no client-side tokens)

## Repository

- **GitHub:** https://github.com/ntgovernment/securent-facebook-feed
- **Main Branch:** `main` (production)
- **Dev Branch:** `dev` (development)
