export const TOP_LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
] as const;

export type LanguageCode = (typeof TOP_LANGUAGES)[number]["code"];

export const LANGUAGE_CODES: ReadonlyArray<LanguageCode> = TOP_LANGUAGES.map((l) => l.code);

const LANGUAGE_CODE_SET = new Set<string>(LANGUAGE_CODES);

export function isSupportedLanguage(code: string): code is LanguageCode {
  return LANGUAGE_CODE_SET.has(code);
}
