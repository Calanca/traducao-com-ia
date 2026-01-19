import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupportedLanguage } from "@/lib/languages";
import { getMaxTranslationChars } from "@/lib/config";
import { sha256Hex } from "@/lib/crypto";
import { getTranslationProvider } from "@/lib/translation";
import { rateLimit } from "@/lib/rate-limit";
import { getCachedTranslation, setCachedTranslation } from "@/lib/translation-cache";

const schema = z.object({
  text: z.string().min(1),
  sourceLang: z.string().optional().default("auto"),
  targetLang: z.string(),
});

function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return null;
}

function getIpRateLimit() {
  const rawMax = process.env.RATE_LIMIT_IP_REQUESTS;
  const maxParsed = rawMax ? Number.parseInt(rawMax, 10) : NaN;
  const maxRequests = Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : 60;

  const rawWindow = process.env.RATE_LIMIT_IP_WINDOW_MS;
  const windowParsed = rawWindow ? Number.parseInt(rawWindow, 10) : NaN;
  const windowMs = Number.isFinite(windowParsed) && windowParsed > 0 ? windowParsed : 60_000;

  return { maxRequests, windowMs };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit early (avoid reading body when limited)
  const rlUser = rateLimit(`translate:${user.id}`);

  const ip = getClientIp(request.headers);
  const rlIp = ip ? rateLimit(`translate-ip:${ip}`, getIpRateLimit()) : null;

  if (!rlUser.ok || (rlIp && !rlIp.ok)) {
    const res = NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429 },
    );

    res.headers.set("X-RateLimit-Remaining", rlUser.remaining.toString());
    res.headers.set("X-RateLimit-Reset", Math.ceil(rlUser.resetAt / 1000).toString());
    if (rlIp) {
      res.headers.set("X-RateLimit-IP-Remaining", rlIp.remaining.toString());
      res.headers.set("X-RateLimit-IP-Reset", Math.ceil(rlIp.resetAt / 1000).toString());
    }
    return res;
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { text, sourceLang, targetLang } = parsed.data;

  const maxChars = getMaxTranslationChars();
  if (text.length > maxChars) {
    return NextResponse.json(
      { error: `Limite atual: ${maxChars} caracteres.` },
      { status: 413 },
    );
  }

  if (sourceLang !== "auto" && !isSupportedLanguage(sourceLang)) {
    return NextResponse.json({ error: "Idioma de origem inválido." }, { status: 400 });
  }

  if (!isSupportedLanguage(targetLang)) {
    return NextResponse.json({ error: "Idioma de destino inválido." }, { status: 400 });
  }

  const salt = process.env.TEXT_HASH_SALT;
  if (!salt) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const provider = getTranslationProvider();

  const charsIn = text.length;
  const textHash = sha256Hex(salt + text);

  // Cache (memory only; never persist text). Keyed per-user to avoid cross-user leakage.
  const cacheKey = `t:${user.id}:${sourceLang}:${targetLang}:${textHash}`;
  const cached = getCachedTranslation(cacheKey);
  if (cached) {
    await supabase.from("translations").insert({
      user_id: user.id,
      source_lang: sourceLang,
      detected_source_lang: cached.detectedSourceLang ?? null,
      target_lang: targetLang,
      chars_in: charsIn,
      provider: "cache",
      latency_ms: 0,
      status: "success",
      error_code: null,
      text_hash: textHash,
    });

    const response = NextResponse.json({
      translatedText: cached.translatedText,
      detectedSourceLang: cached.detectedSourceLang ?? null,
      meta: {
        charsIn,
        latencyMs: 0,
        provider: cached.provider,
        cached: true,
      },
    });

    response.headers.set("X-RateLimit-Remaining", rlUser.remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(rlUser.resetAt / 1000).toString());
    if (rlIp) {
      response.headers.set("X-RateLimit-IP-Remaining", rlIp.remaining.toString());
      response.headers.set("X-RateLimit-IP-Reset", Math.ceil(rlIp.resetAt / 1000).toString());
    }
    return response;
  }

  try {
    const result = await provider.translate({
      text,
      sourceLang,
      targetLang,
    });

    setCachedTranslation(cacheKey, {
      translatedText: result.translatedText,
      detectedSourceLang: result.detectedSourceLang ?? null,
      provider: result.provider,
    });

    // Save only metadata (never persist text).
    await supabase
      .from("translations")
      .insert({
        user_id: user.id,
        source_lang: sourceLang,
        detected_source_lang: result.detectedSourceLang ?? null,
        target_lang: targetLang,
        chars_in: charsIn,
        provider: result.provider,
        latency_ms: result.latencyMs,
        status: "success",
        error_code: null,
        text_hash: textHash,
      });

    const response = NextResponse.json({
      translatedText: result.translatedText,
      detectedSourceLang: result.detectedSourceLang ?? null,
      meta: {
        charsIn,
        latencyMs: result.latencyMs,
        provider: result.provider,
        cached: false,
      },
    });

    response.headers.set("X-RateLimit-Remaining", rlUser.remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(rlUser.resetAt / 1000).toString());
    if (rlIp) {
      response.headers.set("X-RateLimit-IP-Remaining", rlIp.remaining.toString());
      response.headers.set("X-RateLimit-IP-Reset", Math.ceil(rlIp.resetAt / 1000).toString());
    }
    return response;
  } catch (err: unknown) {
    const errorCode = err instanceof Error ? err.message : "TRANSLATION_ERROR";

    await supabase
      .from("translations")
      .insert({
        user_id: user.id,
        source_lang: sourceLang,
        detected_source_lang: null,
        target_lang: targetLang,
        chars_in: charsIn,
        provider: process.env.TRANSLATION_PROVIDER || "libretranslate",
        latency_ms: null,
        status: "error",
        error_code: errorCode,
        text_hash: textHash,
      });

    const response = NextResponse.json(
      {
        error: "Falha ao traduzir. Verifique se o provider está online.",
        errorCode,
      },
      { status: 502 },
    );

    response.headers.set("X-RateLimit-Remaining", rlUser.remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(rlUser.resetAt / 1000).toString());
    if (rlIp) {
      response.headers.set("X-RateLimit-IP-Remaining", rlIp.remaining.toString());
      response.headers.set("X-RateLimit-IP-Reset", Math.ceil(rlIp.resetAt / 1000).toString());
    }
    return response;
  }
}



