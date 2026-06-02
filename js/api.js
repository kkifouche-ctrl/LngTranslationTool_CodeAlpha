/**
 * api.js
 * Multi-backend translation support (MyMemory Free, Google Gemini, Anthropic Claude via CORS Proxy).
 * Each exported function returns a Promise.
 */

const API = (() => {
  // Load configuration from localStorage
  let config = {
    provider: localStorage.getItem("linguaflow_provider") || "google_free",
    key: localStorage.getItem("linguaflow_key") || "",
    proxy: localStorage.getItem("linguaflow_proxy") || ""
  };

  function updateConfig(newConfig) {
    config = { ...config, ...newConfig };
    localStorage.setItem("linguaflow_provider", config.provider);
    localStorage.setItem("linguaflow_key", config.key);
    localStorage.setItem("linguaflow_proxy", config.proxy);
  }

  function getConfig() {
    return { ...config };
  }

  /** Helper to get language code by name from LANGUAGES array */
  function getLangCodeByName(name) {
    if (!name) return "en";
    const cleanName = name.trim().toLowerCase();
    const match = LANGUAGES.find(l => l.name.toLowerCase() === cleanName);
    return match ? match.code : "en";
  }

  /** Gemini fetch wrapper */
  async function callGemini(prompt) {
    if (!config.key) {
      throw new Error("Google Gemini API Key is missing. Please configure it in Settings.");
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
    }
    const data = await res.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
      throw new Error("Invalid response structure from Gemini API");
    }
    return data.candidates[0].content.parts[0].text.trim();
  }

  /** Claude fetch wrapper */
  async function callClaude(prompt, maxTokens = 1024) {
    if (!config.key) {
      throw new Error("Anthropic Claude API Key is missing. Please configure it in Settings.");
    }
    const targetUrl = "https://api.anthropic.com/v1/messages";
    const proxyPrefix = config.proxy || "https://corsproxy.io/?url=";
    const url = proxyPrefix + encodeURIComponent(targetUrl);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Claude API error ${res.status}`);
    }

    const data = await res.json();
    if (!data.content || !data.content[0]) {
      throw new Error("Invalid response structure from Claude API");
    }
    return data.content.map(b => b.text || "").join("").trim();
  }

  /** Centralized dispatcher call helper */
  async function call(prompt, maxTokens = 1024) {
    if (config.provider === "gemini") {
      return await callGemini(prompt);
    } else if (config.provider === "anthropic") {
      return await callClaude(prompt, maxTokens);
    } else {
      throw new Error("This premium AI feature requires an LLM provider (Google Gemini or Anthropic Claude). Please click Settings in the top bar to configure an API key.");
    }
  }

  /** Translate text */
  async function translate(text, srcLangCode, srcLangName, tgtLangName) {
    if (config.provider === "google_free") {
      const tgtCode = getLangCodeByName(tgtLangName);
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLangCode}&tl=${tgtCode}&dt=t&q=${encodeURIComponent(text)}`);
      if (!res.ok) {
        throw new Error(`Google Translate error ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data[0]) {
        throw new Error("Invalid response from Google Translate");
      }
      const translation = data[0].map(s => s[0] || "").join("").trim();

      let detectedCode = srcLangCode;
      let detectedLanguage = srcLangName;

      if (srcLangCode === "auto" && data[2]) {
        detectedCode = data[2];
        const langObj = LANGUAGES.find(l => l.code === detectedCode);
        detectedLanguage = langObj ? langObj.name : detectedCode;
      }

      return {
        translation,
        detectedLanguage,
        detectedCode,
        confidence: 100
      };
    }

    if (config.provider === "mymemory") {
      const tgtCode = getLangCodeByName(tgtLangName);
      const srcCode = srcLangCode === "auto" ? "autodetect" : srcLangCode;
      
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcCode}|${tgtCode}`);
      if (!res.ok) {
        throw new Error(`MyMemory API error ${res.status}`);
      }
      const data = await res.json();
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || "MyMemory translation error");
      }

      let detectedCode = srcLangCode;
      let detectedLanguage = srcLangName;
      
      if (srcLangCode === "auto" && data.mtLangDet) {
        detectedCode = data.mtLangDet;
        const langObj = LANGUAGES.find(l => l.code === detectedCode);
        detectedLanguage = langObj ? langObj.name : detectedCode;
      }

      const confidence = data.responseData.match ? Math.round(data.responseData.match * 100) : 95;

      return {
        translation: data.responseData.translatedText,
        detectedLanguage,
        detectedCode,
        confidence
      };
    }

    // Otherwise, use AI prompt (Claude/Gemini)
    const autoDetect = srcLangCode === "auto";
    const prompt = autoDetect
      ? `You are a professional translation engine.

Detect the source language of the text below, then translate it to ${tgtLangName}.

Respond ONLY with a valid JSON object — no markdown, no preamble:
{
  "detectedLanguage": "<full language name in English>",
  "detectedCode": "<BCP-47 language code>",
  "translation": "<translated text>",
  "confidence": <integer 0-100>
}

Text:
${text}`
      : `You are a professional translation engine.

Translate the following text from ${srcLangName} to ${tgtLangName}.

Respond ONLY with a valid JSON object — no markdown, no preamble:
{
  "translation": "<translated text>",
  "confidence": <integer 0-100>
}

Text:
${text}`;

    const raw = await call(prompt, 1200);
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }

  /** Back translation */
  async function backTranslate(translatedText, fromLangName, toLangName) {
    if (config.provider === "google_free") {
      const srcCode = getLangCodeByName(fromLangName);
      const tgtCode = getLangCodeByName(toLangName);
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcCode}&tl=${tgtCode}&dt=t&q=${encodeURIComponent(translatedText)}`);
      if (!res.ok) {
        throw new Error(`Google Translate error ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data[0]) {
        throw new Error("Invalid response from Google Translate");
      }
      return data[0].map(s => s[0] || "").join("").trim();
    }

    if (config.provider === "mymemory") {
      const srcCode = getLangCodeByName(toLangName);
      const tgtCode = getLangCodeByName(fromLangName);
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(translatedText)}&langpair=${tgtCode}|${srcCode}`);
      if (!res.ok) {
        throw new Error(`MyMemory API error ${res.status}`);
      }
      const data = await res.json();
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || "MyMemory translation error");
      }
      return data.responseData.translatedText;
    }

    const prompt = `Translate the following text from ${fromLangName} back to ${toLangName}.
Return ONLY the translated text, nothing else.

Text:
${translatedText}`;

    return await call(prompt, 600);
  }

  /** Register tone translation */
  async function translateRegister(text, srcLangName, tgtLangName, register) {
    const prompt = `Translate the following text from ${srcLangName} to ${tgtLangName} in a ${register} register/tone.
Return ONLY the translated text, nothing else.

Text:
${text}`;

    return await call(prompt, 800);
  }

  /** Explain nuance */
  async function explainTranslation(srcText, translatedText, srcLangName, tgtLangName) {
    const prompt = `A user translated the following text from ${srcLangName} to ${tgtLangName}.

Source: "${srcText}"
Translation: "${translatedText}"

Provide a brief, helpful explanation covering:
1. Any important cultural nuances or context
2. Alternative translations or word choices
3. Any idioms, tone, or register notes

Keep it concise (3-5 sentences max). Write in plain text, no markdown.`;

    return await call(prompt, 600);
  }

  /** Alternatives */
  async function getAlternatives(text, srcLangName, tgtLangName) {
    const prompt = `Provide 4-5 alternative ways to translate the following text from ${srcLangName} to ${tgtLangName}.

Each alternative should differ in tone, formality, or wording.

Format your response as a simple numbered list like:
1. [alternative]
2. [alternative]
...

Source text: "${text}"`;

    return await call(prompt, 500);
  }

  /** Romanize */
  async function romanize(text, langName) {
    const prompt = `Romanize (transliterate to Latin script) the following ${langName} text.
Return ONLY the romanization, nothing else.

Text: ${text}`;

    return await call(prompt, 400);
  }

  return { 
    translate, 
    backTranslate, 
    translateRegister, 
    explainTranslation, 
    getAlternatives, 
    romanize,
    updateConfig,
    getConfig
  };
})();