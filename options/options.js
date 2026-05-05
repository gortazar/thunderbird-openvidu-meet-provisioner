/* global browser, sanitizeServerUrl, normalizeRoomsResponse */

"use strict";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const DEFAULT_SETTINGS = {
  serverUrl: "",
  apiKey: "",
  participantName: "",
};

function getEl(id) {
  return document.getElementById(id);
}

/** Display a temporary feedback message next to the save button. */
function setStatus(text, cls, durationMs) {
  const el = getEl("save-status");
  el.textContent = text;
  el.className = "save-status" + (cls ? " " + cls : "");
  if (durationMs) {
    setTimeout(() => {
      el.textContent = "";
      el.className = "save-status";
    }, durationMs);
  }
}

// ---------------------------------------------------------------
// Load saved settings into form
// ---------------------------------------------------------------

async function loadSettings() {
  try {
    const settings = await browser.storage.local.get(DEFAULT_SETTINGS);
    getEl("server-url").value = settings.serverUrl;
    getEl("api-key").value = settings.apiKey;
    getEl("participant-name").value = settings.participantName;
  } catch (err) {
    setStatus("Could not load settings: " + err.message, "error");
  }
}

// ---------------------------------------------------------------
// Validate the form
// ---------------------------------------------------------------

function validateForm() {
  const serverUrlEl = getEl("server-url");
  const url = serverUrlEl.value.trim();

  if (!url) {
    serverUrlEl.classList.add("invalid");
    serverUrlEl.focus();
    setStatus("Server URL is required.", "error");
    return false;
  }

  // Only accept http:// or https:// – reuse the same guard used at embed-time.
  if (!sanitizeServerUrl(url)) {
    serverUrlEl.classList.add("invalid");
    serverUrlEl.focus();
    setStatus(
      "Please enter a valid https:// or http:// URL (e.g. https://meet.example.com).",
      "error"
    );
    return false;
  }

  serverUrlEl.classList.remove("invalid");
  return true;
}

// ---------------------------------------------------------------
// Save handler
// ---------------------------------------------------------------

getEl("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const settings = {
    serverUrl: getEl("server-url").value.trim().replace(/\/$/, ""),
    apiKey: getEl("api-key").value.trim(),
    participantName: getEl("participant-name").value.trim(),
  };

  try {
    await browser.storage.local.set(settings);
    setStatus("✓ Settings saved", "success", 3000);
  } catch (err) {
    setStatus("Failed to save settings: " + err.message, "error");
  }
});

// Clear validation state when the user starts typing
getEl("server-url").addEventListener("input", () => {
  getEl("server-url").classList.remove("invalid");
  const el = getEl("save-status");
  if (el.classList.contains("error")) {
    el.textContent = "";
    el.className = "save-status";
  }
});

// ---------------------------------------------------------------
// Test connection
// ---------------------------------------------------------------

getEl("test-btn").addEventListener("click", async () => {
  if (!validateForm()) return;

  const serverUrl = getEl("server-url").value.trim().replace(/\/$/, "");
  const apiKey = getEl("api-key").value.trim();

  setStatus("Testing connection…", "");

  try {
    const headers = {};
    if (apiKey) {
      headers["X-API-KEY"] = apiKey;
    }

    const response = await fetch(serverUrl + "/api/v1/rooms", {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      // normalizeRoomsResponse handles plain arrays, { content:[…] },
      // { rooms:[…] }, null, and any other unexpected shape safely.
      const rooms = normalizeRoomsResponse(data);
      setStatus(
        "\u2713 Connected \u2013 " + rooms.length + " room(s) found",
        "success",
        5000
      );
    } else {
      setStatus(
        "Connection failed: HTTP " + response.status + " " + response.statusText,
        "error"
      );
    }
  } catch (err) {
    setStatus("Connection error: " + err.message, "error");
  }
});

// ---------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------

loadSettings();
