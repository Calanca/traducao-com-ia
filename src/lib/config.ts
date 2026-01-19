export function getMaxTranslationChars(): number {
  const raw = process.env.MAX_TRANSLATION_CHARS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
}
