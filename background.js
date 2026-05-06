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
// The Spaces API was introduced in Thunderbird 100; guard against older builds.
if (typeof messenger !== "undefined" && typeof messenger.spaces?.create === "function") {
  messenger.spaces
    .create("openvidu-meet", "sidebar/sidebar.html", {
      title: "OpenVidu Meet",
      defaultIcons: "icons/icon.svg",
    })
    .catch((err) => {
      // Thunderbird throws when the space name is already registered.
      // This is expected when the extension is reloaded in developer mode
      // without restarting Thunderbird. Any other failure is unexpected
      // and should be surfaced so the missing toolbar button can be diagnosed.
      if (!err?.message?.toLowerCase().includes("already exists")) {
        console.error("[OpenVidu Meet] Failed to register space:", err);
      }
    });
}
