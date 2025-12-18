/**
 * API Integration Module
 * Handles fetching Facebook feed data with retry logic and persistent caching
 */

const CACHE_KEY = "securent-fb-cache";
const CACHE_TIME_KEY = "securent-fb-cache-time";
const API_TIMEOUT = 5000; // 5 seconds

/**
 * Determine the appropriate API URL based on environment
 * @param {string} apiUrl - Configured API endpoint URL
 * @returns {string} - API URL or mock data path for localhost
 */
function getApiUrl(apiUrl) {
  const hostname = window.location.hostname;

  // Check if running on localhost
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "") {
    console.log("[SecureNT Widget] Running on localhost - using mock data");
    return "mock-data.json";
  }

  return apiUrl;
}

/**
 * Fetch data from API with timeout and retry logic
 * @param {string} url - API endpoint URL
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Array>} - Array of posts
 */
async function fetchWithRetry(url, retries = 2) {
  const delays = [1000, 2000]; // Exponential backoff delays

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        method: "GET",
        headers: {
          Accept: "application/json",
        },
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
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
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
        timestamp: new Date(timestamp),
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
export async function fetchFeed(apiUrl) {
  try {
    const url = getApiUrl(apiUrl);
    const data = await fetchWithRetry(url);
    return {
      data,
      fromCache: false,
      timestamp: new Date(),
    };
  } catch (error) {
    // Fallback to cached data
    const cached = getFromCache();
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        timestamp: cached.timestamp,
        error: error.message,
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
export function getCachedFeed() {
  return getFromCache();
}
