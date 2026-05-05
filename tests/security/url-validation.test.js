/**
 * tests/security/url-validation.test.js
 *
 * Security tests that verify the extension correctly rejects unsafe
 * input and prevents URL-injection and XSS attacks.
 */

"use strict";

const { sanitizeServerUrl, buildRoomUrl } = require("../../src/lib/url");
const { fetchRooms } = require("../../src/lib/rooms");

// ─── Scheme-injection via sanitizeServerUrl ────────────────────────────────

describe("sanitizeServerUrl() – scheme injection prevention", () => {
  const dangerousSchemes = [
    ["javascript: URI", "javascript:alert(1)"],
    ["data: URI (base64 HTML)", "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="],
    ["data: URI (plain HTML)", "data:text/html,<script>alert(1)</script>"],
    ["file: URI", "file:///etc/passwd"],
    ["ftp: URI", "ftp://files.example.com"],
    ["blob: URI", "blob:https://example.com/some-uuid"],
    ["chrome: URI", "chrome://settings/"],
    ["moz-extension: URI", "moz-extension://abc123/page.html"],
    ["vbscript: URI", "vbscript:msgbox(1)"],
    ["//scheme-relative URL", "//evil.com/path"],
    ["empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["bare hostname", "evil.com"],
    ["path-only URL", "/etc/passwd"],
    ["relative URL", "../../../etc/passwd"],
  ];

  test.each(dangerousSchemes)(
    "rejects %s → returns null",
    (_label, input) => {
      expect(sanitizeServerUrl(input)).toBeNull();
    }
  );

  test("accepts https:// scheme", () => {
    expect(sanitizeServerUrl("https://meet.example.com")).not.toBeNull();
  });

  test("accepts http:// scheme (for local/dev deployments)", () => {
    expect(sanitizeServerUrl("http://localhost:3000")).not.toBeNull();
  });
});

// ─── URL encoding in buildRoomUrl ─────────────────────────────────────────

describe("buildRoomUrl() – room-name encoding / injection prevention", () => {
  test("encodes HTML angle brackets in room name", () => {
    const url = buildRoomUrl("https://meet.example.com", "<script>alert(1)</script>");
    expect(url).not.toContain("<");
    expect(url).not.toContain(">");
    expect(url).toContain("%3Cscript%3E");
  });

  test("encodes javascript: in room name so it cannot be a navigable href", () => {
    const url = buildRoomUrl("https://meet.example.com", "javascript:alert(1)");
    // The colon must be encoded
    expect(url).not.toContain("javascript:alert");
    expect(url).toContain("javascript%3Aalert");
  });

  test("encodes backslash directory traversal attempts", () => {
    const url = buildRoomUrl("https://meet.example.com", "../../etc/passwd");
    // dots are not encoded by encodeURIComponent, but slashes are
    expect(url).not.toMatch(/\/etc\/passwd/);
    expect(url).toContain("..%2F..%2Fetc%2Fpasswd");
  });

  test("encodes null bytes in room name", () => {
    const url = buildRoomUrl("https://meet.example.com", "room\x00name");
    expect(url).toContain("%00");
  });

  test("encodes URL fragment (#) character so it cannot break routing", () => {
    const url = buildRoomUrl("https://meet.example.com", "room#fragment");
    expect(url).toContain("room%23fragment");
  });
});

// ─── Authorization header does not leak credentials into the URL ───────────

describe("fetchRooms() – credentials not leaked into URL", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
  });

  test("API key is not present in the request URL", async () => {
    await fetchRooms("https://meet.example.com", "supersecretkey");
    const [calledUrl] = global.fetch.mock.calls[0];
    expect(calledUrl).not.toContain("supersecretkey");
  });

  test("X-API-KEY header value is not exposed in the URL", async () => {
    await fetchRooms("https://meet.example.com", "myapikey");
    const [calledUrl, options] = global.fetch.mock.calls[0];
    // Header should exist in options, not URL
    expect(options.headers["X-API-KEY"]).toBe("myapikey");
    expect(calledUrl).not.toContain("myapikey");
  });
});

// ─── Input sanitisation preserves safe values ─────────────────────────────

describe("sanitizeServerUrl() – safe values preserved correctly", () => {
  test("does not alter a well-formed https URL origin", () => {
    expect(sanitizeServerUrl("https://meet.example.com")).toBe(
      "https://meet.example.com"
    );
  });

  test("sanitises by stripping query string (prevents query-string injection)", () => {
    const result = sanitizeServerUrl(
      "https://meet.example.com?redirect=javascript:alert(1)"
    );
    expect(result).toBe("https://meet.example.com");
  });

  test("sanitises by stripping fragment (prevents hash injection)", () => {
    const result = sanitizeServerUrl(
      "https://meet.example.com#javascript:alert(1)"
    );
    expect(result).toBe("https://meet.example.com");
  });

  test("sanitises by stripping path (prevents path-traversal injection)", () => {
    const result = sanitizeServerUrl(
      "https://meet.example.com/../../../evil"
    );
    expect(result).toBe("https://meet.example.com");
  });
});

// ─── options validateForm equivalent – scheme guard (mirrors options.js) ──
//
// options.js now calls sanitizeServerUrl() instead of bare new URL(),
// so these same cases must be rejected there too.

describe("sanitizeServerUrl() – options form scheme guard", () => {
  test("rejects ftp:// (not a browser-embeddable scheme)", () => {
    expect(sanitizeServerUrl("ftp://files.example.com")).toBeNull();
  });

  test("rejects file:// (local file access)", () => {
    expect(sanitizeServerUrl("file:///etc/passwd")).toBeNull();
  });

  test("rejects javascript: pseudo-scheme", () => {
    expect(sanitizeServerUrl("javascript:alert(1)")).toBeNull();
  });

  test("rejects data: URI", () => {
    expect(sanitizeServerUrl("data:text/html,<h1>hi</h1>")).toBeNull();
  });

  test("accepts https:// – valid server URL", () => {
    expect(sanitizeServerUrl("https://meet.example.com")).not.toBeNull();
  });

  test("accepts http:// – valid local/dev server URL", () => {
    expect(sanitizeServerUrl("http://localhost:3000")).not.toBeNull();
  });
});
