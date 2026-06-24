// content.js — Tab Memory in-page widget
// Shows a small, dismissible corner card asking "why did you open this tab?"
// or, if a note already exists, a quiet pill you can click to edit it.

(() => {
  const SESSION_DISMISS_KEY = "tabMemoryDismissedThisPage";
  let widgetEl = null;
  let currentNote = null;

  function alreadyDismissed() {
    try {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markDismissed() {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      /* ignore (e.g. sandboxed iframe) */
    }
  }

  function removeWidget() {
    if (widgetEl) {
      widgetEl.classList.add("tm-leaving");
      const el = widgetEl;
      widgetEl = null;
      setTimeout(() => el.remove(), 180);
    }
  }

  function buildShell() {
    const host = document.createElement("div");
    host.className = "tm-widget";
    host.setAttribute("data-tab-memory", "true");
    return host;
  }

  function showPrompt(url, title) {
    removeWidget();
    const host = buildShell();
    host.innerHTML = `
      <div class="tm-card">
        <button class="tm-close" type="button" aria-label="Dismiss">&times;</button>
        <div class="tm-label">TAB MEMORY</div>
        <div class="tm-question">Why did you open this tab?</div>
        <textarea class="tm-textarea" maxlength="280" placeholder="e.g. checking the PR comments before standup"></textarea>
        <div class="tm-actions">
          <button class="tm-btn tm-btn-ghost" type="button" data-action="skip">Not now</button>
          <button class="tm-btn tm-btn-primary" type="button" data-action="save">Save note</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(host);
    widgetEl = host;

    const textarea = host.querySelector(".tm-textarea");
    textarea.focus();

    host.querySelector(".tm-close").addEventListener("click", () => {
      markDismissed();
      removeWidget();
    });
    host.querySelector('[data-action="skip"]').addEventListener("click", () => {
      markDismissed();
      removeWidget();
    });
    host.querySelector('[data-action="save"]').addEventListener("click", () => {
      const value = textarea.value.trim();
      if (!value) {
        textarea.focus();
        return;
      }
      saveNote(url, title, value);
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        host.querySelector('[data-action="save"]').click();
      }
    });
  }

  function showSavedPill(note) {
    removeWidget();
    const host = buildShell();
    host.innerHTML = `
      <div class="tm-pill">
        <span class="tm-pill-dot"></span>
        <span class="tm-pill-text">${escapeHtml(truncate(note.note, 60))}</span>
        <button class="tm-pill-edit" type="button" aria-label="Edit note">✎</button>
        <button class="tm-pill-close" type="button" aria-label="Dismiss">&times;</button>
      </div>
    `;
    document.documentElement.appendChild(host);
    widgetEl = host;

    host.querySelector(".tm-pill-close").addEventListener("click", () => {
      markDismissed();
      removeWidget();
    });
    host.querySelector(".tm-pill-edit").addEventListener("click", () => {
      showPrompt(note.url, note.title);
      const ta = widgetEl.querySelector(".tm-textarea");
      ta.value = note.note;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });

    // Quiet auto-fade of the pill after a few seconds — the note is safe,
    // no need to keep occupying screen space.
    setTimeout(() => {
      if (widgetEl === host) removeWidget();
    }, 6000);
  }

  function saveNote(url, title, noteText) {
    chrome.runtime.sendMessage(
      { type: "SAVE_NOTE", url, title, note: noteText },
      (response) => {
        currentNote = response?.note || null;
        if (currentNote) showSavedPill(currentNote);
        else removeWidget();
      }
    );
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "TAB_FOCUSED") return;
    currentNote = message.existingNote || null;

    if (alreadyDismissed()) return;

    if (currentNote) {
      showSavedPill(currentNote);
    } else {
      showPrompt(message.url, message.title);
    }
  });
})();
