# Tab Memory

A small Chrome extension that lets you jot down *why* you opened a tab —
then search and clean up those notes later from the toolbar popup.

## What it does

- When you open or switch to a tab, a small dark card slides in from the
  bottom-right corner asking **"Why did you open this tab?"**
- Type a quick note and hit **Save note** (or `Cmd/Ctrl + Enter`).
- If a tab already has a note, you'll see a small pill instead, which
  fades away on its own — click the pencil to edit it.
- Click the toolbar icon to see **every** saved note in one place, with
  live search and a delete button on each.
- The toolbar badge always shows how many tabs currently have a note.

Notes are stored locally on your machine (`chrome.storage.local`) — nothing
is sent anywhere.

## Notes on behavior

- The prompt only appears on regular web pages (`http://` / `https://`) —
  Chrome doesn't allow extensions to run on internal pages like
  `chrome://extensions` or the new-tab page itself.
- Dismissing a prompt with **Not now** or the `×` won't ask again for that
  page until you reload it or revisit it in a fresh tab load.
- Editing an existing note re-opens the same input — saving overwrites the
  previous note for that exact URL.

## File structure

```
tab-memory/
├── manifest.json     — extension config (Manifest V3)
├── background.js     — service worker: storage, badge, messaging
├── content.js         — in-page note prompt / pill widget
├── content.css
├── popup.html          — toolbar popup: list, search, delete
├── popup.js
├── popup.css
└── icons/              — toolbar + store icons (16/32/48/128)
```

## Making changes

After editing any file, go back to `chrome://extensions` and click the
refresh icon on the Tab Memory card to reload your changes.
