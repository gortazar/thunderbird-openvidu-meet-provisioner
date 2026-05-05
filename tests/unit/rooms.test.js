/**
 * tests/unit/rooms.test.js
 *
 * Unit tests for the pure room-logic functions in src/lib/rooms.js.
 * No browser APIs, no network – fully deterministic.
 */

"use strict";

const {
  isRoomOpen,
  participantLabel,
  normalizeRoomsResponse,
  sortRooms,
} = require("../../src/lib/rooms");

// ─── isRoomOpen ────────────────────────────────────────────────────────────

describe("isRoomOpen()", () => {
  test("returns true when status is 'active_meeting' (OpenVidu Meet API)", () => {
    expect(isRoomOpen({ roomId: "r", status: "active_meeting" })).toBe(true);
  });

  test("returns false when status is 'open' (room available but no meeting active)", () => {
    expect(isRoomOpen({ roomId: "r", status: "open" })).toBe(false);
  });

  test("returns false when status is 'closed'", () => {
    expect(isRoomOpen({ roomId: "r", status: "closed" })).toBe(false);
  });

  test("returns true when numParticipants > 0", () => {
    expect(isRoomOpen({ name: "r", numParticipants: 3 })).toBe(true);
  });

  test("returns true when num_participants > 0 (snake_case variant)", () => {
    expect(isRoomOpen({ name: "r", num_participants: 1 })).toBe(true);
  });

  test("returns true when participantCount > 0 (LiveKit variant)", () => {
    expect(isRoomOpen({ name: "r", participantCount: 2 })).toBe(true);
  });

  test("returns false when numParticipants === 0", () => {
    expect(isRoomOpen({ name: "r", numParticipants: 0 })).toBe(false);
  });

  test("returns false when no participant-count field is present", () => {
    expect(isRoomOpen({ name: "r" })).toBe(false);
  });

  test("returns true when activeRecording is true (even with 0 participants)", () => {
    expect(isRoomOpen({ name: "r", numParticipants: 0, activeRecording: true })).toBe(true);
  });

  test("returns false when activeRecording is false and no participants", () => {
    expect(isRoomOpen({ name: "r", numParticipants: 0, activeRecording: false })).toBe(false);
  });

  test("numParticipants takes precedence over num_participants when both present", () => {
    // numParticipants ?? num_participants: first non-nullish wins
    expect(isRoomOpen({ numParticipants: 2, num_participants: 0 })).toBe(true);
  });

  test("handles numParticipants === null by falling through to next field", () => {
    expect(isRoomOpen({ numParticipants: null, num_participants: 1 })).toBe(true);
  });
});

// ─── participantLabel ──────────────────────────────────────────────────────

describe("participantLabel()", () => {
  test('returns "1 participant" for count 1', () => {
    expect(participantLabel({ numParticipants: 1 })).toBe("1 participant");
  });

  test('returns "0 participants" for count 0', () => {
    expect(participantLabel({ numParticipants: 0 })).toBe("0 participants");
  });

  test('returns "3 participants" for count 3', () => {
    expect(participantLabel({ numParticipants: 3 })).toBe("3 participants");
  });

  test("works with num_participants (snake_case)", () => {
    expect(participantLabel({ num_participants: 2 })).toBe("2 participants");
  });

  test("works with participantCount (LiveKit)", () => {
    expect(participantLabel({ participantCount: 5 })).toBe("5 participants");
  });

  test("returns null when no count field is present", () => {
    expect(participantLabel({ name: "r" })).toBeNull();
  });

  test("returns null when all count fields are null", () => {
    expect(
      participantLabel({ numParticipants: null, num_participants: null, participantCount: null })
    ).toBeNull();
  });
});

// ─── normalizeRoomsResponse ────────────────────────────────────────────────

describe("normalizeRoomsResponse()", () => {
  const rooms = [{ name: "a" }, { name: "b" }];

  test("returns data unchanged when it is already an array", () => {
    expect(normalizeRoomsResponse(rooms)).toEqual(rooms);
  });

  test("unwraps Spring-Page  { content: [...] }  format", () => {
    expect(normalizeRoomsResponse({ content: rooms, totalElements: 2 })).toEqual(rooms);
  });

  test("unwraps LiveKit  { rooms: [...] }  format", () => {
    expect(normalizeRoomsResponse({ rooms })).toEqual(rooms);
  });

  test("returns empty array for unexpected object shape", () => {
    expect(normalizeRoomsResponse({ data: rooms })).toEqual([]);
  });

  test("returns empty array for null input", () => {
    expect(normalizeRoomsResponse(null)).toEqual([]);
  });

  test("returns empty array for undefined input", () => {
    expect(normalizeRoomsResponse(undefined)).toEqual([]);
  });

  test("returns empty array for a string input", () => {
    expect(normalizeRoomsResponse("unexpected")).toEqual([]);
  });
});

// ─── sortRooms ─────────────────────────────────────────────────────────────

describe("sortRooms()", () => {
  test("open rooms come before closed rooms", () => {
    const rooms = [
      { name: "closed-1", numParticipants: 0 },
      { name: "open-1", numParticipants: 2 },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted[0].name).toBe("open-1");
    expect(sorted[1].name).toBe("closed-1");
  });

  test("within open rooms, sorts alphabetically", () => {
    const rooms = [
      { name: "beta", numParticipants: 1 },
      { name: "alpha", numParticipants: 3 },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted[0].name).toBe("alpha");
    expect(sorted[1].name).toBe("beta");
  });

  test("within closed rooms, sorts alphabetically", () => {
    const rooms = [
      { name: "zebra", numParticipants: 0 },
      { name: "apple", numParticipants: 0 },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted[0].name).toBe("apple");
    expect(sorted[1].name).toBe("zebra");
  });

  test("returns a new array without mutating the input", () => {
    const rooms = [
      { name: "b", numParticipants: 0 },
      { name: "a", numParticipants: 1 },
    ];
    const copy = [...rooms];
    sortRooms(rooms);
    expect(rooms).toEqual(copy); // original unchanged
  });

  test("handles an empty array", () => {
    expect(sortRooms([])).toEqual([]);
  });

  test("handles a single room", () => {
    const rooms = [{ name: "only", numParticipants: 0 }];
    expect(sortRooms(rooms)).toEqual(rooms);
  });

  test("uses room.id as fallback when room.name is absent", () => {
    const rooms = [
      { id: "z-room", numParticipants: 0 },
      { id: "a-room", numParticipants: 0 },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted[0].id).toBe("a-room");
  });

  test("uses room.roomName when present (OpenVidu Meet API)", () => {
    const rooms = [
      { roomId: "r2", roomName: "Zebra", status: "open" },
      { roomId: "r1", roomName: "Alpha", status: "open" },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted[0].roomName).toBe("Alpha");
    expect(sorted[1].roomName).toBe("Zebra");
  });

  test("uses room.roomId as fallback when room.roomName is absent (OpenVidu Meet API)", () => {
    const rooms = [
      { roomId: "z-room", status: "open" },
      { roomId: "a-room", status: "open" },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted[0].roomId).toBe("a-room");
  });

  test("active_meeting rooms sort before non-active rooms (OpenVidu Meet API)", () => {
    const rooms = [
      { roomId: "r1", roomName: "Alpha", status: "open" },
      { roomId: "r2", roomName: "Beta", status: "active_meeting" },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted[0].roomName).toBe("Beta");
    expect(sorted[1].roomName).toBe("Alpha");
  });

  test("complex mix: multiple open and closed rooms sorted correctly", () => {
    const rooms = [
      { name: "closed-z", numParticipants: 0 },
      { name: "open-b", numParticipants: 2 },
      { name: "closed-a", numParticipants: 0 },
      { name: "open-a", numParticipants: 1 },
    ];
    const sorted = sortRooms(rooms);
    expect(sorted.map((r) => r.name)).toEqual([
      "open-a",
      "open-b",
      "closed-a",
      "closed-z",
    ]);
  });
});
