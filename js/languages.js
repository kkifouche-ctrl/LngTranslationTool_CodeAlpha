/**
 * languages.js
 * Full list of supported languages with BCP-47 codes and flag emojis.
 * Used to populate <select> dropdowns and quick-chip buttons.
 */

const LANGUAGES = [
  { name: "Afrikaans",            code: "af", flag: "🇿🇦" },
  { name: "Albanian",             code: "sq", flag: "🇦🇱" },
  { name: "Arabic",               code: "ar", flag: "🇸🇦" },
  { name: "Armenian",             code: "hy", flag: "🇦🇲" },
  { name: "Azerbaijani",          code: "az", flag: "🇦🇿" },
  { name: "Basque",               code: "eu", flag: "🏴" },
  { name: "Belarusian",           code: "be", flag: "🇧🇾" },
  { name: "Bengali",              code: "bn", flag: "🇧🇩" },
  { name: "Bosnian",              code: "bs", flag: "🇧🇦" },
  { name: "Bulgarian",            code: "bg", flag: "🇧🇬" },
  { name: "Catalan",              code: "ca", flag: "🏴󠁥󠁳󠁣󠁴󠁿" },
  { name: "Chinese (Simplified)", code: "zh", flag: "🇨🇳" },
  { name: "Chinese (Traditional)",code: "zh-TW", flag: "🇹🇼" },
  { name: "Croatian",             code: "hr", flag: "🇭🇷" },
  { name: "Czech",                code: "cs", flag: "🇨🇿" },
  { name: "Danish",               code: "da", flag: "🇩🇰" },
  { name: "Dutch",                code: "nl", flag: "🇳🇱" },
  { name: "English",              code: "en", flag: "🇬🇧" },
  { name: "Estonian",             code: "et", flag: "🇪🇪" },
  { name: "Finnish",              code: "fi", flag: "🇫🇮" },
  { name: "French",               code: "fr", flag: "🇫🇷" },
  { name: "Galician",             code: "gl", flag: "🏴󠁥󠁳󠁧󠁡󠁿" },
  { name: "Georgian",             code: "ka", flag: "🇬🇪" },
  { name: "German",               code: "de", flag: "🇩🇪" },
  { name: "Greek",                code: "el", flag: "🇬🇷" },
  { name: "Gujarati",             code: "gu", flag: "🇮🇳" },
  { name: "Haitian Creole",       code: "ht", flag: "🇭🇹" },
  { name: "Hebrew",               code: "he", flag: "🇮🇱" },
  { name: "Hindi",                code: "hi", flag: "🇮🇳" },
  { name: "Hungarian",            code: "hu", flag: "🇭🇺" },
  { name: "Icelandic",            code: "is", flag: "🇮🇸" },
  { name: "Indonesian",           code: "id", flag: "🇮🇩" },
  { name: "Irish",                code: "ga", flag: "🇮🇪" },
  { name: "Italian",              code: "it", flag: "🇮🇹" },
  { name: "Japanese",             code: "ja", flag: "🇯🇵" },
  { name: "Kannada",              code: "kn", flag: "🇮🇳" },
  { name: "Kazakh",               code: "kk", flag: "🇰🇿" },
  { name: "Korean",               code: "ko", flag: "🇰🇷" },
  { name: "Latvian",              code: "lv", flag: "🇱🇻" },
  { name: "Lithuanian",           code: "lt", flag: "🇱🇹" },
  { name: "Macedonian",           code: "mk", flag: "🇲🇰" },
  { name: "Malay",                code: "ms", flag: "🇲🇾" },
  { name: "Maltese",              code: "mt", flag: "🇲🇹" },
  { name: "Marathi",              code: "mr", flag: "🇮🇳" },
  { name: "Mongolian",            code: "mn", flag: "🇲🇳" },
  { name: "Nepali",               code: "ne", flag: "🇳🇵" },
  { name: "Norwegian",            code: "no", flag: "🇳🇴" },
  { name: "Persian",              code: "fa", flag: "🇮🇷" },
  { name: "Polish",               code: "pl", flag: "🇵🇱" },
  { name: "Portuguese",           code: "pt", flag: "🇵🇹" },
  { name: "Punjabi",              code: "pa", flag: "🇮🇳" },
  { name: "Romanian",             code: "ro", flag: "🇷🇴" },
  { name: "Russian",              code: "ru", flag: "🇷🇺" },
  { name: "Serbian",              code: "sr", flag: "🇷🇸" },
  { name: "Sinhala",              code: "si", flag: "🇱🇰" },
  { name: "Slovak",               code: "sk", flag: "🇸🇰" },
  { name: "Slovenian",            code: "sl", flag: "🇸🇮" },
  { name: "Spanish",              code: "es", flag: "🇪🇸" },
  { name: "Swahili",              code: "sw", flag: "🇰🇪" },
  { name: "Swedish",              code: "sv", flag: "🇸🇪" },
  { name: "Tagalog",              code: "tl", flag: "🇵🇭" },
  { name: "Tamil",                code: "ta", flag: "🇮🇳" },
  { name: "Telugu",               code: "te", flag: "🇮🇳" },
  { name: "Thai",                 code: "th", flag: "🇹🇭" },
  { name: "Turkish",              code: "tr", flag: "🇹🇷" },
  { name: "Ukrainian",            code: "uk", flag: "🇺🇦" },
  { name: "Urdu",                 code: "ur", flag: "🇵🇰" },
  { name: "Uzbek",                code: "uz", flag: "🇺🇿" },
  { name: "Vietnamese",           code: "vi", flag: "🇻🇳" },
  { name: "Welsh",                code: "cy", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
];

/** Languages with non-Latin scripts that benefit from romanization */
const ROMANIZABLE_LANGS = new Set([
  "ar","he","hi","bn","gu","pa","ta","te","kn","ml","si","th",
  "ja","ko","zh","zh-TW","ru","uk","be","bg","sr","mk","ka","hy","mn","fa","ur"
]);

/** Popular languages shown as quick-select chips */
const QUICK_LANGS = ["en","fr","es","de","ar","zh","ja","ko","pt","ru","it","tr"];

/** Look up a language object by code */
function getLang(code) {
  return LANGUAGES.find(l => l.code === code) || null;
}