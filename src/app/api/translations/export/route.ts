import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Quote every cell for simplicity.
  return `"${str.replaceAll("\"", '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c])).join(","));
  return [header, ...lines].join("\n") + "\n";
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("translations")
    .select(
      "id, created_at, source_lang, detected_source_lang, target_lang, chars_in, provider, latency_ms, status, error_code, text_hash",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: "Falha ao exportar histórico." }, { status: 500 });
  }

  const items = data || [];
  const columns = [
    "id",
    "created_at",
    "source_lang",
    "detected_source_lang",
    "target_lang",
    "chars_in",
    "provider",
    "latency_ms",
    "status",
    "error_code",
    "text_hash",
  ];

  const csv = toCsv(items as Array<Record<string, unknown>>, columns);

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=translations-${y}${m}${d}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
