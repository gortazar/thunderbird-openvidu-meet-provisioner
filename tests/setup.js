/**
 * tests/setup.js
 *
 * Global test setup – polyfills and mocks for browser APIs that are
 * not available in a plain Node.js / jsdom environment.
 */

"use strict";

// btoa / atob polyfill (available globally since Node 16; polyfill for older)
if (typeof global.btoa === "undefined") {
  global.btoa = (str) => Buffer.from(str, "binary").toString("base64");
}
if (typeof global.atob === "undefined") {
  global.atob = (str) => Buffer.from(str, "base64").toString("binary");
}

// fetch mock – replaced per-test with jest.fn() as needed
if (typeof global.fetch === "undefined") {
  global.fetch = jest.fn();
}

// Minimal WebExtension browser API stub so lib files that reference
// `browser.*` don't throw at import time.
if (typeof global.browser === "undefined") {
  global.browser = {
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
    tabs: {
      create: jest.fn(),
      getCurrent: jest.fn(),
      remove: jest.fn(),
    },
    runtime: {
      getURL: jest.fn((path) => "moz-extension://test-id/" + path),
      openOptionsPage: jest.fn(),
      onInstalled: { addListener: jest.fn() },
      onStartup: { addListener: jest.fn() },
    },
  };
}

// Minimal Thunderbird-specific messenger API stub.
// Provides only the `spaces` API used by background.js to register the
// extension in the spaces toolbar.
if (typeof global.messenger === "undefined") {
  global.messenger = {
    spaces: {
      create: jest.fn().mockResolvedValue({ id: 1, name: "openvidu" }),
      query: jest.fn().mockResolvedValue([]),
    },
  };
}
