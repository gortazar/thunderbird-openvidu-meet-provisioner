// Background script for OpenVidu Meet Provisioner
// Handles extension lifecycle and inter-component messaging

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the options page on first install so the user can configure the server
    browser.runtime.openOptionsPage();
  }
});

// Listen for messages from sidebar or content pages
browser.runtime.onMessage.addListener((message, _sender) => {
  if (message.action === "openRoom") {
    const { serverUrl, roomName, participantName } = message;
    const roomPageUrl =
      browser.runtime.getURL("content/room.html") +
      "?serverUrl=" +
      encodeURIComponent(serverUrl) +
      "&room=" +
      encodeURIComponent(roomName) +
      "&participantName=" +
      encodeURIComponent(participantName || "Guest");
    browser.tabs.create({ url: roomPageUrl });
  }
});
