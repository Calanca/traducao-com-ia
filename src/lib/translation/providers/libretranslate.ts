import { TranslationProvider, TranslateResult } from "../types";

type LibreTranslateResponse = {
  translatedText?: string;
};

export class LibreTranslateProvider implements TranslationProvider {
  private baseUrl: string;

  constructor(opts: { baseUrl: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
  }

  async translate(input: {
    text: string;
    sourceLang: string;
    targetLang: string;
  }): Promise<TranslateResult> {
    const started = Date.now();

    const timeoutMsRaw = process.env.PROVIDER_TIMEOUT_MS;
    const timeoutMsParsed = timeoutMsRaw ? Number.parseInt(timeoutMsRaw, 10) : NaN;
    const timeoutMs = Number.isFinite(timeoutMsParsed) && timeoutMsParsed > 0 ? timeoutMsParsed : 10_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          q: input.text,
          source: input.sourceLang,
          target: input.targetLang,
          format: "text",
        }),
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("LIBRETRANSLATE_TIMEOUT");
      }
      throw new Error("LIBRETRANSLATE_NETWORK_ERROR");
    } finally {
      clearTimeout(timeoutId);
    }

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      throw new Error(`LIBRETRANSLATE_HTTP_${res.status}`);
    }

    const data = (await res.json()) as LibreTranslateResponse;
    const translatedText = data.translatedText;

    if (!translatedText) {
      throw new Error("LIBRETRANSLATE_BAD_RESPONSE");
    }

    return {
      translatedText,
      detectedSourceLang: input.sourceLang === "auto" ? null : input.sourceLang,
      latencyMs,
      provider: "libretranslate",
    };
  }
}
