/**
 * tests/integration/fetch-rooms.test.js
 *
 * Integration tests for fetchRooms() – verifies that it correctly
 * constructs the request, handles authentication, and normalises
 * the various response shapes returned by different OpenVidu Meet versions.
 */

"use strict";

const { fetchRooms } = require("../../src/lib/rooms");

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Create a minimal Response-like mock accepted by the fetchRooms function.
 */
function mockResponse(body, { status = 200, statusText = "OK" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
  };
}

// Reset the fetch mock before each test
beforeEach(() => {
  global.fetch = jest.fn();
});

// ─── Request construction ──────────────────────────────────────────────────

describe("fetchRooms() – request construction", () => {
  test("calls the correct rooms endpoint", async () => {
    global.fetch.mockResolvedValue(mockResponse([]));
    await fetchRooms("https://meet.example.com", "", "");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://meet.example.com/api/v1/rooms",
      expect.any(Object)
    );
  });

  test("strips trailing slash from serverUrl before appending the path", async () => {
    global.fetch.mockResolvedValue(mockResponse([]));
    await fetchRooms("https://meet.example.com/", "", "");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://meet.example.com/api/v1/rooms",
      expect.any(Object)
    );
  });

  test("sends X-API-KEY header when apiKey is provided", async () => {
    global.fetch.mockResolvedValue(mockResponse([]));
    await fetchRooms("https://meet.example.com", "myKey");
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["X-API-KEY"]).toBe("myKey");
  });

  test("does NOT add an X-API-KEY header when apiKey is empty", async () => {
    global.fetch.mockResolvedValue(mockResponse([]));
    await fetchRooms("https://meet.example.com", "");
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers).not.toHaveProperty("X-API-KEY");
  });

  test("does NOT add an X-API-KEY header when apiKey is absent", async () => {
    global.fetch.mockResolvedValue(mockResponse([]));
    await fetchRooms("https://meet.example.com");
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers).not.toHaveProperty("X-API-KEY");
  });
});

// ─── Response normalisation ────────────────────────────────────────────────

describe("fetchRooms() – response normalisation", () => {
  const rooms = [{ name: "room-a" }, { name: "room-b" }];

  test("returns rooms when the server responds with a plain array", async () => {
    global.fetch.mockResolvedValue(mockResponse(rooms));
    await expect(fetchRooms("https://meet.example.com")).resolves.toEqual(rooms);
  });

  test("unwraps { content: [...] } (Spring-Page format)", async () => {
    global.fetch.mockResolvedValue(
      mockResponse({ content: rooms, totalPages: 1, totalElements: 2 })
    );
    await expect(fetchRooms("https://meet.example.com")).resolves.toEqual(rooms);
  });

  test("unwraps { rooms: [...] } (LiveKit format)", async () => {
    global.fetch.mockResolvedValue(mockResponse({ rooms }));
    await expect(fetchRooms("https://meet.example.com")).resolves.toEqual(rooms);
  });

  test("returns empty array when response is an unrecognised object", async () => {
    global.fetch.mockResolvedValue(mockResponse({ data: rooms }));
    await expect(fetchRooms("https://meet.example.com")).resolves.toEqual([]);
  });

  test("returns empty array when server responds with JSON null", async () => {
    global.fetch.mockResolvedValue(mockResponse(null));
    await expect(fetchRooms("https://meet.example.com")).resolves.toEqual([]);
  });

  test("returns empty array when server responds with a JSON number", async () => {
    global.fetch.mockResolvedValue(mockResponse(42));
    await expect(fetchRooms("https://meet.example.com")).resolves.toEqual([]);
  });

  test("returns empty array when server responds with a JSON string", async () => {
    global.fetch.mockResolvedValue(mockResponse("ok"));
    await expect(fetchRooms("https://meet.example.com")).resolves.toEqual([]);
  });
});

// ─── Error handling ────────────────────────────────────────────────────────

describe("fetchRooms() – error handling", () => {
  test("throws an error when the server returns 401 Unauthorized", async () => {
    global.fetch.mockResolvedValue(
      mockResponse(null, { status: 401, statusText: "Unauthorized" })
    );
    await expect(fetchRooms("https://meet.example.com", "bad")).rejects.toThrow(
      "HTTP 401"
    );
  });

  test("throws an error when the server returns 404 Not Found", async () => {
    global.fetch.mockResolvedValue(
      mockResponse(null, { status: 404, statusText: "Not Found" })
    );
    await expect(fetchRooms("https://meet.example.com")).rejects.toThrow("HTTP 404");
  });

  test("throws an error when the server returns 500 Internal Server Error", async () => {
    global.fetch.mockResolvedValue(
      mockResponse(null, { status: 500, statusText: "Internal Server Error" })
    );
    await expect(fetchRooms("https://meet.example.com")).rejects.toThrow("HTTP 500");
  });

  test("propagates network errors (fetch rejection) to the caller", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchRooms("https://meet.example.com")).rejects.toThrow(
      "Failed to fetch"
    );
  });
});
