# thunderbird-openvidu-meet-provisioner

A Thunderbird WebExtension that integrates [OpenVidu Meet](https://openvidu.io/latest/meet/) videoconference rooms directly into Thunderbird.

## Features

- **Sidebar panel** – lists all available rooms from a deployed OpenVidu Meet server.
- **Open rooms in bold** – rooms that currently have active participants are shown in **bold** so they are easy to spot.
- **One-click join** – click any room in the sidebar to open the OpenVidu Meet UI embedded inside a new Thunderbird content tab.
- **Auto-refresh** – the room list refreshes automatically every 30 seconds and whenever the sidebar becomes visible.
- **"Open in browser" button** – in case the embedded iframe is restricted by the server's Content Security Policy, a button lets the user open the room directly in the default browser.
- **Test connection** – the settings page lets you verify that the server URL and credentials are correct before using the sidebar.

## Prerequisites

- Thunderbird 78 or later (WebExtension support).
- An already-deployed instance of [OpenVidu Meet](https://openvidu.io/latest/meet/).
- The LiveKit / OpenVidu API key and secret if you want to list all rooms (admin access).

## Installation

### From source

1. Clone or download this repository.
2. Open Thunderbird and navigate to  
   **Tools → Add-ons and Themes → Extensions**.
3. Click the gear icon (⚙) and choose **Debug Add-ons**.
4. Click **Load Temporary Add-on…** and select the `manifest.json` file from this repository.

### Packaging as `.xpi`

```bash
cd thunderbird-openvidu-meet-provisioner
zip -r openvidu-meet-provisioner.xpi . \
  --exclude ".git/*" "*.md" "*.xpi"
```

The resulting `.xpi` file can be installed via  
**Tools → Add-ons and Themes → Install Add-on From File…**.

## Configuration

After installation the settings page opens automatically.  You can also reach it at any time by clicking the **⚙** button in the sidebar panel.

| Setting | Description |
|---|---|
| **Server URL** | Base URL of your OpenVidu Meet deployment, e.g. `https://meet.example.com`. |
| **API Key** | LiveKit / OpenVidu API key (admin credentials). Used to authenticate the REST `GET /openvidu/api/rooms` call. |
| **API Secret** | LiveKit / OpenVidu API secret paired with the key above. |
| **Your display name** | The name shown to other participants when you join a room. Defaults to "Guest". |

All settings are stored locally inside Thunderbird and are never transmitted anywhere other than your configured server.

## Usage

1. Open the sidebar: **View → Sidebar → OpenVidu Meet**  
   (or use the keyboard shortcut assigned to that sidebar).
2. The sidebar lists all rooms returned by `GET /openvidu/api/rooms`.  
   Rooms with active participants are shown **in bold** with a green "Open" badge.
3. Click a room to join: a new Thunderbird content tab opens with the OpenVidu Meet UI embedded in an `<iframe>`.
4. Use the **↻** button in the sidebar header to refresh the list manually.
5. If the room cannot be embedded (e.g. CSP restrictions), use the  
   **↗ Open in browser** button inside the tab to open the room in the default browser.

## Extension structure

```
manifest.json          – WebExtension manifest
background.js          – Background script (handles tab creation)
icons/
  icon.svg             – Extension icon
sidebar/
  sidebar.html         – Left-panel room list
  sidebar.js           – Room fetching, rendering and auto-refresh
  sidebar.css          – Sidebar styles
content/
  room.html            – Embedded room page (opened as a Thunderbird tab)
  room.js              – Builds the room URL and loads it in an iframe
  room.css             – Styles for the embedded room page
options/
  options.html         – Settings page
  options.js           – Settings load/save and connection test
  options.css          – Settings page styles
```

## OpenVidu Meet REST API

The extension calls:

```
GET {serverUrl}/openvidu/api/rooms
Authorization: Basic {base64(apiKey:apiSecret)}
```

The response is expected to be one of:
- A JSON array of room objects
- `{ "content": [...] }` (OpenVidu Meet 3.x format)
- `{ "rooms": [...] }` (LiveKit-style format)

Each room object should contain:
- `name` or `id` – room identifier
- `numParticipants` / `num_participants` / `participantCount` – current participant count (used to determine "open" status)
- `activeRecording` (optional) – boolean, also treated as "open"

## Embedding

Rooms are embedded using an `<iframe>` pointed at:

```
{serverUrl}/#/{roomName}
```

This is the standard hash-routing URL used by OpenVidu Meet.  
See the [embedding documentation](https://openvidu.io/latest/meet/embedded/intro/) for advanced options such as the OpenVidu web component.

## License

Apache License 2.0 – see [LICENSE](LICENSE).