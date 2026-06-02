/**
 * ui.js
 * UI helpers — DOM queries, rendering, state updates.
 * No business logic here; all rendering lives in this file.
 */

const UI = (() => {

  /* ── DOM refs ─────────────────────────────────────────────── */
  const el = id => document.getElementById(id);
  const customSelects = {};

  // Close dropdowns on clicking outside
  document.addEventListener("click", () => {
    Object.keys(customSelects).forEach(id => {
      if (customSelects[id]) customSelects[id].close();
    });
  });

  const refs = {
    srcLang:        el("srcLang"),
    tgtLang:        el("tgtLang"),
    inputText:      el("inputText"),
    outputArea:     el("outputArea"),
    charCount:      el("charCount"),
    wordCount:      el("wordCount"),
    translateBtn:   el("translateBtn"),
    btnSpinner:     el("btnSpinner"),
    btnArrow:       el("btnArrow"),
    swapBtn:        el("swapBtn"),
    clearBtn:       el("clearBtn"),
    pasteBtn:       el("pasteBtn"),
    copyBtn:        el("copyBtn"),
    shareBtn:       el("shareBtn"),
    ttsSourceBtn:   el("ttsSourceBtn"),
    ttsTargetBtn:   el("ttsTargetBtn"),
    romanizeBtn:    el("romanizeBtn"),
    formalBtn:      el("formalBtn"),
    casualBtn:      el("casualBtn"),
    explainBtn:     el("explainBtn"),
    synonymsBtn:    el("synonymsBtn"),
    backTranslateBtn: el("backTranslateBtn"),
    detectBadge:    el("detectBadge"),
    srcFlag:        el("srcFlag"),
    tgtFlag:        el("tgtFlag"),
    statusBar:      el("statusBar"),
    statusDot:      el("statusDot"),
    statusMsg:      el("statusMsg"),
    insightPanel:   el("insightPanel"),
    insightTitle:   el("insightTitle"),
    insightBody:    el("insightBody"),
    closeInsight:   el("closeInsight"),
    historyToggle:  el("historyToggle"),
    historyDrawer:  el("historyDrawer"),
    historyList:    el("historyList"),
    historyEmpty:   el("historyEmpty"),
    clearHistory:   el("clearHistory"),
    themeToggle:    el("themeToggle"),
    sunIcon:        el("sunIcon"),
    moonIcon:       el("moonIcon"),
    quickLangs:     el("quickLangs"),
    ringCircle:     el("ringCircle"),
    ringPct:        el("ringPct"),
    confidenceRing: el("confidenceRing"),
    settingsToggle: el("settingsToggle"),
    settingsModal:  el("settingsModal"),
    closeSettingsModal: el("closeSettingsModal"),
    apiProvider:    el("apiProvider"),
    apiKeyGroup:    el("apiKeyGroup"),
    apiKeyLabel:    el("apiKeyLabel"),
    apiKey:         el("apiKey"),
    apiKeyHelp:     el("apiKeyHelp"),
    apiProxyGroup:  el("apiProxyGroup"),
    apiProxy:       el("apiProxy"),
    toggleApiKey:   el("toggleApiKey"),
    saveSettingsBtn: el("saveSettingsBtn"),
  };

  /* ── Custom Select Helpers ────────────────────────────────── */
  function initCustomSelect(selectId) {
    const selectEl = el(selectId);
    if (!selectEl) return;

    // Hide original select
    selectEl.style.display = "none";

    // Create wrapper container
    const container = document.createElement("div");
    container.className = "custom-select";
    container.id = `custom-select-${selectId}`;

    // Create trigger button
    const trigger = document.createElement("button");
    trigger.className = "custom-select-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = `
      <span class="custom-select-trigger-label"></span>
      <svg class="custom-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    `;

    // Create dropdown panel
    const dropdown = document.createElement("div");
    dropdown.className = "custom-select-dropdown";
    dropdown.hidden = true;

    // Search wrapper and input
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "custom-select-search-wrapper";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "custom-select-search";
    searchInput.placeholder = "Search language...";
    searchInput.setAttribute("aria-label", "Search language");
    searchWrapper.appendChild(searchInput);
    dropdown.appendChild(searchWrapper);

    // List for options
    const optionsList = document.createElement("ul");
    optionsList.className = "custom-select-options";
    optionsList.setAttribute("role", "listbox");
    dropdown.appendChild(optionsList);

    container.appendChild(trigger);
    container.appendChild(dropdown);

    // Insert custom select into DOM
    selectEl.parentNode.insertBefore(container, selectEl.nextSibling);

    // Build options list
    function buildOptions() {
      optionsList.innerHTML = "";
      Array.from(selectEl.options).forEach(opt => {
        const li = document.createElement("li");
        li.className = "custom-select-option";
        li.textContent = opt.textContent;
        li.dataset.value = opt.value;
        li.setAttribute("role", "option");

        li.addEventListener("click", () => {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event("change"));
          closeDropdown();
        });

        optionsList.appendChild(li);
      });
    }

    buildOptions();

    // Toggle dropdown visibility
    function openDropdown() {
      // Close other dropdowns first
      Object.keys(customSelects).forEach(id => {
        if (id !== selectId && customSelects[id]) {
          customSelects[id].close();
        }
      });

      dropdown.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      searchInput.value = "";
      filterOptions("");
      
      // Delay focus slightly so the transition/display finishes
      setTimeout(() => searchInput.focus(), 50);
    }

    function closeDropdown() {
      dropdown.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dropdown.hidden) {
        openDropdown();
      } else {
        closeDropdown();
      }
    });

    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Filtering logic
    function filterOptions(query) {
      const q = query.toLowerCase().trim();
      const options = optionsList.querySelectorAll(".custom-select-option");
      options.forEach(opt => {
        const text = opt.textContent.toLowerCase();
        if (text.includes(q)) {
          opt.style.display = "flex";
        } else {
          opt.style.display = "none";
        }
      });
    }

    searchInput.addEventListener("input", (e) => {
      filterOptions(e.target.value);
    });

    // Synchronize trigger text & highlighted options
    function sync() {
      const activeValue = selectEl.value;
      const activeOpt = Array.from(selectEl.options).find(o => o.value === activeValue);
      if (activeOpt) {
        container.querySelector(".custom-select-trigger-label").textContent = activeOpt.textContent;
      }

      const options = optionsList.querySelectorAll(".custom-select-option");
      options.forEach(opt => {
        opt.classList.toggle("selected", opt.dataset.value === activeValue);
      });
    }

    customSelects[selectId] = {
      sync,
      close: closeDropdown,
      rebuild: buildOptions
    };

    sync();
  }

  /* ── Language selects ─────────────────────────────────────── */
  function populateSelects() {
    // Clear selects first to avoid duplication
    refs.srcLang.innerHTML = "";
    refs.tgtLang.innerHTML = "";

    // Source: add "auto-detect" + all languages
    const autoOpt = document.createElement("option");
    autoOpt.value = "auto";
    autoOpt.textContent = "🌐 Detect language";
    refs.srcLang.appendChild(autoOpt);

    LANGUAGES.forEach(lang => {
      const o1 = new Option(`${lang.flag} ${lang.name}`, lang.code);
      const o2 = new Option(`${lang.flag} ${lang.name}`, lang.code);
      refs.srcLang.appendChild(o1);
      refs.tgtLang.appendChild(o2);
    });

    refs.tgtLang.value = "fr"; // default target

    // Initialize custom searchable dropdowns
    initCustomSelect("srcLang");
    initCustomSelect("tgtLang");
  }

  /** Build quick-select language chips */
  function buildQuickChips(onSelect) {
    QUICK_LANGS.forEach(code => {
      const lang = getLang(code);
      if (!lang) return;
      const btn = document.createElement("button");
      btn.className = "ql-chip";
      btn.textContent = `${lang.flag} ${lang.name}`;
      btn.dataset.code = code;
      btn.setAttribute("aria-label", `Set target language to ${lang.name}`);
      btn.addEventListener("click", () => {
        document.querySelectorAll(".ql-chip").forEach(c => c.classList.remove("active-chip"));
        btn.classList.add("active-chip");
        refs.tgtLang.value = code;
        onSelect(code);
      });
      refs.quickLangs.appendChild(btn);
    });
    // Mark default
    syncQuickChips();
  }

  /** Highlight the chip matching the current target language */
  function syncQuickChips() {
    const current = refs.tgtLang.value;
    document.querySelectorAll(".ql-chip").forEach(c => {
      c.classList.toggle("active-chip", c.dataset.code === current);
    });
  }

  /* ── Flag & badge helpers ─────────────────────────────────── */
  function updateFlags() {
    const srcCode = refs.srcLang.value;
    const tgtCode = refs.tgtLang.value;
    const srcLang = srcCode === "auto" ? null : getLang(srcCode);
    const tgtLang = getLang(tgtCode);
    refs.srcFlag.textContent = srcLang ? srcLang.flag : "🌐";
    refs.tgtFlag.textContent = tgtLang ? tgtLang.flag : "";

    // Keep custom searchable selects in sync
    if (customSelects["srcLang"]) customSelects["srcLang"].sync();
    if (customSelects["tgtLang"]) customSelects["tgtLang"].sync();
  }

  function showDetectedBadge(langName) {
    refs.detectBadge.textContent = langName;
    refs.detectBadge.style.display = "inline-block";
  }

  function hideDetectedBadge() {
    refs.detectBadge.style.display = "none";
  }

  /* ── Output rendering ─────────────────────────────────────── */
  function setOutput(text) {
    refs.outputArea.textContent = text;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    refs.wordCount.textContent = words ? `${words} word${words !== 1 ? "s" : ""}` : "";
  }

  function setOutputPlaceholder() {
    refs.outputArea.innerHTML = '<p class="output-placeholder">Translation appears here…</p>';
    refs.wordCount.textContent = "";
  }

  function setOutputLoading() {
    refs.outputArea.innerHTML = `
      <div class="insight-loading">
        <div class="dot-pulse">
          <span></span><span></span><span></span>
        </div>
      </div>`;
  }

  /* ── Confidence ring ──────────────────────────────────────── */
  function updateRing(confidence) {
    // circumference = 2π × 15 ≈ 94.2
    const offset = 94.2 - (confidence / 100) * 94.2;
    refs.ringCircle.style.strokeDashoffset = offset;
    refs.ringPct.textContent = `${confidence}%`;
    refs.confidenceRing.style.display = "block";

    // Color the ring by confidence level
    const color = confidence >= 80 ? "var(--success)" : confidence >= 50 ? "var(--accent)" : "var(--error)";
    refs.ringCircle.style.stroke = color;
  }

  function hideRing() {
    refs.confidenceRing.style.display = "none";
  }

  /* ── Status bar ───────────────────────────────────────────── */
  function setStatus(type, message) {
    refs.statusBar.className = "status-bar" + (type !== "default" ? ` ${type}` : "");
    refs.statusMsg.textContent = message;
  }

  /* ── Translate button loading state ──────────────────────── */
  function setTranslateLoading(loading) {
    refs.translateBtn.classList.toggle("loading", loading);
    refs.translateBtn.disabled = loading;
  }

  /* ── Extra feature buttons ────────────────────────────────── */
  function enableExtras(enabled) {
    const buttons = [
      refs.formalBtn, refs.casualBtn, refs.explainBtn,
      refs.synonymsBtn, refs.backTranslateBtn,
      refs.copyBtn, refs.shareBtn, refs.ttsTargetBtn,
    ];
    buttons.forEach(btn => { if (btn) btn.disabled = !enabled; });
  }

  /* ── Insight panel ────────────────────────────────────────── */
  function showInsight(title, content, isLoading = false) {
    refs.insightTitle.textContent = title;
    if (isLoading) {
      refs.insightBody.innerHTML = `
        <div class="insight-loading">
          <div class="dot-pulse"><span></span><span></span><span></span></div>
          <span style="margin-left:8px;font-size:13px;color:var(--text-3)">Thinking…</span>
        </div>`;
    } else {
      refs.insightBody.textContent = content;
    }
    refs.insightPanel.style.display = "block";
  }

  function hideInsight() {
    refs.insightPanel.style.display = "none";
  }

  /* ── History drawer ───────────────────────────────────────── */
  function renderHistory(entries, onSelect) {
    refs.historyList.innerHTML = "";
    if (!entries.length) {
      refs.historyEmpty.style.display = "block";
      return;
    }
    refs.historyEmpty.style.display = "none";

    entries.forEach(entry => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.setAttribute("aria-label", `Restore: ${entry.srcText} → ${entry.tgtText}`);
      li.innerHTML = `
        <div class="history-item-langs">${entry.srcLangName || "?"} → ${entry.tgtLangName}</div>
        <div class="history-item-src">${escapeHtml(entry.srcText)}</div>
        <div class="history-item-tgt">${escapeHtml(entry.tgtText)}</div>`;
      li.addEventListener("click", () => onSelect(entry));
      li.addEventListener("keydown", e => { if (e.key === "Enter") onSelect(entry); });
      refs.historyList.appendChild(li);
    });
  }

  function toggleHistory(forceState) {
    const isHidden = refs.historyDrawer.hidden;
    const show = forceState !== undefined ? forceState : isHidden;
    refs.historyDrawer.hidden = !show;
    refs.historyToggle.classList.toggle("active", show);
  }

  /* ── Theme ────────────────────────────────────────────────── */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const isDark = theme === "dark";
    refs.sunIcon.style.display  = isDark ? "block" : "none";
    refs.moonIcon.style.display = isDark ? "none"  : "block";
  }

  /* ── Char count ───────────────────────────────────────────── */
  function updateCharCount(n) {
    refs.charCount.textContent = n;
    refs.charCount.style.color = n >= 2700 ? "var(--error)" : "var(--text-3)";
  }

  /* ── Util ─────────────────────────────────────────────────── */
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    refs,
    populateSelects,
    buildQuickChips,
    syncQuickChips,
    updateFlags,
    showDetectedBadge,
    hideDetectedBadge,
    setOutput,
    setOutputPlaceholder,
    setOutputLoading,
    updateRing,
    hideRing,
    setStatus,
    setTranslateLoading,
    enableExtras,
    showInsight,
    hideInsight,
    renderHistory,
    toggleHistory,
    applyTheme,
    updateCharCount,
  };
})();