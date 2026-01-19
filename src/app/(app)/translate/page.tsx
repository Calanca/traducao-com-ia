"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TOP_LANGUAGES } from "@/lib/languages";

type TranslateResponse = {
  translatedText: string;
  detectedSourceLang?: string | null;
  meta: {
    charsIn: number;
    latencyMs: number | null;
    provider: string;
  };
};

export default function TranslatePage() {
  const [sourceLang, setSourceLang] = useState<string>("auto");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [text, setText] = useState<string>("");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxChars = 2000;

  useEffect(() => {
    setError(null);
  }, [text, sourceLang, targetLang]);

  async function onLogout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  async function onTranslate() {
    setError(null);
    setResult(null);

    if (!text.trim()) {
      setError("Digite um texto para traduzir.");
      return;
    }

    if (text.length > maxChars) {
      setError(`Limite atual: ${maxChars} caracteres.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang, targetLang }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Falha ao traduzir.");
        return;
      }

      setResult(data as TranslateResponse);
    } catch {
      setError("Falha de rede ao traduzir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <header className="mx-auto max-w-4xl flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tradutor (MVP)</h1>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/history">Histórico</Link>
          <button className="rounded-md border px-3 py-1" onClick={onLogout}>
            Sair
          </button>
        </nav>
      </header>

      <section className="mx-auto mt-6 max-w-4xl grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Origem</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
            >
              <option value="auto">Auto-detectar</option>
              {TOP_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Destino</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {TOP_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Texto</label>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 min-h-40"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole seu texto aqui..."
          />
          <div className="mt-1 flex justify-between text-xs text-gray-600">
            <span>
              {text.length}/{maxChars}
            </span>
            <span>Não salvamos conteúdo (apenas metadata).</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
            onClick={onTranslate}
            disabled={loading}
          >
            {loading ? "Traduzindo..." : "Traduzir"}
          </button>
          {result?.translatedText && (
            <button
              className="rounded-md border px-4 py-2"
              onClick={() => navigator.clipboard.writeText(result.translatedText)}
            >
              Copiar resultado
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {result && (
          <div className="rounded-md border p-4 bg-white">
            <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>Provider: {result.meta.provider}</span>
              <span>Chars: {result.meta.charsIn}</span>
              {result.detectedSourceLang && <span>Detectado: {result.detectedSourceLang}</span>}
              {result.meta.latencyMs != null && <span>Latência: {result.meta.latencyMs}ms</span>}
            </div>
            <pre className="mt-3 whitespace-pre-wrap text-sm">{result.translatedText}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
