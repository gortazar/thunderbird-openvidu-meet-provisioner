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
messenger.spaces
  .create("openvidu-meet", "sidebar/sidebar.html", {
    title: "OpenVidu Meet",
    defaultIcons: "icons/icon.svg",
  })
  .catch(() => {
    // Space already registered (e.g. extension reloaded without Thunderbird restart)
  });
