/**
 * SecureNT Facebook Feed Widget
 * Main entry point - auto-initializes on DOM ready
 */

import { FacebookFeedWidget } from "./widget.js";
import "./styles.css";

(function (window) {
  "use strict";

  /**
   * Initialize all widgets on the page
   */
  function initWidgets() {
    const elements = document.querySelectorAll("[data-securent-fb-widget]");

    elements.forEach((element) => {
      // Skip if already initialized
      if (element.hasAttribute("data-securent-fb-initialized")) {
        return;
      }

      // Parse configuration from data attributes
      const config = {
        apiUrl: element.getAttribute("data-api-url"),
        itemsPerPage: element.getAttribute("data-items-per-page"),
        fallbackUrl: element.getAttribute("data-fallback-url"),
        theme: element.getAttribute("data-theme"),
        title: element.getAttribute("data-title"),
        content: element.getAttribute("data-content"),
        filterKeywords: element.getAttribute("data-filter-keywords"),
        startDate: element.getAttribute("data-start-date"),
        endDate: element.getAttribute("data-end-date"),
        fallbackMessage: element.getAttribute("data-fallback-message"),
        cardSize: element.getAttribute("data-card-size"),
      };

      // Remove null/undefined values
      Object.keys(config).forEach((key) => {
        if (config[key] === null || config[key] === undefined) {
          delete config[key];
        }
      });

      // Initialize widget
      const widget = new FacebookFeedWidget(element, config);

      // Mark as initialized
      element.setAttribute("data-securent-fb-initialized", "true");

      // Store widget instance on element for manual access
      element._securentFbWidget = widget;
    });
  }

  /**
   * Public API
   */
  const SecureNTFacebookWidget = {
    /**
     * Initialize widgets manually
     */
    init: initWidgets,

    /**
     * Create a widget programmatically
     * @param {HTMLElement} element - Container element
     * @param {Object} options - Configuration options
     * @returns {FacebookFeedWidget}
     */
    create: function (element, options = {}) {
      return new FacebookFeedWidget(element, options);
    },

    /**
     * Get widget instance from element
     * @param {HTMLElement} element
     * @returns {FacebookFeedWidget|null}
     */
    getInstance: function (element) {
      return element._securentFbWidget || null;
    },

    /**
     * Version
     */
    version: "1.0.0",
  };

  // Expose to global scope
  window.SecureNTFacebookWidget = SecureNTFacebookWidget;

  // Auto-initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidgets);
  } else {
    // DOM already loaded
    initWidgets();
  }
})(window);
