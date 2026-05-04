/**
 * tests/e2e/sidebar.e2e.test.js
 *
 * End-to-end tests for the sidebar user experience.
 * Uses jsdom to simulate the browser DOM and verifies the full flow:
 *   fetch rooms → sort → render DOM items → user interactions.
 *
 * @jest-environment jsdom
 */

"use strict";

const {
  isRoomOpen,
  participantLabel,
  normalizeRoomsResponse,
  sortRooms,
  fetchRooms,
} = require("../../src/lib/rooms");

const { buildRoomUrl, sanitizeServerUrl } = require("../../src/lib/url");

// ─── DOM builder (mirrors sidebar.js buildRoomItem) ────────────────────────
//
// We reproduce the DOM-building logic here so that the e2e tests validate
// the same behaviour that sidebar.js expresses, without needing to load
// the full extension page in a browser.

function buildRoomItem(room, onSelect) {
  const name = room.name || room.id || "(unnamed)";
  const open = isRoomOpen(room);
  const pLabel = participantLabel(room);

  const li = document.createElement("li");
  li.className = "room-item" + (open ? " room-open" : "");
  li.setAttribute("role", "listitem");
  li.title = open ? name + " (open)" : name;

  const nameSpan = document.createElement("span");
  nameSpan.className = "room-name";
  nameSpan.textContent = name;
  li.appendChild(nameSpan);

  const statusRow = document.createElement("div");
  statusRow.className = "room-status-row";

  if (pLabel !== null) {
    const participantsSpan = document.createElement("span");
    participantsSpan.className = "room-participants";
    participantsSpan.textContent = pLabel;
    statusRow.appendChild(participantsSpan);
  }

  const badge = document.createElement("span");
  badge.className = "room-badge " + (open ? "badge-open" : "badge-closed");
  badge.textContent = open ? "Open" : "Closed";
  statusRow.appendChild(badge);

  li.appendChild(statusRow);
  li.addEventListener("click", () => onSelect(name));

  return li;
}

// ─── Render helpers ────────────────────────────────────────────────────────

function renderRoomsList(rooms) {
  const ul = document.createElement("ul");
  ul.id = "rooms-list";
  const sorted = sortRooms(rooms);
  sorted.forEach((room) => ul.appendChild(buildRoomItem(room, jest.fn())));
  document.body.appendChild(ul);
  return ul;
}

function getItems(ul) {
  return Array.from(ul.querySelectorAll(".room-item"));
}

// ─── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = "";
});

// ─── Rendering – open/closed visual distinction ───────────────────────────

describe("Sidebar DOM rendering – open vs closed rooms", () => {
  test("open room has the room-open CSS class", () => {
    const ul = renderRoomsList([{ name: "team", numParticipants: 2 }]);
    expect(getItems(ul)[0].classList.contains("room-open")).toBe(true);
  });

  test("closed room does NOT have the room-open class", () => {
    const ul = renderRoomsList([{ name: "empty", numParticipants: 0 }]);
    expect(getItems(ul)[0].classList.contains("room-open")).toBe(false);
  });

  test("open room shows an 'Open' badge", () => {
    const ul = renderRoomsList([{ name: "team", numParticipants: 2 }]);
    const badge = getItems(ul)[0].querySelector(".room-badge");
    expect(badge.textContent).toBe("Open");
    expect(badge.classList.contains("badge-open")).toBe(true);
  });

  test("closed room shows a 'Closed' badge", () => {
    const ul = renderRoomsList([{ name: "empty", numParticipants: 0 }]);
    const badge = getItems(ul)[0].querySelector(".room-badge");
    expect(badge.textContent).toBe("Closed");
    expect(badge.classList.contains("badge-closed")).toBe(true);
  });

  test("room name is rendered as text content (not innerHTML)", () => {
    const xssName = "<img src=x onerror=alert(1)>";
    const ul = renderRoomsList([{ name: xssName, numParticipants: 0 }]);
    const nameSpan = getItems(ul)[0].querySelector(".room-name");
    // The literal string is the text, not parsed as HTML
    expect(nameSpan.textContent).toBe(xssName);
    // No <img> element should have been injected
    expect(ul.querySelectorAll("img").length).toBe(0);
  });

  test("participant count is displayed when present", () => {
    const ul = renderRoomsList([{ name: "room", numParticipants: 4 }]);
    const countEl = getItems(ul)[0].querySelector(".room-participants");
    expect(countEl).not.toBeNull();
    expect(countEl.textContent).toBe("4 participants");
  });

  test("participant count row is omitted when no count field in room object", () => {
    const ul = renderRoomsList([{ name: "room-no-count" }]);
    const countEl = getItems(ul)[0].querySelector(".room-participants");
    expect(countEl).toBeNull();
  });
});

// ─── Sorting – open rooms first ───────────────────────────────────────────

describe("Sidebar DOM rendering – room ordering", () => {
  test("open rooms appear before closed rooms in the list", () => {
    const rooms = [
      { name: "aaa-closed", numParticipants: 0 },
      { name: "zzz-open", numParticipants: 5 },
    ];
    const ul = renderRoomsList(rooms);
    const items = getItems(ul);
    expect(items[0].querySelector(".room-name").textContent).toBe("zzz-open");
    expect(items[1].querySelector(".room-name").textContent).toBe("aaa-closed");
  });

  test("multiple open rooms are sorted alphabetically among themselves", () => {
    const rooms = [
      { name: "c-open", numParticipants: 1 },
      { name: "a-open", numParticipants: 3 },
      { name: "b-open", numParticipants: 2 },
    ];
    const ul = renderRoomsList(rooms);
    const names = getItems(ul).map((li) => li.querySelector(".room-name").textContent);
    expect(names).toEqual(["a-open", "b-open", "c-open"]);
  });

  test("empty list renders no items", () => {
    const ul = renderRoomsList([]);
    expect(getItems(ul).length).toBe(0);
  });
});

// ─── User interaction – clicking a room ───────────────────────────────────

describe("Sidebar DOM rendering – room click interaction", () => {
  test("clicking a room calls the onSelect callback with the room name", () => {
    const onSelect = jest.fn();
    const room = { name: "standup", numParticipants: 2 };
    const li = buildRoomItem(room, onSelect);
    li.click();
    expect(onSelect).toHaveBeenCalledWith("standup");
  });

  test("clicking a room only fires once per click", () => {
    const onSelect = jest.fn();
    const room = { name: "standup", numParticipants: 0 };
    const li = buildRoomItem(room, onSelect);
    li.click();
    li.click();
    expect(onSelect).toHaveBeenCalledTimes(2); // two clicks → two calls
  });

  test("falls back to room.id when room.name is absent", () => {
    const onSelect = jest.fn();
    const room = { id: "room-by-id", numParticipants: 0 };
    const li = buildRoomItem(room, onSelect);
    li.click();
    expect(onSelect).toHaveBeenCalledWith("room-by-id");
  });

  test("falls back to '(unnamed)' when neither name nor id is present", () => {
    const onSelect = jest.fn();
    const li = buildRoomItem({}, onSelect);
    li.click();
    expect(onSelect).toHaveBeenCalledWith("(unnamed)");
  });
});

// ─── Full flow: fetchRooms → render ───────────────────────────────────────

describe("Sidebar full flow – fetch then render", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test("fetched rooms are rendered in the DOM, open rooms listed first", async () => {
    const apiRooms = [
      { name: "all-hands", numParticipants: 0 },
      { name: "daily-standup", numParticipants: 3 },
      { name: "design-review", numParticipants: 0 },
    ];
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(apiRooms),
    });

    const rooms = await fetchRooms("https://meet.example.com", "k", "s");
    const ul = renderRoomsList(rooms);
    const names = getItems(ul).map((li) => li.querySelector(".room-name").textContent);

    expect(names[0]).toBe("daily-standup"); // open → first
    expect(names).toContain("all-hands");
    expect(names).toContain("design-review");
  });

  test("room URL is built from sanitized server URL and encoded room name", () => {
    const serverUrl = sanitizeServerUrl("https://meet.example.com/path?q=1");
    // path/query stripped; origin only
    expect(serverUrl).toBe("https://meet.example.com");
    const url = buildRoomUrl(serverUrl, "daily standup");
    expect(url).toBe("https://meet.example.com/#/daily%20standup");
  });

  test("API error during fetch is propagated as a rejected promise", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });
    await expect(fetchRooms("https://meet.example.com", "k", "s")).rejects.toThrow(
      "HTTP 403"
    );
  });
});
