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

/** Load and execute background.js in a sandboxed context.
 *  @param {object} [overrides] - Optional properties to merge into the VM context.
 */
function loadBackground(overrides = {}) {
  const src = fs.readFileSync(
    path.resolve(__dirname, "../../background.js"),
    "utf8"
  );
  const context = vm.createContext({
    browser: global.browser,
    messenger: global.messenger,
    console: global.console,
    ...overrides,
  });
  vm.runInContext(src, context);
}

/** Fire the onStartup listener registered by background.js. */
async function triggerStartup() {
  const [listener] = browser.runtime.onStartup.addListener.mock.calls[0];
  await listener();
}

/** Fire the onInstalled listener registered by background.js. */
async function triggerInstall(reason = "install") {
  const [listener] = browser.runtime.onInstalled.addListener.mock.calls[0];
  await listener({ reason });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Re-arm the mocks so Promises resolve cleanly on each test run.
  messenger.spaces.query.mockResolvedValue([]);
  messenger.spaces.create.mockResolvedValue({ id: 1, name: "openvidu-meet" });
});

// ─── Space registration ────────────────────────────────────────────────────

describe("background.js – spaces toolbar registration", () => {
  test("queries existing spaces before creating (onStartup)", async () => {
    loadBackground();
    await triggerStartup();
    expect(messenger.spaces.query).toHaveBeenCalledWith({ name: "openvidu-meet" });
  });

  test("queries existing spaces before creating (onInstalled)", async () => {
    loadBackground();
    await triggerInstall("update");
    expect(messenger.spaces.query).toHaveBeenCalledWith({ name: "openvidu-meet" });
  });

  test("calls messenger.spaces.create() when no existing space is found", async () => {
    loadBackground();
    await triggerStartup();
    expect(messenger.spaces.create).toHaveBeenCalledTimes(1);
  });

  test("skips messenger.spaces.create() when space already exists", async () => {
    messenger.spaces.query.mockResolvedValue([{ id: 1, name: "openvidu-meet" }]);
    loadBackground();
    await triggerStartup();
    expect(messenger.spaces.create).not.toHaveBeenCalled();
  });

  test("registers the space with name 'openvidu-meet'", async () => {
    loadBackground();
    await triggerStartup();
    expect(messenger.spaces.create).toHaveBeenCalledWith(
      "openvidu-meet",
      expect.any(String),
      expect.any(Object)
    );
  });

  test("points the space panel at the sidebar HTML page", async () => {
    loadBackground();
    await triggerStartup();
    const [, defaultUrl] = messenger.spaces.create.mock.calls[0];
    expect(defaultUrl).toBe("sidebar/sidebar.html");
  });

  test("sets the space title to 'OpenVidu Meet'", async () => {
    loadBackground();
    await triggerStartup();
    const [, , props] = messenger.spaces.create.mock.calls[0];
    expect(props).toMatchObject({ title: "OpenVidu Meet" });
  });

  test("provides defaultIcons as an object with 16 and 32 px entries", async () => {
    loadBackground();
    await triggerStartup();
    const [, , props] = messenger.spaces.create.mock.calls[0];
    expect(props.defaultIcons).toEqual({
      "16": "icons/icon.svg",
      "32": "icons/icon.svg",
    });
  });

  test("does not throw when messenger.spaces.create() rejects", async () => {
    messenger.spaces.create.mockRejectedValueOnce(new Error("Permission denied"));
    loadBackground();
    await expect(triggerStartup()).resolves.toBeUndefined();
  });

  test("logs errors from spaces.create() to the console", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    messenger.spaces.create.mockRejectedValueOnce(new Error("Permission denied"));
    loadBackground();
    await triggerStartup();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("[OpenVidu Meet]"),
      expect.any(Error)
    );
    consoleError.mockRestore();
  });

  test("logs errors from spaces.query() to the console", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    messenger.spaces.query.mockRejectedValueOnce(new Error("Query failed"));
    loadBackground();
    await triggerStartup();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("[OpenVidu Meet]"),
      expect.any(Error)
    );
    consoleError.mockRestore();
  });
});

// ─── Install-time options page ─────────────────────────────────────────────

describe("background.js – install handler", () => {
  test("registers an onInstalled listener", () => {
    loadBackground();
    expect(browser.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
  });

  test("registers an onStartup listener", () => {
    loadBackground();
    expect(browser.runtime.onStartup.addListener).toHaveBeenCalledTimes(1);
  });

  test("opens the options page when reason is 'install'", async () => {
    loadBackground();
    await triggerInstall("install");
    expect(browser.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  test("does not open the options page on 'update'", async () => {
    loadBackground();
    await triggerInstall("update");
    expect(browser.runtime.openOptionsPage).not.toHaveBeenCalled();
  });

  test("registers the space on install", async () => {
    loadBackground();
    await triggerInstall("install");
    expect(messenger.spaces.create).toHaveBeenCalledTimes(1);
  });

  test("registers the space on update", async () => {
    loadBackground();
    await triggerInstall("update");
    expect(messenger.spaces.create).toHaveBeenCalledTimes(1);
  });
});
