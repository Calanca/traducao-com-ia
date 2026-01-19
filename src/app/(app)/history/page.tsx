"use client";

import { useState } from "react";
import Link from "next/link";

type TranslationRow = {
  id: string;
  created_at: string;
  source_lang: string;
  detected_source_lang: string | null;
  target_lang: string;
  chars_in: number;
  provider: string;
  latency_ms: number | null;
  status: string;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<TranslationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function onLogout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/translations");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Falha ao carregar histórico.");
        return;
      }
      setRows(data.items || []);
    } catch {
      setError("Falha de rede ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }

  async function onExportCsv() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/translations/export");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Falha ao exportar CSV.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "translations.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Falha de rede ao exportar CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <header className="mx-auto max-w-4xl flex items-center justify-between">
        <h1 className="text-lg font-semibold">Histórico (metadata)</h1>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/translate">Traduzir</Link>
          <button className="rounded-md border px-3 py-1" onClick={onLogout}>
            Sair
          </button>
        </nav>
      </header>

      <section className="mx-auto mt-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Carregar"}
          </button>

          <button
            className="rounded-md border px-4 py-2 disabled:opacity-60"
            onClick={onExportCsv}
            disabled={exporting}
          >
            {exporting ? "Exportando..." : "Exportar CSV"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        {rows && (
          <div className="mt-4 overflow-x-auto rounded-md border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Par</th>
                  <th className="p-2">Chars</th>
                  <th className="p-2">Latência</th>
                  <th className="p-2">Provider</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2 whitespace-nowrap">
                      {(r.detected_source_lang || r.source_lang) + "->" + r.target_lang}
                    </td>
                    <td className="p-2">{r.chars_in}</td>
                    <td className="p-2">{r.latency_ms ?? "-"}</td>
                    <td className="p-2">{r.provider}</td>
                    <td className="p-2">{r.status}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="p-2 text-gray-600" colSpan={6}>
                      Sem registros ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
