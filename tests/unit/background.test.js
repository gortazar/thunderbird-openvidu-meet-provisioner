/**
 * tests/unit/background.test.js
 *
 * Unit tests for background.js.
 * Verifies that the OpenVidu Meet space is registered in the spaces toolbar
 * on every extension startup via messenger.spaces.create().
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

/** Load and execute background.js in a sandboxed context. */
function loadBackground() {
  const src = fs.readFileSync(
    path.resolve(__dirname, "../../background.js"),
    "utf8"
  );
  const context = vm.createContext({
    browser: global.browser,
    messenger: global.messenger,
  });
  vm.runInContext(src, context);
}

beforeEach(() => {
  jest.clearAllMocks();
  // Re-arm the mock so the Promise resolves cleanly on each test run.
  messenger.spaces.create.mockResolvedValue({ id: 1, name: "openvidu-meet" });
});

// ─── Space registration ────────────────────────────────────────────────────

describe("background.js – spaces toolbar registration", () => {
  test("calls messenger.spaces.create() on startup", () => {
    loadBackground();
    expect(messenger.spaces.create).toHaveBeenCalledTimes(1);
  });

  test("registers the space with name 'openvidu-meet'", () => {
    loadBackground();
    expect(messenger.spaces.create).toHaveBeenCalledWith(
      "openvidu-meet",
      expect.any(String),
      expect.any(Object)
    );
  });

  test("points the space panel at the sidebar HTML page", () => {
    loadBackground();
    const [, defaultUrl] = messenger.spaces.create.mock.calls[0];
    expect(defaultUrl).toBe("sidebar/sidebar.html");
  });

  test("sets the space title to 'OpenVidu Meet'", () => {
    loadBackground();
    const [, , props] = messenger.spaces.create.mock.calls[0];
    expect(props).toMatchObject({ title: "OpenVidu Meet" });
  });

  test("provides a defaultIcons path for the spaces toolbar button", () => {
    loadBackground();
    const [, , props] = messenger.spaces.create.mock.calls[0];
    expect(props.defaultIcons).toBe("icons/openvidu-meet.svg");
  });

  test("does not throw when messenger.spaces.create() rejects (duplicate space)", async () => {
    messenger.spaces.create.mockRejectedValueOnce(
      new Error("Space already exists")
    );
    expect(() => loadBackground()).not.toThrow();
    // Allow the rejected promise to settle without triggering an unhandledRejection.
    await Promise.resolve();
  });
});

// ─── Install-time options page ─────────────────────────────────────────────

describe("background.js – install handler", () => {
  test("registers an onInstalled listener", () => {
    loadBackground();
    expect(browser.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
  });

  test("opens the options page when reason is 'install'", () => {
    loadBackground();
    const [listener] = browser.runtime.onInstalled.addListener.mock.calls[0];
    listener({ reason: "install" });
    expect(browser.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  test("does not open the options page on 'update'", () => {
    loadBackground();
    const [listener] = browser.runtime.onInstalled.addListener.mock.calls[0];
    listener({ reason: "update" });
    expect(browser.runtime.openOptionsPage).not.toHaveBeenCalled();
  });
});
