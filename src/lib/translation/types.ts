export type TranslateResult = {
  translatedText: string;
  detectedSourceLang?: string | null;
  latencyMs: number | null;
  provider: string;
};

export interface TranslationProvider {
  translate(input: {
    text: string;
    sourceLang: string;
    targetLang: string;
  }): Promise<TranslateResult>;
}
