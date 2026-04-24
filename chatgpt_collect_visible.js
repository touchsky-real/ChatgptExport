(function () {
  if (window.__chatgptCollector?.cleanup) {
    window.__chatgptCollector.cleanup();
  }

  function normalizeText(text) {
    return text
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return String(hash >>> 0);
  }

  function normalizeRole(role) {
    return role === "user" ? "user" : "assistant";
  }

  function isUserBubble(el) {
    return Boolean(
      el?.matches?.(".user-message-bubble-color, [class*='user-message-bubble']")
    );
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function findMessageBody(messageEl) {
    return (
      (isUserBubble(messageEl) ? messageEl : null) ||
      messageEl.querySelector(".user-message-bubble-color") ||
      messageEl.querySelector("[class*='user-message-bubble']") ||
      messageEl.querySelector(".whitespace-pre-wrap") ||
      messageEl.querySelector(".markdown") ||
      messageEl.querySelector(".prose") ||
      messageEl.querySelector("[class*='markdown']") ||
      messageEl.querySelector("[class*='prose']") ||
      messageEl
    );
  }

  function extractMessageText(messageEl) {
    const body = findMessageBody(messageEl);
    if (!body) return "";

    const cloned = body.cloneNode(true);
    cloned.querySelectorAll("button, svg, form, textarea").forEach((node) => node.remove());

    const text = normalizeText(cloned.innerText || "");
    return text;
  }

  function getConversationTitle() {
    const title =
      document.querySelector("main h1")?.innerText ||
      document.title ||
      "chatgpt_conversation";
    return title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "chatgpt_conversation";
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "chatgpt-collector-panel";
    panel.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:999999",
      "width:300px",
      "padding:12px",
      "background:rgba(20,20,20,0.92)",
      "color:#fff",
      "font:14px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
      "border-radius:12px",
      "box-shadow:0 10px 30px rgba(0,0,0,0.25)",
    ].join(";");

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <strong>Collector</strong>
        <button type="button" data-action="close" style="border:0;background:#444;color:#fff;border-radius:8px;padding:4px 8px;cursor:pointer;">Close</button>
      </div>
      <div data-role="status" style="margin-bottom:10px;color:#cfd3d8;">Waiting...</div>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;color:#d8dee6;cursor:pointer;">
        <input type="checkbox" data-role="include-user" style="margin:0;" checked />
        <span>Include user</span>
      </label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button type="button" data-action="scan" style="border:0;background:#2d6cdf;color:#fff;border-radius:8px;padding:8px;cursor:pointer;">Scan Visible</button>
        <button type="button" data-action="toggle" style="border:0;background:#1f8f55;color:#fff;border-radius:8px;padding:8px;cursor:pointer;">Auto: On</button>
        <button type="button" data-action="download" style="border:0;background:#b97515;color:#fff;border-radius:8px;padding:8px;cursor:pointer;">Download MD</button>
        <button type="button" data-action="copy" style="border:0;background:#7a3db4;color:#fff;border-radius:8px;padding:8px;cursor:pointer;">Copy All</button>
      </div>
      <div style="margin-top:10px;color:#aeb7c2;font-size:12px;">
        手动滚动页面，脚本会把当前已渲染且可见的消息去重后累加；默认同时导出 assistant 和 user，可按需关闭 user。
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  const state = {
    auto: true,
    includeUser: true,
    items: [],
    lastDownloadedCount: 0,
    seen: new Set(),
    panel: createPanel(),
  };

  function updateStatus(extra = "") {
    const status = state.panel.querySelector("[data-role='status']");
    const message = [
      `Collected: ${state.items.length}`,
      `Auto: ${state.auto ? "On" : "Off"}`,
      `User: ${state.includeUser ? "On" : "Off"}`,
      extra,
    ]
      .filter(Boolean)
      .join(" | ");
    status.textContent = message;
  }

  function markCollected(messageEl) {
    messageEl.style.outline = "2px solid rgba(45,108,223,0.65)";
    messageEl.style.outlineOffset = "2px";
  }

  function shouldCollectRole(role) {
    return role === "assistant" || (role === "user" && state.includeUser);
  }

  function inferRole(messageEl) {
    if (isUserBubble(messageEl)) return "user";
    return normalizeRole(messageEl.getAttribute("data-message-author-role"));
  }

  function getMessageCandidates() {
    const candidates = [];
    const seenElements = new Set();

    document.querySelectorAll("[data-message-author-role]").forEach((messageEl) => {
      if (seenElements.has(messageEl)) return;
      seenElements.add(messageEl);
      candidates.push(messageEl);
    });

    document
      .querySelectorAll(".user-message-bubble-color, [class*='user-message-bubble']")
      .forEach((bubbleEl) => {
        const candidate = bubbleEl.closest("[data-message-author-role]") || bubbleEl;
        if (seenElements.has(candidate)) return;
        seenElements.add(candidate);
        candidates.push(candidate);
      });

    return candidates;
  }

  function scanVisibleMessages() {
    let added = 0;
    const messages = getMessageCandidates();

    messages.forEach((messageEl) => {
      if (!isVisible(messageEl)) return;
      const role = inferRole(messageEl);
      if (!shouldCollectRole(role)) return;

      const text = extractMessageText(messageEl);
      if (!text) return;

      const key = hashText(`${role}\n${text}`);
      if (state.seen.has(key)) return;

      state.seen.add(key);
      state.items.push({ role, text });
      markCollected(messageEl);
      added += 1;
    });

    updateStatus(added ? `Added this scan: ${added}` : "No new visible messages");
  }

  function buildMarkdown() {
    return state.items
      .map(
        ({ role, text }, index) =>
          `## ${String(index + 1).padStart(3, "0")} [${role}]\n\n${text}`
      )
      .join("\n\n");
  }

  async function copyAll() {
    const markdown = buildMarkdown();
    if (!markdown) {
      updateStatus("Nothing to copy");
      return;
    }
    await navigator.clipboard.writeText(markdown);
    updateStatus("Copied combined Markdown to clipboard");
  }

  function downloadMarkdown() {
    const markdown = buildMarkdown();
    if (!markdown) {
      updateStatus("Nothing to download");
      return;
    }

    const blob = new Blob([markdown + "\n"], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getConversationTitle()}_collected.md`;
    a.click();
    URL.revokeObjectURL(url);
    state.lastDownloadedCount = state.items.length;
    updateStatus("Downloaded combined Markdown");
  }

  function hasUndownloadedItems() {
    return state.items.length > 0 && state.lastDownloadedCount < state.items.length;
  }

  let scrollTimer = null;
  function onScroll() {
    if (!state.auto) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(scanVisibleMessages, 250);
  }

  function onPanelClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;

    if (action === "scan") {
      scanVisibleMessages();
      return;
    }
    if (action === "toggle") {
      state.auto = !state.auto;
      button.textContent = `Auto: ${state.auto ? "On" : "Off"}`;
      updateStatus();
      return;
    }
    if (action === "download") {
      downloadMarkdown();
      return;
    }
    if (action === "copy") {
      copyAll().catch(() => updateStatus("Clipboard copy failed"));
      return;
    }
    if (action === "close") {
      if (hasUndownloadedItems()) {
        const shouldDownload = window.confirm(
          "You have collected Markdown that has not been downloaded yet. Download before closing?"
        );
        if (shouldDownload) {
          downloadMarkdown();
        }
      }
      cleanup();
    }
  }

  function onIncludeUserChange(event) {
    const checkbox = event.target.closest('[data-role="include-user"]');
    if (!checkbox) return;
    state.includeUser = checkbox.checked;
    updateStatus("User export option changed");
  }

  function cleanup() {
    window.removeEventListener("scroll", onScroll, true);
    state.panel.removeEventListener("click", onPanelClick);
    state.panel.removeEventListener("change", onIncludeUserChange);
    state.panel.remove();
    delete window.__chatgptCollector;
  }

  state.panel.addEventListener("click", onPanelClick);
  state.panel.addEventListener("change", onIncludeUserChange);
  window.addEventListener("scroll", onScroll, true);

  window.__chatgptCollector = {
    cleanup,
    scanVisibleMessages,
    getItems: () => [...state.items],
  };

  scanVisibleMessages();
  updateStatus("Ready");
})();
