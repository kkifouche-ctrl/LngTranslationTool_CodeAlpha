/**
 * app.js
 * Main application controller.
 * Wires UI events → API calls → UI updates.
 * Depends on: languages.js, tts.js, history.js, api.js, ui.js
 */

(async () => {
  /* ────────────────────────────────────────────────────────────
     State
  ──────────────────────────────────────────────────────────── */
  const state = {
    translatedText:   "",
    detectedLangName: "",
    detectedLangCode: "",
    isTranslating:    false,
    theme:            localStorage.getItem("linguaflow_theme") || "dark",
    activeExtra:      null,  // "explain" | "alternatives" | "formal" | "casual" | "back"
  };

  /* ────────────────────────────────────────────────────────────
     Init
  ──────────────────────────────────────────────────────────── */
  function init() {
    UI.populateSelects();
    UI.buildQuickChips(code => {
      UI.syncQuickChips();
      UI.updateFlags();
      updateTTSButtons();
    });
    UI.updateFlags();
    UI.applyTheme(state.theme);
    refreshHistory();
    bindEvents();
    updateTTSButtons();
  }

  /* ────────────────────────────────────────────────────────────
     Helpers
  ──────────────────────────────────────────────────────────── */
  const { refs } = UI;

  function getSrcLangName() {
    if (refs.srcLang.value === "auto") {
      return state.detectedLangName || "auto-detected";
    }
    const lang = getLang(refs.srcLang.value);
    return lang ? lang.name : "English";
  }

  function getTgtLangName() {
    const lang = getLang(refs.tgtLang.value);
    return lang ? lang.name : "French";
  }

  function canTranslate() {
    return refs.inputText.value.trim().length > 0 && !state.isTranslating;
  }

  function refreshTranslateBtn() {
    refs.translateBtn.disabled = !canTranslate();
  }

  /* ────────────────────────────────────────────────────────────
     Core translation
  ──────────────────────────────────────────────────────────── */
  async function runTranslation() {
    const text    = refs.inputText.value.trim();
    const srcCode = refs.srcLang.value;
    const tgtName = getTgtLangName();

    if (!text) return;

    state.isTranslating = true;
    state.translatedText = "";
    UI.setTranslateLoading(true);
    UI.setOutputLoading();
    UI.enableExtras(false);
    UI.hideInsight();
    UI.hideRing();
    UI.setStatus("default", `Translating to ${tgtName}…`);
    setActiveExtra(null);

    try {
      const result = await API.translate(text, srcCode, getSrcLangName(), tgtName);

      state.translatedText   = result.translation;
      state.detectedLangName = result.detectedLanguage || getSrcLangName();
      state.detectedLangCode = result.detectedCode     || refs.srcLang.value;

      UI.setOutput(state.translatedText);

      if (srcCode === "auto" && result.detectedLanguage) {
        UI.showDetectedBadge(result.detectedLanguage);
      }

      if (result.confidence != null) {
        UI.updateRing(result.confidence);
      }

      UI.setStatus("success", `Translated to ${tgtName} ✓`);
      UI.enableExtras(true);

      // Show romanize button for non-Latin scripts
      const tgtCode = refs.tgtLang.value;
      refs.romanizeBtn.style.display = ROMANIZABLE_LANGS.has(tgtCode) ? "flex" : "none";

      // Save to history
      History.add({
        srcText:     text,
        tgtText:     state.translatedText,
        srcLang:     srcCode === "auto" ? state.detectedLangCode : srcCode,
        tgtLang:     refs.tgtLang.value,
        srcLangName: state.detectedLangName,
        tgtLangName: tgtName,
      });
      refreshHistory();

    } catch (err) {
      UI.setOutputPlaceholder();
      UI.setStatus("error", `Error: ${err.message}`);
    } finally {
      state.isTranslating = false;
      UI.setTranslateLoading(false);
      refreshTranslateBtn();
      updateTTSButtons();
    }
  }

  /* ────────────────────────────────────────────────────────────
     Extra features
  ──────────────────────────────────────────────────────────── */
  function setActiveExtra(name) {
    state.activeExtra = name;
    [refs.formalBtn, refs.casualBtn, refs.explainBtn, refs.synonymsBtn, refs.backTranslateBtn].forEach(btn => {
      btn.classList.remove("active");
    });
    if (name === "formal") refs.formalBtn.classList.add("active");
    if (name === "casual") refs.casualBtn.classList.add("active");
    if (name === "explain") refs.explainBtn.classList.add("active");
    if (name === "alternatives") refs.synonymsBtn.classList.add("active");
    if (name === "back") refs.backTranslateBtn.classList.add("active");
  }

  async function handleFormal() {
    if (!state.translatedText) return;
    setActiveExtra("formal");
    UI.showInsight("Formal register", "", true);
    try {
      const result = await API.translateRegister(
        refs.inputText.value.trim(), getSrcLangName(), getTgtLangName(), "formal"
      );
      UI.showInsight("Formal register", result);
    } catch (e) {
      UI.showInsight("Error", e.message);
    }
  }

  async function handleCasual() {
    if (!state.translatedText) return;
    setActiveExtra("casual");
    UI.showInsight("Casual / informal register", "", true);
    try {
      const result = await API.translateRegister(
        refs.inputText.value.trim(), getSrcLangName(), getTgtLangName(), "casual/informal"
      );
      UI.showInsight("Casual / informal register", result);
    } catch (e) {
      UI.showInsight("Error", e.message);
    }
  }

  async function handleExplain() {
    if (!state.translatedText) return;
    setActiveExtra("explain");
    UI.showInsight("Cultural context & nuances", "", true);
    try {
      const result = await API.explainTranslation(
        refs.inputText.value.trim(), state.translatedText, getSrcLangName(), getTgtLangName()
      );
      UI.showInsight("Cultural context & nuances", result);
    } catch (e) {
      UI.showInsight("Error", e.message);
    }
  }

  async function handleAlternatives() {
    if (!state.translatedText) return;
    setActiveExtra("alternatives");
    UI.showInsight("Alternative translations", "", true);
    try {
      const result = await API.getAlternatives(
        refs.inputText.value.trim(), getSrcLangName(), getTgtLangName()
      );
      UI.showInsight("Alternative translations", result);
    } catch (e) {
      UI.showInsight("Error", e.message);
    }
  }

  async function handleBackTranslate() {
    if (!state.translatedText) return;
    setActiveExtra("back");
    const tgtName = getTgtLangName();
    const srcName = getSrcLangName();
    UI.showInsight(`Back-translation → ${srcName}`, "", true);
    try {
      const result = await API.backTranslate(state.translatedText, tgtName, srcName);
      UI.showInsight(`Back-translation → ${srcName}`, result);
    } catch (e) {
      UI.showInsight("Error", e.message);
    }
  }

  async function handleRomanize() {
    if (!state.translatedText) return;
    UI.showInsight("Romanization", "", true);
    try {
      const result = await API.romanize(state.translatedText, getTgtLangName());
      UI.showInsight("Romanization", result);
    } catch (e) {
      UI.showInsight("Error", e.message);
    }
  }

  /* ────────────────────────────────────────────────────────────
     Clipboard & sharing
  ──────────────────────────────────────────────────────────── */
  async function copyToClipboard() {
    if (!state.translatedText) return;
    try {
      await navigator.clipboard.writeText(state.translatedText);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = state.translatedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    refs.copyBtn.classList.add("copied");
    refs.copyBtn.querySelector("svg").innerHTML =
      '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>';
    setTimeout(() => {
      refs.copyBtn.classList.remove("copied");
      refs.copyBtn.querySelector("svg").innerHTML =
        '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>';
    }, 1800);
  }

  async function shareTranslation() {
    if (!state.translatedText) return;
    const shareText = `"${refs.inputText.value.trim()}" → "${state.translatedText}" (${getSrcLangName()} → ${getTgtLangName()}) via LinguaFlow`;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, title: "LinguaFlow translation" });
        return;
      } catch {}
    }
    // Fallback: copy the share text
    await navigator.clipboard.writeText(shareText).catch(() => {});
    UI.setStatus("success", "Share text copied to clipboard.");
  }

  /* ────────────────────────────────────────────────────────────
     Swap languages
  ──────────────────────────────────────────────────────────── */
  function swapLanguages() {
    const srcVal = refs.srcLang.value;
    if (srcVal === "auto") return; // can't swap when auto-detecting

    const tgtVal = refs.tgtLang.value;
    refs.srcLang.value = tgtVal;
    refs.tgtLang.value = srcVal;

    // Swap the text too if there's a translation
    if (state.translatedText) {
      refs.inputText.value = state.translatedText;
      UI.updateCharCount(refs.inputText.value.length);
      UI.setOutputPlaceholder();
      state.translatedText = "";
      UI.enableExtras(false);
      UI.hideRing();
      UI.hideDetectedBadge();
    }

    UI.updateFlags();
    UI.syncQuickChips();
    refreshTranslateBtn();
    updateTTSButtons();
  }

  /* ────────────────────────────────────────────────────────────
     History
  ──────────────────────────────────────────────────────────── */
  function refreshHistory() {
    const entries = History.load();
    UI.renderHistory(entries, entry => {
      refs.srcLang.value   = entry.srcLang || "auto";
      refs.tgtLang.value   = entry.tgtLang;
      refs.inputText.value = entry.srcText;
      UI.updateCharCount(entry.srcText.length);
      state.translatedText = entry.tgtText;
      UI.setOutput(entry.tgtText);
      UI.updateFlags();
      UI.syncQuickChips();
      UI.enableExtras(true);
      UI.toggleHistory(false);
      UI.setStatus("success", `Restored from history`);
    });
  }

  /* ────────────────────────────────────────────────────────────
     Theme
  ──────────────────────────────────────────────────────────── */
  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("linguaflow_theme", state.theme);
    UI.applyTheme(state.theme);
  }

  /* ────────────────────────────────────────────────────────────
     Event bindings
  ──────────────────────────────────────────────────────────── */
  function bindEvents() {
    // Text input
    refs.inputText.addEventListener("input", () => {
      UI.updateCharCount(refs.inputText.value.length);
      if (!refs.inputText.value.trim()) {
        UI.hideDetectedBadge();
        UI.setOutputPlaceholder();
        UI.enableExtras(false);
        UI.hideRing();
        state.translatedText = "";
      }
      refreshTranslateBtn();
      updateTTSButtons();
    });

    // Keyboard shortcut: Ctrl/Cmd+Enter to translate
    refs.inputText.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (canTranslate()) runTranslation();
      }
    });

    // Translate button click
    refs.translateBtn.addEventListener("click", runTranslation);

    // Language changes
    refs.srcLang.addEventListener("change", () => { 
      UI.updateFlags(); 
      UI.hideDetectedBadge(); 
      updateTTSButtons(); 
    });
    refs.tgtLang.addEventListener("change", () => { 
      UI.updateFlags(); 
      UI.syncQuickChips(); 
      updateTTSButtons(); 
    });

    // Swap
    refs.swapBtn.addEventListener("click", swapLanguages);

    // Clear
    refs.clearBtn.addEventListener("click", () => {
      refs.inputText.value = "";
      UI.updateCharCount(0);
      UI.setOutputPlaceholder();
      UI.enableExtras(false);
      UI.hideRing();
      UI.hideDetectedBadge();
      UI.hideInsight();
      state.translatedText = "";
      setActiveExtra(null);
      refreshTranslateBtn();
      UI.setStatus("default", "Ready — enter text to begin");
      updateTTSButtons();
    });

    // Paste from clipboard
    refs.pasteBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        refs.inputText.value = text.slice(0, 3000);
        UI.updateCharCount(refs.inputText.value.length);
        refreshTranslateBtn();
        updateTTSButtons();
      } catch {
        UI.setStatus("error", "Clipboard access denied.");
      }
    });

    // Voices loaded asynchronously
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", updateTTSButtons);
    }

    // Copy
    refs.copyBtn.addEventListener("click", copyToClipboard);

    // Share
    refs.shareBtn.addEventListener("click", shareTranslation);

    // TTS
    refs.ttsSourceBtn.addEventListener("click", () => {
      const code = refs.srcLang.value === "auto" ? (state.detectedLangCode || "en") : refs.srcLang.value;
      TTS.speak(refs.inputText.value, code);
    });
    refs.ttsTargetBtn.addEventListener("click", () => {
      TTS.speak(state.translatedText, refs.tgtLang.value);
    });

    // Romanize
    refs.romanizeBtn.addEventListener("click", handleRomanize);

    // Extra feature buttons
    refs.formalBtn.addEventListener("click", handleFormal);
    refs.casualBtn.addEventListener("click", handleCasual);
    refs.explainBtn.addEventListener("click", handleExplain);
    refs.synonymsBtn.addEventListener("click", handleAlternatives);
    refs.backTranslateBtn.addEventListener("click", handleBackTranslate);

    // Close insight
    refs.closeInsight.addEventListener("click", () => {
      UI.hideInsight();
      setActiveExtra(null);
    });

    // History
    refs.historyToggle.addEventListener("click", () => UI.toggleHistory());
    refs.clearHistory.addEventListener("click", () => {
      History.clear();
      refreshHistory();
    });

    // Theme
    refs.themeToggle.addEventListener("click", toggleTheme);

    // Settings
    refs.settingsToggle.addEventListener("click", openSettings);
    refs.closeSettingsModal.addEventListener("click", closeSettings);
    refs.apiProvider.addEventListener("change", toggleSettingsFields);
    refs.toggleApiKey.addEventListener("click", togglePasswordVisibility);
    refs.saveSettingsBtn.addEventListener("click", saveSettings);

    // Close settings modal on overlay click
    refs.settingsModal.addEventListener("click", e => {
      if (e.target === refs.settingsModal) closeSettings();
    });
  }

  /* ────────────────────────────────────────────────────────────
     Settings Modal Functions
  ──────────────────────────────────────────────────────────── */
  function openSettings() {
    const config = API.getConfig();
    refs.apiProvider.value = config.provider;
    refs.apiKey.value = config.key;
    refs.apiProxy.value = config.proxy;
    
    toggleSettingsFields();
    refs.settingsModal.style.display = "flex";
  }

  function closeSettings() {
    refs.settingsModal.style.display = "none";
  }

  function toggleSettingsFields() {
    const provider = refs.apiProvider.value;
    if (provider === "mymemory" || provider === "google_free") {
      refs.apiKeyGroup.style.display = "none";
      refs.apiProxyGroup.style.display = "none";
    } else if (provider === "gemini") {
      refs.apiKeyGroup.style.display = "flex";
      refs.apiProxyGroup.style.display = "none";
      refs.apiKeyLabel.textContent = "Google Gemini API Key";
      refs.apiKeyHelp.innerHTML = 'Get a free API Key from <a href="https://aistudio.google.com/" target="_blank" style="color:var(--accent)">Google AI Studio</a>.';
      refs.apiKey.placeholder = "AIzaSy...";
    } else if (provider === "anthropic") {
      refs.apiKeyGroup.style.display = "flex";
      refs.apiProxyGroup.style.display = "flex";
      refs.apiKeyLabel.textContent = "Anthropic Claude API Key";
      refs.apiKeyHelp.innerHTML = 'Get an API Key from the <a href="https://console.anthropic.com/" target="_blank" style="color:var(--accent)">Anthropic Console</a>.';
      refs.apiKey.placeholder = "sk-ant-...";
    }
  }

  function togglePasswordVisibility() {
    const type = refs.apiKey.type === "password" ? "text" : "password";
    refs.apiKey.type = type;
    refs.toggleApiKey.textContent = type === "password" ? "👁️" : "🙈";
  }

  function saveSettings() {
    const provider = refs.apiProvider.value;
    const key = refs.apiKey.value.trim();
    const proxy = refs.apiProxy.value.trim();
    
    if (provider !== "mymemory" && provider !== "google_free" && !key) {
      alert("Please enter an API key for the selected provider.");
      return;
    }
    
    API.updateConfig({ provider, key, proxy });
    closeSettings();
    const providerName = provider === "google_free" ? "Free Google Translate" : provider === "mymemory" ? "Free MyMemory" : provider === "gemini" ? "Google Gemini" : "Anthropic Claude";
    UI.setStatus("success", `Settings saved! Using ${providerName}`);
    updateTTSButtons();
  }

  /* ────────────────────────────────────────────────────────────
     Speech Synthesis Updates
  ──────────────────────────────────────────────────────────── */
  function updateTTSButtons() {
    const srcCode = refs.srcLang.value === "auto" ? state.detectedLangCode : refs.srcLang.value;
    const hasSourceText = refs.inputText.value.trim().length > 0;
    
    if (srcCode) {
      const srcSupported = TTS.isLangSupported(srcCode);
      refs.ttsSourceBtn.disabled = !hasSourceText || !srcSupported;
      refs.ttsSourceBtn.title = srcSupported ? "Speak source text" : "Speech not supported for this language in your browser";
    } else {
      refs.ttsSourceBtn.disabled = !hasSourceText;
      refs.ttsSourceBtn.title = "Speak source text";
    }

    const tgtCode = refs.tgtLang.value;
    const hasTargetText = state.translatedText.trim().length > 0;
    const tgtSupported = TTS.isLangSupported(tgtCode);
    refs.ttsTargetBtn.disabled = !hasTargetText || !tgtSupported;
    refs.ttsTargetBtn.title = tgtSupported ? "Speak translation" : "Speech not supported for this language in your browser";
  }

  /* ── Boot ── */
  init();

})();