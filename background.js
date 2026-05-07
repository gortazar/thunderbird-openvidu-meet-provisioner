// Background script for OpenVidu Meet Provisioner
// Handles extension lifecycle events

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the options page on first install so the user can configure the server
    browser.runtime.openOptionsPage();
  }
});

// Register the OpenVidu Meet space in the spaces toolbar.
// Thunderbird requires spaces to be created on every extension startup
// (they are not persisted between restarts of the background script).
(async () => {
  try {
    // Query first to avoid a duplicate-space error when the background
    // script is reloaded in developer mode without restarting Thunderbird.
    const existing = await messenger.spaces.query({ name: "openvidu-meet" });
    if (existing.length === 0) {
      await messenger.spaces.create("openvidu-meet", "sidebar/sidebar.html", {
        title: "OpenVidu Meet",
        defaultIcons: {
          "16": "icons/icon.svg",
          "32": "icons/icon.svg",
        },
      });
    }
  } catch (err) {
    console.error("[OpenVidu Meet] Failed to register space:", err);
  }
})();
