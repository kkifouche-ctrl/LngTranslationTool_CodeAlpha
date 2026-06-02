/**
 * tts.js
 * Text-to-Speech module using the Web Speech API.
 * Handles speaking source and translated text.
 */

const TTS = (() => {
  let currentUtterance = null;
  let currentAudio = null;
  let audioQueue = [];
  const synth = window.speechSynthesis;

  /** Returns true if the browser supports TTS */
  function isSupported() {
    return !!synth || typeof Audio !== "undefined";
  }

  /** Helper to find a matching browser voice for a given 2-letter language code */
  function findVoiceForLang(langCode) {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;
    
    const target = langCode.toLowerCase().replace("_", "-");
    
    // 1. Try exact match (e.g. "en-us" matches "en-US")
    let match = voices.find(v => v.lang.toLowerCase().replace("_", "-") === target);
    if (match) return match;
    
    // 2. Try prefix match (e.g. "en" matches "en-US" or "en-GB")
    match = voices.find(v => v.lang.toLowerCase().replace("_", "-").startsWith(target + "-"));
    if (match) return match;
    
    // 3. Try fallback to first 2 letters prefix match (e.g. "zh-TW" matches "zh-CN")
    const shortTarget = target.split("-")[0];
    match = voices.find(v => v.lang.toLowerCase().replace("_", "-").startsWith(shortTarget));
    return match || null;
  }

  /** Returns true if the language is supported (locally or via online fallback) */
  function isLangSupported(langCode) {
    if (!langCode) return false;
    if (langCode === "auto") return true;
    
    // Support all languages as long as Audio or SpeechSynthesis is supported
    const hasAudio = typeof Audio !== "undefined";
    return hasAudio || !!synth;
  }

  /** Splits text into chunks of maximum length without breaking words */
  function splitTextIntoTtsChunks(text, maxLen) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = "";
    
    for (const word of words) {
      if ((currentChunk + " " + word).trim().length <= maxLen) {
        currentChunk = (currentChunk + " " + word).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  /** Plays audio chunks sequentially using HTML5 Audio */
  function playAudioChunks(chunks, langCode, onEnd) {
    audioQueue = [...chunks];
    
    function playNext() {
      if (audioQueue.length === 0) {
        currentAudio = null;
        if (onEnd) onEnd();
        return;
      }
      
      const chunkText = audioQueue.shift();
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(chunkText)}`;
      
      currentAudio = new Audio(url);
      currentAudio.addEventListener("ended", () => {
        playNext();
      });
      currentAudio.addEventListener("error", (e) => {
        console.error("TTS Fallback play error:", e);
        playNext();
      });
      
      currentAudio.play().catch(err => {
        console.error("Audio playback failed:", err);
        playNext();
      });
    }
    
    playNext();
  }

  /**
   * Speaks a string in the given language code.
   * Cancels any ongoing speech first.
   * @param {string} text - Text to speak
   * @param {string} langCode - BCP-47 language code (e.g. "fr", "zh")
   * @param {Function} [onEnd] - Optional callback when speech ends
   */
  function speak(text, langCode, onEnd) {
    if (!text.trim()) return;
    stop();

    const voice = findVoiceForLang(langCode);
    if (voice) {
      // Use local Speech Synthesis
      currentUtterance = new SpeechSynthesisUtterance(text);
      currentUtterance.voice = voice;
      currentUtterance.lang = voice.lang;
      currentUtterance.rate = 0.95;
      currentUtterance.pitch = 1;

      if (onEnd) currentUtterance.onend = onEnd;

      // Small timeout prevents a Chrome bug where speech fires before voices load
      setTimeout(() => {
        if (synth) synth.speak(currentUtterance);
      }, 80);
    } else {
      // Fallback to Google Translate TTS API via HTML5 Audio
      const cleanLang = langCode === "auto" ? "en" : langCode;
      const chunks = splitTextIntoTtsChunks(text, 150);
      playAudioChunks(chunks, cleanLang, onEnd);
    }
  }

  /** Stops any in-progress speech */
  function stop() {
    if (synth && synth.speaking) {
      synth.cancel();
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    audioQueue = [];
  }

  return { isSupported, speak, stop, isLangSupported };
})();