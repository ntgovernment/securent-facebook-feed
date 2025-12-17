(function () {
  'use strict';

  /**
   * API Integration Module
   * Handles fetching Facebook feed data with retry logic and persistent caching
   */

  const CACHE_KEY = "securent-fb-cache";
  const CACHE_TIME_KEY = "securent-fb-cache-time";
  const API_TIMEOUT = 5000; // 5 seconds

  /**
   * Fetch data from API with timeout and retry logic
   * @param {string} url - API endpoint URL
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<Array>} - Array of posts
   */
  async function fetchWithRetry(url) {
    let retries = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    const delays = [1000, 2000]; // Exponential backoff delays

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
        const response = await fetch(url, {
          signal: controller.signal,
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`API error: ${response.status}`);
          }
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        // Cache the successful response
        saveToCache(data);
        return data;
      } catch (error) {
        // If this was the last attempt, throw the error
        if (attempt === retries) {
          console.error("API fetch failed after retries:", error);
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < delays.length) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
      }
    }
  }

  /**
   * Save data to localStorage cache
   * @param {Array} data - Data to cache
   */
  function saveToCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
    } catch (error) {
      console.warn("Failed to save to cache:", error);
    }
  }

  /**
   * Get cached data from localStorage
   * @returns {Object|null} - Cached data and timestamp, or null
   */
  function getFromCache() {
    try {
      const data = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIME_KEY);
      if (data && timestamp) {
        return {
          data: JSON.parse(data),
          timestamp: new Date(timestamp)
        };
      }
    } catch (error) {
      console.warn("Failed to read from cache:", error);
    }
    return null;
  }

  /**
   * Fetch feed data from API with fallback to cache
   * @param {string} apiUrl - API endpoint URL
   * @returns {Promise<Object>} - Object with data, fromCache flag, and timestamp
   */
  async function fetchFeed(apiUrl) {
    try {
      const data = await fetchWithRetry(apiUrl);
      return {
        data,
        fromCache: false,
        timestamp: new Date()
      };
    } catch (error) {
      // Fallback to cached data
      const cached = getFromCache();
      if (cached) {
        return {
          data: cached.data,
          fromCache: true,
          timestamp: cached.timestamp,
          error: error.message
        };
      }

      // No cache available, throw error
      throw error;
    }
  }

  /**
   * Get cached data without making API call
   * @returns {Object|null}
   */
  function getCachedFeed() {
    return getFromCache();
  }

  /**
   * Cache Notice Module
   * Displays information about cached data
   */

  /**
   * Create cached data notice HTML
   * @param {Date} timestamp - When the cache was created
   * @returns {string} - HTML string
   */
  function createCacheNotice(timestamp) {
    const dateStr = formatCacheDate(timestamp);
    return `
    <div class="securent-fb-cache-notice" role="alert">
      <svg class="securent-fb-icon-warning" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Showing posts from ${dateStr}. Unable to load latest updates.</span>
    </div>
  `;
  }

  /**
   * Format cache date for display
   * @param {Date} date
   * @returns {string}
   */
  function formatCacheDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

    // Format as DD/MM/YYYY HH:MM
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Widget Module
   * Main widget functionality with lazy loading, pagination, and rendering
   */

  class FacebookFeedWidget {
    constructor(element) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      this.element = element;
      this.options = {
        apiUrl: options.apiUrl || "https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent/_nocache",
        itemsPerPage: parseInt(options.itemsPerPage) || 5,
        fallbackUrl: options.fallbackUrl || "https://www.facebook.com/SecureNT",
        theme: options.theme || "light",
        title: options.title || "Latest from SecureNT",
        content: options.content || null,
        fallbackMessage: options.fallbackMessage || null,
        cardSize: options.cardSize || "full"
      };

      // Parse filter keywords (semicolon-separated)
      this.filterKeywords = options.filterKeywords ? options.filterKeywords.split(";").map(k => k.trim().toLowerCase()).filter(k => k) : null;

      // Parse date filters with defaults
      // Default start date: 1970-01-01
      // Default end date: tomorrow
      const defaultStartDate = new Date("1970-01-01");
      const defaultEndDate = new Date(Date.now() + 86400000); // Tomorrow

      this.startDate = options.startDate ? new Date(options.startDate) : defaultStartDate;
      this.endDate = options.endDate ? new Date(options.endDate) : defaultEndDate;

      // Validate dates and fallback to defaults if invalid
      if (isNaN(this.startDate.getTime())) {
        console.warn("Invalid start date provided, using default (1970-01-01)");
        this.startDate = defaultStartDate;
      }
      if (isNaN(this.endDate.getTime())) {
        console.warn("Invalid end date provided, using default (tomorrow)");
        this.endDate = defaultEndDate;
      }
      this.posts = [];
      this.currentPage = 1;
      this.isLoading = false;
      this.observer = null;
      this.fromCache = false;
      this.cacheTimestamp = null;
      this.init();
    }
    init() {
      this.element.classList.add("securent-fb-widget");
      this.element.classList.add(`securent-fb-theme-${this.options.theme}`);
      this.setupLazyLoading();
    }
    setupLazyLoading() {
      this.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.isLoading && this.posts.length === 0) {
            this.loadFeed();
            this.observer.unobserve(this.element);
          }
        });
      }, {
        rootMargin: "50px",
        threshold: 0.1
      });
      this.observer.observe(this.element);
    }
    async loadFeed() {
      let isRefresh = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      if (this.isLoading) return;
      this.isLoading = true;
      if (isRefresh) {
        this.showLoadingState();
      } else {
        this.showSkeletonLoader();
      }
      try {
        const result = await fetchFeed(this.buildApiUrl());
        this.posts = this.filterPosts(result.data);
        this.fromCache = result.fromCache;
        this.cacheTimestamp = result.timestamp;
        this.currentPage = 1;
        this.render();
      } catch (error) {
        this.showError();
      } finally {
        this.isLoading = false;
      }
    }
    showSkeletonLoader() {
      const skeletons = Array(this.options.itemsPerPage).fill(0).map(() => `
      <div class="securent-fb-post securent-fb-skeleton">
        <div class="securent-fb-skeleton-header"></div>
        <div class="securent-fb-skeleton-text"></div>
        <div class="securent-fb-skeleton-text"></div>
        <div class="securent-fb-skeleton-text short"></div>
      </div>
    `).join("");
      this.element.innerHTML = `<div class="securent-fb-feed">${skeletons}</div>`;
    }
    showLoadingState() {
      const loadingIndicator = this.element.querySelector(".securent-fb-loading");
      if (loadingIndicator) {
        loadingIndicator.style.display = "flex";
      }
    }
    filterPosts(posts) {
      if (!posts || posts.length === 0) return [];
      return posts.filter(post => {
        // Keyword filtering (date filtering now handled server-side)
        if (this.filterKeywords && this.filterKeywords.length > 0) {
          const message = (post.message || "").toLowerCase();
          const hasKeyword = this.filterKeywords.some(keyword => message.includes(keyword));
          if (!hasKeyword) {
            return false;
          }
        }
        return true;
      });
    }

    /**
     * Format a Date object to YYYY-MM-DD string for API
     */
    formatDateForApi(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    /**
     * Build API URL with required query parameters (since, until, limit)
     */
    buildApiUrl() {
      const baseUrl = this.options.apiUrl;
      const separator = baseUrl.includes("?") ? "&" : "?";
      const since = encodeURIComponent(this.formatDateForApi(this.startDate));
      const until = encodeURIComponent(this.formatDateForApi(this.endDate));
      const limit = 100; // Hardcoded to fetch maximum posts from API

      return `${baseUrl}${separator}since=${since}&until=${until}&limit=${limit}`;
    }
    showError() {
      const cached = getCachedFeed();
      if (cached) {
        this.posts = this.filterPosts(cached.data);
        this.fromCache = true;
        this.cacheTimestamp = cached.timestamp;
        this.currentPage = 1;
        this.render();
      } else {
        const fallbackMsg = this.options.fallbackMessage || "Unable to load posts at this time.";
        this.element.innerHTML = `
        <div class="securent-fb-error">
          <p>${this.escapeHtml(fallbackMsg)}</p>
          <p><a href="${this.options.fallbackUrl}" target="_blank" rel="noopener noreferrer">Visit SecureNT on Facebook</a></p>
        </div>
      `;
      }
    }
    render() {
      const start = (this.currentPage - 1) * this.options.itemsPerPage;
      const end = start + this.options.itemsPerPage;
      const pagePosts = this.posts.slice(start, end);
      const totalPages = Math.ceil(this.posts.length / this.options.itemsPerPage);
      let html = "";

      // Cache notice
      if (this.fromCache) {
        html += createCacheNotice(this.cacheTimestamp);
      }

      // Header with refresh button
      html += this.renderHeader();

      // Posts
      html += '<div class="securent-fb-feed">';
      pagePosts.forEach(post => {
        html += this.renderPost(post);
      });
      html += "</div>";

      // Pagination
      if (totalPages > 1) {
        html += this.renderPagination(totalPages);
      }
      this.element.innerHTML = html;
      this.attachEventListeners();
      this.applyCompactCardLogic();
    }
    renderHeader() {
      const contentHtml = this.options.content ? `<div class="securent-fb-header-content">${this.options.content}</div>` : "";
      return `
      <div class="securent-fb-header">
        <div class="securent-fb-header-top">
          <h2>${this.escapeHtml(this.options.title)}</h2>
          <button class="securent-fb-refresh" aria-label="Refresh posts" title="Refresh posts">
            <svg class="securent-fb-icon-refresh" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
        ${contentHtml}
      </div>
      <div class="securent-fb-loading" style="display: none;">
        <div class="securent-fb-spinner"></div>
        <span>Refreshing...</span>
      </div>
    `;
    }
    renderPost(post) {
      const timestamp = new Date(post.created_time);
      const relativeTime = this.getRelativeTime(timestamp);
      const formattedTime = this.formatAbsoluteTime(timestamp);
      const message = this.formatMessage(post.message || "");
      const attachments = post.attachments ? this.renderAttachments(post.attachments.data) : "";
      const isCompact = this.options.cardSize === "compact";
      const compactClass = isCompact ? " securent-fb-post-compact" : "";
      return `
      <article class="securent-fb-post${compactClass}">
        <time class="securent-fb-timestamp" datetime="${post.created_time}" title="${formattedTime}">
          ${relativeTime}
        </time>
        <div class="securent-fb-message">${message}</div>
        ${attachments}
      </article>
    `;
    }
    formatMessage(message) {
      // First escape HTML
      let formatted = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

      // Convert URLs with protocols to clickable links
      const urlRegex = /(https?:\/\/[^\s<]+)/g;
      formatted = formatted.replace(urlRegex, url => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="securent-fb-link">${url}</a>`;
      });

      // Convert www. URLs without protocol to clickable links
      const wwwRegex = /(^|[^\/])(www\.[^\s<]+)/g;
      formatted = formatted.replace(wwwRegex, (match, prefix, url) => {
        return `${prefix}<a href="https://${url}" target="_blank" rel="noopener noreferrer" class="securent-fb-link">${url}</a>`;
      });

      // Convert newlines to <br> tags
      formatted = formatted.replace(/\n/g, "<br>");
      return formatted;
    }
    renderAttachments(attachments) {
      if (!attachments || attachments.length === 0) return "";
      const links = attachments.map(att => {
        if (att.unshimmed_url && att.title) {
          return `
          <a href="${this.escapeHtml(att.unshimmed_url)}" 
             class="securent-fb-attachment" 
             target="_blank" 
             rel="noopener noreferrer">
            ${this.escapeHtml(att.title)}
            <svg class="securent-fb-icon-external" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        `;
        }
        return "";
      }).filter(link => link).join("");
      return links ? `<div class="securent-fb-attachments">${links}</div>` : "";
    }
    renderPagination(totalPages) {
      const prevDisabled = this.currentPage === 1;
      const nextDisabled = this.currentPage === totalPages;

      // Generate page number links (show up to 5 pages)
      let pageLinks = "";
      const maxVisiblePages = 5;
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      // Adjust startPage if we're near the end
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      for (let i = startPage; i <= endPage; i++) {
        const isActive = i === this.currentPage;
        pageLinks += `<li class="page-item ${isActive ? "active" : ""}"><a class="page-link" href="javascript:void(0)" data-page="${i}">${i}</a></li>`;
      }
      return `
      <nav aria-label="navigation" class="pb-5 mb-15">
        <ul class="pagination justify-content-center">
          <li class="page-item ${prevDisabled ? "disabled" : ""}">
            <a class="page-link securent-fb-btn-prev" href="javascript:void(0)" tabindex="${prevDisabled ? "-1" : ""}" aria-disabled="${prevDisabled}">Previous</a>
          </li>
          ${pageLinks}
          <li class="page-item ${nextDisabled ? "disabled" : ""}">
            <a class="page-link securent-fb-btn-next" href="javascript:void(0)" tabindex="${nextDisabled ? "-1" : ""}" aria-disabled="${nextDisabled}">Next</a>
          </li>
        </ul>
      </nav>
    `;
    }
    getRelativeTime(date) {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

      // More than 7 days, show absolute date
      return this.formatShortDate(date);
    }
    formatAbsoluteTime(date) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    formatShortDate(date) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    attachEventListeners() {
      // Refresh button
      const refreshBtn = this.element.querySelector(".securent-fb-refresh");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => this.loadFeed(true));
      }

      // Pagination buttons
      const prevBtn = this.element.querySelector(".securent-fb-btn-prev");
      const nextBtn = this.element.querySelector(".securent-fb-btn-next");
      const pageLinks = this.element.querySelectorAll(".page-link[data-page]");
      if (prevBtn) {
        prevBtn.addEventListener("click", () => this.goToPage(this.currentPage - 1));
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", () => this.goToPage(this.currentPage + 1));
      }

      // Page number links
      pageLinks.forEach(link => {
        link.addEventListener("click", e => {
          const page = parseInt(e.target.getAttribute("data-page"));
          this.goToPage(page);
        });
      });
    }
    applyCompactCardLogic() {
      if (this.options.cardSize !== "compact") return;
      const compactCards = this.element.querySelectorAll(".securent-fb-post-compact");
      compactCards.forEach(card => {
        // Temporarily remove height restriction to measure full content height
        const originalMaxHeight = card.style.maxHeight;
        card.style.maxHeight = "none";
        const fullHeight = card.scrollHeight;
        card.style.maxHeight = originalMaxHeight;

        // Only add "See more" if content is taller than 300px
        if (fullHeight > 300) {
          const seeMoreLink = document.createElement("a");
          seeMoreLink.href = "#";
          seeMoreLink.className = "securent-fb-see-more";
          seeMoreLink.textContent = "See more";
          seeMoreLink.addEventListener("click", e => {
            e.preventDefault();
            card.classList.toggle("securent-fb-post-expanded");
            seeMoreLink.textContent = card.classList.contains("securent-fb-post-expanded") ? "See less" : "See more";
          });
          card.appendChild(seeMoreLink);
        }
      });
    }
    goToPage(page) {
      const totalPages = Math.ceil(this.posts.length / this.options.itemsPerPage);
      if (page < 1 || page > totalPages) return;
      this.currentPage = page;
      this.render();

      // Scroll to top of widget
      this.element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.element.innerHTML = "";
    }
  }

  /**
   * SecureNT Facebook Feed Widget
   * Main entry point - auto-initializes on DOM ready
   */

  (function (window) {

    /**
     * Initialize all widgets on the page
     */
    function initWidgets() {
      const elements = document.querySelectorAll("[data-securent-fb-widget]");
      elements.forEach(element => {
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
          cardSize: element.getAttribute("data-card-size")
        };

        // Remove null/undefined values
        Object.keys(config).forEach(key => {
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
      create: function (element) {
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
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
      version: "1.0.0"
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

})();
