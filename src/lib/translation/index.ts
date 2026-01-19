import { TranslationProvider } from "./types";
import { LibreTranslateProvider } from "./providers/libretranslate";

export function getTranslationProvider(): TranslationProvider {
  const provider = process.env.TRANSLATION_PROVIDER || "libretranslate";

  if (provider === "libretranslate") {
    return new LibreTranslateProvider({
      baseUrl: process.env.LIBRETRANSLATE_URL || "http://localhost:5000",
    });
  }

  throw new Error(`Unsupported TRANSLATION_PROVIDER: ${provider}`);
}
