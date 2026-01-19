"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/translate";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, redirectTo: redirect }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setMessage(data?.error || "Falha ao criar conta.");
          return;
        }
        setMessage("Conta criada. Verifique seu email para confirmar o cadastro.");
      } else {
        const res = await fetch("/api/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setMessage(data?.error || "Falha ao autenticar.");
          return;
        }
        window.location.href = redirect;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao autenticar.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="text-sm text-gray-600 mt-1">Login obrigatório para usar o tradutor.</p>

        <div className="mt-4 flex gap-2">
          <button
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "signin" ? "bg-gray-900 text-white" : "bg-white"}`}
            onClick={() => setMode("signin")}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${mode === "signup" ? "bg-gray-900 text-white" : "bg-white"}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Senha</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            className="w-full rounded-md bg-gray-900 px-3 py-2 text-white disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>

          {message && <p className="text-sm text-gray-700">{message}</p>}
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <LoginInner />
    </Suspense>
  );
}
