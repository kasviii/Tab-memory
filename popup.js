// popup.js — Tab Memory popup logic

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const template = document.getElementById("item-template");

let allNotes = [];

function getAllNotes() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_ALL_NOTES" }, (response) => {
      resolve(response?.notes || {});
    });
  });
}

function deleteNote(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "DELETE_NOTE", url }, () => resolve());
  });
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return "";
  }
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function render(notes) {
  listEl.innerHTML = "";

  if (notes.length === 0) {
    emptyEl.hidden = false;
    listEl.style.display = "none";
    return;
  }
  emptyEl.hidden = true;
  listEl.style.display = "flex";

  for (const note of notes) {
    const node = template.content.cloneNode(true);
    const item = node.querySelector(".tm-item");
    node.querySelector(".tm-favicon").src = faviconFor(note.url);
    node.querySelector(".tm-domain").textContent = domainOf(note.url);
    node.querySelector(".tm-domain").title = note.title || note.url;
    node.querySelector(".tm-time").textContent = relativeTime(note.updatedAt);
    node.querySelector(".tm-note-text").textContent = note.note;
    const link = node.querySelector(".tm-url");
    link.href = note.url;
    link.textContent = note.url;

    node.querySelector(".tm-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      item.style.opacity = "0.4";
      await deleteNote(note.url);
      allNotes = allNotes.filter((n) => n.url !== note.url);
      applyFilter();
    });

    listEl.appendChild(node);
  }
}

function updateCount(total) {
  countEl.textContent = `${total} saved`;
}

function applyFilter() {
  const q = searchEl.value.trim().toLowerCase();
  const filtered = q
    ? allNotes.filter(
        (n) =>
          n.note.toLowerCase().includes(q) ||
          n.url.toLowerCase().includes(q) ||
          (n.title || "").toLowerCase().includes(q)
      )
    : allNotes;
  updateCount(allNotes.length);
  render(filtered);
}

async function init() {
  const notesObj = await getAllNotes();
  allNotes = Object.values(notesObj).sort((a, b) => b.updatedAt - a.updatedAt);
  applyFilter();
}

searchEl.addEventListener("input", applyFilter);

init();
