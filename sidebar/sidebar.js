/* global browser */

"use strict";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Return settings from local storage with sensible defaults. */
async function getSettings() {
  return browser.storage.local.get({
    serverUrl: "",
    apiKey: "",
    apiSecret: "",
    participantName: "",
  });
}

/**
 * Fetch the list of rooms from the OpenVidu Meet REST API.
 *
 * OpenVidu Meet exposes  GET /openvidu/api/rooms
 * The response may be wrapped as  { content: [...] }  or  { rooms: [...] }
 * or it may be a plain array.  We handle all three forms.
 *
 * Authentication uses HTTP Basic Auth with the API key / secret pair.
 */
async function fetchRooms(serverUrl, apiKey, apiSecret) {
  const url = serverUrl.replace(/\/$/, "") + "/openvidu/api/rooms";
  const headers = {};
  if (apiKey && apiSecret) {
    headers["Authorization"] =
      "Basic " + btoa(apiKey + ":" + apiSecret);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("HTTP " + response.status + " – " + response.statusText);
  }

  const data = await response.json();

  // Normalise to a plain array regardless of the server response shape.
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data.content)) {
    return data.content;
  }
  if (Array.isArray(data.rooms)) {
    return data.rooms;
  }
  return [];
}

/**
 * Determine whether a room is "open" (has active participants).
 * Different versions of the API surface this differently.
 */
function isRoomOpen(room) {
  const count =
    room.numParticipants ??
    room.num_participants ??
    room.participantCount ??
    0;
  return count > 0 || room.activeRecording === true;
}

/** Human-readable participant count label. */
function participantLabel(room) {
  const count =
    room.numParticipants ??
    room.num_participants ??
    room.participantCount ??
    null;
  if (count === null) return null;
  return count + " participant" + (count !== 1 ? "s" : "");
}

// ---------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------

function setStatus(text, cls) {
  const el = document.getElementById("status-message");
  el.textContent = text;
  el.className = "status-message" + (cls ? " " + cls : "");
}

function clearStatus() {
  setStatus("", "");
}

function showEmptyState(show) {
  const el = document.getElementById("empty-state");
  el.classList.toggle("hidden", !show);
}

// ---------------------------------------------------------------
// Room list rendering
// ---------------------------------------------------------------

function buildRoomItem(room, settings) {
  const name = room.name || room.id || "(unnamed)";
  const open = isRoomOpen(room);
  const pLabel = participantLabel(room);

  const li = document.createElement("li");
  li.className = "room-item" + (open ? " room-open" : "");
  li.setAttribute("role", "listitem");
  li.title = open ? name + " (open)" : name;

  const nameSpan = document.createElement("span");
  nameSpan.className = "room-name";
  nameSpan.textContent = name;
  li.appendChild(nameSpan);

  // Status row with participant count and open/closed badge
  const statusRow = document.createElement("div");
  statusRow.className = "room-status-row";

  if (pLabel !== null) {
    const participantsSpan = document.createElement("span");
    participantsSpan.className = "room-participants";
    participantsSpan.textContent = pLabel;
    statusRow.appendChild(participantsSpan);
  }

  const badge = document.createElement("span");
  badge.className = "room-badge " + (open ? "badge-open" : "badge-closed");
  badge.textContent = open ? "Open" : "Closed";
  statusRow.appendChild(badge);

  li.appendChild(statusRow);

  li.addEventListener("click", () => openRoom(name, settings));

  return li;
}

// ---------------------------------------------------------------
// Main load function
// ---------------------------------------------------------------

async function loadRooms() {
  const listEl = document.getElementById("rooms-list");
  listEl.innerHTML = "";
  showEmptyState(false);

  const settings = await getSettings();

  if (!settings.serverUrl) {
    setStatus(
      "Please configure the OpenVidu Meet server URL in Settings (⚙).",
      "warning"
    );
    return;
  }

  setStatus("Loading rooms…", "loading");

  try {
    const rooms = await fetchRooms(
      settings.serverUrl,
      settings.apiKey,
      settings.apiSecret
    );

    clearStatus();

    if (rooms.length === 0) {
      showEmptyState(true);
      return;
    }

    // Sort: open rooms first, then alphabetically within each group
    rooms.sort((a, b) => {
      const aOpen = isRoomOpen(a) ? 0 : 1;
      const bOpen = isRoomOpen(b) ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      const aName = (a.name || a.id || "").toLowerCase();
      const bName = (b.name || b.id || "").toLowerCase();
      return aName.localeCompare(bName);
    });

    rooms.forEach((room) => {
      listEl.appendChild(buildRoomItem(room, settings));
    });
  } catch (err) {
    setStatus("Failed to load rooms: " + err.message, "error");
  }
}

// ---------------------------------------------------------------
// Open a room in a new Thunderbird tab
// ---------------------------------------------------------------

function openRoom(roomName, settings) {
  const roomPageUrl =
    browser.runtime.getURL("content/room.html") +
    "?serverUrl=" +
    encodeURIComponent(settings.serverUrl) +
    "&room=" +
    encodeURIComponent(roomName) +
    "&participantName=" +
    encodeURIComponent(settings.participantName || "Guest");

  browser.tabs.create({ url: roomPageUrl });
}

// ---------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------

document
  .getElementById("refresh-btn")
  .addEventListener("click", loadRooms);

document.getElementById("settings-btn").addEventListener("click", () => {
  browser.runtime.openOptionsPage();
});

// Auto-refresh every 30 seconds
const autoRefreshTimer = setInterval(loadRooms, 30_000);

// Re-fetch whenever the sidebar becomes visible again
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadRooms();
  }
});

// Clear the interval when the sidebar page is unloaded to avoid
// retaining the timer after the sidebar is hidden or the extension reloads.
window.addEventListener("unload", () => {
  clearInterval(autoRefreshTimer);
});

// Initial load
loadRooms();
