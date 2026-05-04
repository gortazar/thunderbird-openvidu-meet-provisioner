// Background script for OpenVidu Meet Provisioner
// Handles extension lifecycle events

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the options page on first install so the user can configure the server
    browser.runtime.openOptionsPage();
  }
});
