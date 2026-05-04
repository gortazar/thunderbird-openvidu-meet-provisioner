/**
 * tests/unit/url.test.js
 *
 * Unit tests for the pure URL-utility functions in src/lib/url.js.
 */

"use strict";

const { sanitizeServerUrl, buildRoomUrl } = require("../../src/lib/url");

// ─── sanitizeServerUrl ─────────────────────────────────────────────────────

describe("sanitizeServerUrl()", () => {
  // ── Valid inputs ──────────────────────────────────────────────────────────

  test("accepts an https:// URL and returns its origin", () => {
    expect(sanitizeServerUrl("https://meet.example.com")).toBe(
      "https://meet.example.com"
    );
  });

  test("accepts an http:// URL and returns its origin", () => {
    expect(sanitizeServerUrl("http://meet.local:8080")).toBe(
      "http://meet.local:8080"
    );
  });

  test("strips trailing slash from the URL", () => {
    expect(sanitizeServerUrl("https://meet.example.com/")).toBe(
      "https://meet.example.com"
    );
  });

  test("strips path, query and fragment from the URL (returns origin only)", () => {
    expect(
      sanitizeServerUrl("https://meet.example.com/some/path?foo=bar#hash")
    ).toBe("https://meet.example.com");
  });

  test("preserves non-default port numbers", () => {
    expect(sanitizeServerUrl("https://meet.example.com:4443")).toBe(
      "https://meet.example.com:4443"
    );
  });

  // ── Invalid / unsafe inputs ───────────────────────────────────────────────

  test("returns null for empty string", () => {
    expect(sanitizeServerUrl("")).toBeNull();
  });

  test("returns null for null", () => {
    expect(sanitizeServerUrl(null)).toBeNull();
  });

  test("returns null for undefined", () => {
    expect(sanitizeServerUrl(undefined)).toBeNull();
  });

  test("returns null for a plain hostname with no scheme", () => {
    expect(sanitizeServerUrl("meet.example.com")).toBeNull();
  });

  test("returns null for a relative path", () => {
    expect(sanitizeServerUrl("/relative/path")).toBeNull();
  });
});

// ─── buildRoomUrl ──────────────────────────────────────────────────────────

describe("buildRoomUrl()", () => {
  test("builds hash-routing URL correctly", () => {
    expect(buildRoomUrl("https://meet.example.com", "my-room")).toBe(
      "https://meet.example.com/#/my-room"
    );
  });

  test("percent-encodes special characters in room name", () => {
    expect(buildRoomUrl("https://meet.example.com", "room with spaces")).toBe(
      "https://meet.example.com/#/room%20with%20spaces"
    );
  });

  test("percent-encodes slashes in room name", () => {
    expect(buildRoomUrl("https://meet.example.com", "a/b")).toBe(
      "https://meet.example.com/#/a%2Fb"
    );
  });

  test("percent-encodes hash characters in room name", () => {
    expect(buildRoomUrl("https://meet.example.com", "room#1")).toBe(
      "https://meet.example.com/#/room%231"
    );
  });

  test("works with http origin", () => {
    expect(buildRoomUrl("http://localhost:3000", "dev-room")).toBe(
      "http://localhost:3000/#/dev-room"
    );
  });
});
