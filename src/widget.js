/**
 * Widget Module
 * Main widget functionality with lazy loading, pagination, and rendering
 */

import { fetchFeed, getCachedFeed } from "./api.js";
import { createCacheNotice } from "./consent.js";

export class FacebookFeedWidget {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      apiUrl:
        options.apiUrl ||
        "https://securent.nt.gov.au/_design/integration-points/socials/facebook-securent/_nocache",
      itemsPerPage: parseInt(options.itemsPerPage) || 5,
      fallbackUrl: options.fallbackUrl || "https://www.facebook.com/SecureNT",
      theme: options.theme || "light",
      title: options.title || "Latest from SecureNT",
      content: options.content || null,
      fallbackMessage: options.fallbackMessage || null,
    };

    // Parse filter keywords (semicolon-separated)
    this.filterKeywords = options.filterKeywords
      ? options.filterKeywords.split(";").map((k) => k.trim().toLowerCase()).filter((k) => k)
      : null;

    // Parse date filters
    this.startDate = options.startDate ? new Date(options.startDate) : null;
    this.endDate = options.endDate ? new Date(options.endDate) : null;

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
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !this.isLoading &&
            this.posts.length === 0
          ) {
            this.loadFeed();
            this.observer.unobserve(this.element);
          }
        });
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
      }
    );

    this.observer.observe(this.element);
  }

  async loadFeed(isRefresh = false) {
    if (this.isLoading) return;

    this.isLoading = true;

    if (isRefresh) {
      this.showLoadingState();
    } else {
      this.showSkeletonLoader();
    }

    try {
      const result = await fetchFeed(this.options.apiUrl);
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
    const skeletons = Array(this.options.itemsPerPage)
      .fill(0)
      .map(
        () => `
      <div class="securent-fb-post securent-fb-skeleton">
        <div class="securent-fb-skeleton-header"></div>
        <div class="securent-fb-skeleton-text"></div>
        <div class="securent-fb-skeleton-text"></div>
        <div class="securent-fb-skeleton-text short"></div>
      </div>
    `
      )
      .join("");

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

    return posts.filter((post) => {
      // Date filtering
      if (this.startDate || this.endDate) {
        const postDate = new Date(post.created_time);

        if (this.startDate && postDate < this.startDate) {
          return false;
        }

        if (this.endDate) {
          const endOfDay = new Date(this.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (postDate > endOfDay) {
            return false;
          }
        }
      }

      // Keyword filtering
      if (this.filterKeywords && this.filterKeywords.length > 0) {
        const message = (post.message || "").toLowerCase();
        const hasKeyword = this.filterKeywords.some((keyword) =>
          message.includes(keyword)
        );

        if (!hasKeyword) {
          return false;
        }
      }

      return true;
    });
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
    pagePosts.forEach((post) => {
      html += this.renderPost(post);
    });
    html += "</div>";

    // Pagination
    if (totalPages > 1) {
      html += this.renderPagination(totalPages);
    }

    this.element.innerHTML = html;
    this.attachEventListeners();
  }

  renderHeader() {
    const contentHtml = this.options.content 
      ? `<p class="securent-fb-header-content">${this.escapeHtml(this.options.content)}</p>`
      : "";

    return `
      <div class="securent-fb-header">
        <h2>${this.escapeHtml(this.options.title)}</h2>
        ${contentHtml}
        <button class="securent-fb-refresh" aria-label="Refresh posts" title="Refresh posts">
          <svg class="securent-fb-icon-refresh" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh
        </button>
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
    const attachments = post.attachments
      ? this.renderAttachments(post.attachments.data)
      : "";

    return `
      <article class="securent-fb-post">
        <time class="securent-fb-timestamp" datetime="${post.created_time}" title="${formattedTime}">
          ${relativeTime}
        </time>
        <div class="securent-fb-message">${message}</div>
        ${attachments}
      </article>
    `;
  }

  formatMessage(message) {
    // Convert newlines to <br> tags and escape HTML
    return message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  }

  renderAttachments(attachments) {
    if (!attachments || attachments.length === 0) return "";

    const links = attachments
      .map((att) => {
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
      })
      .filter((link) => link)
      .join("");

    return links ? `<div class="securent-fb-attachments">${links}</div>` : "";
  }

  renderPagination(totalPages) {
    const prevDisabled = this.currentPage === 1;
    const nextDisabled = this.currentPage === totalPages;

    return `
      <div class="securent-fb-pagination">
        <button class="securent-fb-btn-pagination securent-fb-btn-prev" 
                ${prevDisabled ? "disabled" : ""} 
                aria-label="Previous page">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Previous
        </button>
        <span class="securent-fb-page-info" aria-live="polite">
          Page ${this.currentPage} of ${totalPages}
        </span>
        <button class="securent-fb-btn-pagination securent-fb-btn-next" 
                ${nextDisabled ? "disabled" : ""} 
                aria-label="Next page">
          Next
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    `;
  }

  getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
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

    if (prevBtn) {
      prevBtn.addEventListener("click", () =>
        this.goToPage(this.currentPage - 1)
      );
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () =>
        this.goToPage(this.currentPage + 1)
      );
    }
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.posts.length / this.options.itemsPerPage);

    if (page < 1 || page > totalPages) return;

    this.currentPage = page;
    this.render();

    // Scroll to top of widget
    this.element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.element.innerHTML = "";
  }
}
