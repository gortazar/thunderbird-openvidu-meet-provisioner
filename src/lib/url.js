/**
 * src/lib/url.js
 *
 * Pure URL utilities for the OpenVidu Meet Provisioner extension.
 * This file is loaded by the content page (global scope) and
 * imported by Jest tests via CommonJS require().
 */

"use strict";

/**
 * Validate and sanitise a server URL.
 * Only http:// and https:// schemes are allowed to prevent
 * javascript:, data:, ftp:, file: injection attacks.
 * Returns the URL origin (scheme + host + port) on success,
 * or null if the URL is absent, malformed, or uses an unsafe scheme.
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function sanitizeServerUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    // Re-serialise to the origin only – strips path, query, fragment.
    return parsed.origin;
  } catch (_) {
    return null;
  }
}

/**
 * Build the URL used to join an OpenVidu Meet room.
 * OpenVidu Meet uses hash-based routing by default:
 *   https://host/#/<room-name>
 *
 * @param {string} base  - Sanitised server origin
 * @param {string} room  - Room name (will be percent-encoded)
 * @returns {string}
 */
function buildRoomUrl(base, room) {
  return base + "/#/" + encodeURIComponent(room);
}

// ── CommonJS export for Jest (no-op in browser / global scope) ──────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = { sanitizeServerUrl, buildRoomUrl };
}
