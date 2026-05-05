/**
 * src/lib/rooms.js
 *
 * Pure business-logic functions for OpenVidu Meet room management.
 * This file is loaded by the sidebar page (global scope) and
 * imported by Jest tests via CommonJS require().
 */

"use strict";

/**
 * Determine whether a room is "open" (has active participants).
 * Handles field names from different API versions:
 *   - OpenVidu Meet (current): status === "active_meeting"
 *   - Legacy/LiveKit variants: numParticipants, num_participants, participantCount
 *
 * @param {object} room - Room object from the API response
 * @returns {boolean}
 */
function isRoomOpen(room) {
  // OpenVidu Meet current API: status field
  if (room.status === "active_meeting") return true;

  // Legacy participant-count fields
  const count =
    room.numParticipants ??
    room.num_participants ??
    room.participantCount ??
    0;
  return count > 0 || room.activeRecording === true;
}

/**
 * Return a human-readable participant-count label, or null when the
 * room object does not carry any participant-count field.
 *
 * @param {object} room
 * @returns {string|null}
 */
function participantLabel(room) {
  const count =
    room.numParticipants ??
    room.num_participants ??
    room.participantCount ??
    null;
  if (count === null) return null;
  return count + " participant" + (count !== 1 ? "s" : "");
}

/**
 * Normalise an API response to a plain array of room objects.
 * Handles three known response shapes:
 *   - plain array          [ {...}, ... ]
 *   - Spring-page wrapper  { content: [ {...}, ... ] }
 *   - LiveKit wrapper      { rooms: [ {...}, ... ] }
 *
 * @param {*} data - Raw JSON response
 * @returns {Array}
 */
function normalizeRoomsResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  if (data && Array.isArray(data.rooms)) return data.rooms;
  return [];
}

/**
 * Sort rooms in-place-free (returns a new array):
 *   1. Open rooms come first
 *   2. Within each group, sort alphabetically (locale-aware)
 *
 * @param {Array} rooms
 * @returns {Array}
 */
function sortRooms(rooms) {
  return [...rooms].sort((a, b) => {
    const aOpen = isRoomOpen(a) ? 0 : 1;
    const bOpen = isRoomOpen(b) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    // Support both current API (roomName/roomId) and legacy (name/id)
    const aName = (a.roomName || a.name || a.roomId || a.id || "").toLowerCase();
    const bName = (b.roomName || b.name || b.roomId || b.id || "").toLowerCase();
    return aName.localeCompare(bName);
  });
}

/**
 * Fetch the list of rooms from the OpenVidu Meet REST API.
 *
 * @param {string} serverUrl  - Base URL of the OpenVidu Meet server
 * @param {string} [apiKey]   - OpenVidu Meet API key (sent as X-API-KEY header)
 * @returns {Promise<Array>}
 */
async function fetchRooms(serverUrl, apiKey) {
  const url = serverUrl.replace(/\/$/, "") + "/api/v1/rooms";
  const headers = {};
  if (apiKey) {
    headers["X-API-KEY"] = apiKey;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("HTTP " + response.status + " \u2013 " + response.statusText);
  }

  const data = await response.json();
  return normalizeRoomsResponse(data);
}

// ── CommonJS export for Jest (no-op in browser / global scope) ──────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isRoomOpen,
    participantLabel,
    normalizeRoomsResponse,
    sortRooms,
    fetchRooms,
  };
}
