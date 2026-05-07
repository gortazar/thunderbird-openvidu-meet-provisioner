/**
 * tests/unit/manifest.test.js
 *
 * Unit tests for manifest.json options page configuration.
 * Verifies options_page is declared and aligned with options_ui.page.
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
