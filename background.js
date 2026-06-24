// background.js — Tab Memory service worker
// Owns the notes store (chrome.storage.local) and keeps the toolbar badge
// in sync with how many tabs currently have a note.

const STORE_KEY = "tabNotes";
const BADGE_COLOR = "#D9A857";

/** @returns {Promise<Object<string, {url:string,title:string,note:string,createdAt:number,updatedAt:number}>>} */
async function getNotes() {
  const data = await chrome.storage.local.get(STORE_KEY);
  return data[STORE_KEY] || {};
}

async function setNotes(notes) {
  await chrome.storage.local.set({ [STORE_KEY]: notes });
}

async function refreshBadge() {
  const notes = await getNotes();
  const count = Object.keys(notes).length;
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

function isNotableUrl(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

async function notifyTab(tab) {
  if (!tab || !tab.id || !isNotableUrl(tab.url)) return;
  const notes = await getNotes();
  const existing = notes[tab.url] || null;
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "TAB_FOCUSED",
      url: tab.url,
      title: tab.title || tab.url,
      existingNote: existing,
    });
  } catch {
    // Content script may not be injected yet (e.g. chrome:// pages, or
    // the page loaded before the extension did) — safe to ignore.
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await notifyTab(tab);
  } catch {
    /* tab may have closed already */
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    await notifyTab(tab);
  }
});

chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STORE_KEY]) {
    refreshBadge();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const notes = await getNotes();

    switch (message?.type) {
      case "SAVE_NOTE": {
        const { url, title, note } = message;
        if (!url || !note || !note.trim()) {
          sendResponse({ ok: false, error: "Empty note" });
          return;
        }
        const now = Date.now();
        const existing = notes[url];
        notes[url] = {
          url,
          title: title || url,
          note: note.trim(),
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
        await setNotes(notes);
        sendResponse({ ok: true, note: notes[url] });
        break;
      }

      case "DELETE_NOTE": {
        const { url } = message;
        if (url && notes[url]) {
          delete notes[url];
          await setNotes(notes);
        }
        sendResponse({ ok: true });
        break;
      }

      case "GET_NOTE": {
        sendResponse({ ok: true, note: notes[message.url] || null });
        break;
      }

      case "GET_ALL_NOTES": {
        sendResponse({ ok: true, notes });
        break;
      }

      default:
        sendResponse({ ok: false, error: "Unknown message type" });
    }
  })();

  // Tell Chrome we'll respond asynchronously.
  return true;
});
