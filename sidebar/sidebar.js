/* global browser, isRoomOpen, participantLabel, sortRooms, fetchRooms */

"use strict";

// ---------------------------------------------------------------
// Settings
// ---------------------------------------------------------------

/** Return settings from local storage with sensible defaults. */
async function getSettings() {
  const settings = await browser.storage.local.get({
    serverUrl: "",
    apiKey: "",
    participantName: "",
  });
  // Remove legacy apiSecret left over from older installations.
  await browser.storage.local.remove("apiSecret");
  return settings;
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
  // Support both current API (roomName/roomId) and legacy (name/id)
  const name = room.roomName || room.name || room.roomId || room.id || "(unnamed)";
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
      "Please configure the OpenVidu Meet server URL in Settings (\u2699).",
      "warning"
    );
    return;
  }

  setStatus("Loading rooms\u2026", "loading");

  try {
    const rawRooms = await fetchRooms(
      settings.serverUrl,
      settings.apiKey
    );

    clearStatus();

    if (rawRooms.length === 0) {
      showEmptyState(true);
      return;
    }

    // Sort: open rooms first, then alphabetically within each group
    sortRooms(rawRooms).forEach((room) => {
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

