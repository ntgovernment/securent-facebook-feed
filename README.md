# SecureNT Facebook Feed Widget

A non-blocking, privacy-compliant Facebook feed widget for displaying SecureNT posts with lazy loading, pagination, and offline caching.

## Features

- ✅ **Non-blocking lazy loading** - Uses Intersection Observer API
- ✅ **Offline fallback** - Displays cached data when API is unavailable
- ✅ **Pagination** - Navigate through posts with configurable items per page
- ✅ **Manual refresh** - Update feed without page reload
- ✅ **Responsive design** - Works on mobile and desktop
- ✅ **Accessible** - WCAG 2.1 AA compliant with ARIA labels
- ✅ **Modern browsers only** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

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
  data-api-url="https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent/_nocache"
  data-items-per-page="5"
  data-fallback-url="https://www.facebook.com/SecureNT"
  data-theme="light"
></div>
```

### Configuration Options

| Attribute             | Default                                                                                    | Description                |
| --------------------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| `data-api-url`        | `https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent/_nocache` | API endpoint URL           |
| `data-items-per-page` | `5`                                                                                        | Number of posts per page   |
| `data-fallback-url`   | `https://www.facebook.com/SecureNT`                                                        | URL to show when API fails |
| `data-theme`          | `light`                                                                                    | Theme: `light` or `dark`   |

## Usage Examples

### Basic Usage (Auto-initialization)

The widget auto-initializes on DOM ready:

```html
<link rel="stylesheet" href="dist/securent-fb-widget.css" />

<div data-securent-fb-widget></div>

<script src="dist/securent-fb-widget.min.js"></script>
```

### Custom Configuration

```html
<div data-securent-fb-widget data-items-per-page="10" data-theme="dark"></div>
```

### Programmatic Initialization

```javascript
// Create widget manually
const container = document.getElementById("my-widget");
const widget = SecureNTFacebookWidget.create(container, {
  apiUrl:
    "https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent/_nocache",
  itemsPerPage: 5,
  fallbackUrl: "https://www.facebook.com/SecureNT",
  theme: "light",
});

// Get existing widget instance
const instance = SecureNTFacebookWidget.getInstance(container);

// Manually initialize all widgets
SecureNTFacebookWidget.init();
```

## API Response Format

The widget expects JSON data in this format:

```json
[
  {
    "created_time": "2025-12-15T09:01:23+0000",
    "message": "Post content here...",
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

## Security Features

- External links use `rel="noopener noreferrer"`
- Links open in new tab (`target="_blank"`)
- Visual external link indicator for accessibility
- HTML escaping prevents XSS attacks
- No inline scripts or eval()

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Modern browsers only (ES6+ features used without polyfills).

## Caching Behavior

- Successful API responses are cached indefinitely in localStorage
- Cache is used as fallback when API is unavailable
- Cache displays timestamp indicator
- Manual refresh always attempts to fetch fresh data

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
│   ├── index.js        # Main entry point
│   ├── widget.js       # Widget class
│   ├── api.js          # API integration
│   ├── consent.js      # Privacy/consent layer
│   └── styles.css      # Widget styles
├── dist/               # Built files (committed to Git)
├── package.json
├── rollup.config.js
└── README.md
```

## License

MIT License - Copyright (c) 2025 SecureNT

## Support

For issues or questions, contact the SecureNT development team.
