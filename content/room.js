/* global browser, sanitizeServerUrl, buildRoomUrl */

"use strict";

// ---------------------------------------------------------------
// Parse URL parameters
// ---------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const rawServerUrl = (params.get("serverUrl") || "").replace(/\/$/, "");
const roomName = params.get("room") || "";
const participantName = params.get("participantName") || "Guest";

// Validate server URL using lib (http/https only – prevents injection)
const serverUrl = sanitizeServerUrl(rawServerUrl);

// ---------------------------------------------------------------
// Wire up page elements
// ---------------------------------------------------------------

const iframe = document.getElementById("room-frame");
const titleEl = document.getElementById("room-title");
const errorOverlay = document.getElementById("error-overlay");
const errorMessage = document.getElementById("error-message");
const directLink = document.getElementById("direct-link");

function showError(msg) {
  errorMessage.textContent = msg;
  errorOverlay.classList.remove("hidden");
}

// ---------------------------------------------------------------
// Load room
// ---------------------------------------------------------------

if (!serverUrl || !roomName) {
  showError(
    "Missing or invalid room configuration.  " +
      "Please close this tab and click a room from the sidebar."
  );
} else {
  const roomUrl = buildRoomUrl(serverUrl, roomName);

  // Update page title and toolbar using textContent (never innerHTML)
  // to avoid any possibility of markup injection.
  document.title = "OpenVidu Meet \u2013 " + roomName;
  titleEl.textContent = roomName;

  // Set direct-link href only after validating the URL scheme above.
  directLink.href = roomUrl;

  // Load the room inside the iframe.
  iframe.src = roomUrl;

  // The iframe error event fires for network-level failures.
  // Note: Content-Security-Policy (X-Frame-Options / frame-ancestors)
  // violations may not trigger this handler in all environments — in
  // that case use the "Open in browser" button in the toolbar instead.
  iframe.addEventListener("error", () => {
    showError(
      "The room could not be loaded.  " +
        "This may be a network error or the server may have refused to be " +
        "embedded (e.g. X-Frame-Options).  " +
        "Use the \u201COpen in browser\u201D button above to join the room."
    );
  });
}

// ---------------------------------------------------------------
// Toolbar button handlers
// ---------------------------------------------------------------

document.getElementById("open-external-btn").addEventListener("click", () => {
  if (serverUrl && roomName) {
    browser.tabs.create({ url: buildRoomUrl(serverUrl, roomName) });
  }
});

document.getElementById("close-btn").addEventListener("click", () => {
  browser.tabs.getCurrent().then((tab) => {
    if (tab) browser.tabs.remove(tab.id);
  });
});

