/**
 * tests/unit/manifest.test.js
 *
 * Unit tests for manifest.json Thunderbird compatibility settings.
 * Verifies options page wiring and absence of unsupported sidebar_action key.
 */

"use strict";

const manifest = require("../../manifest.json");

describe("manifest options configuration", () => {
  test("declares options page for Thunderbird preferences UI", () => {
    expect(manifest.options_page).toBe("options/options.html");
  });

  test("keeps options_ui page in sync with options_page", () => {
    expect(manifest.options_ui.page).toBe(manifest.options_page);
  });
});

describe("manifest Thunderbird compatibility", () => {
  test("does not declare sidebar_action (unsupported in Thunderbird spaces UI)", () => {
    expect(manifest.sidebar_action).toBeUndefined();
  });
});
