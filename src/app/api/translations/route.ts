import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      "id, created_at, source_lang, detected_source_lang, target_lang, chars_in, provider, latency_ms, status",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar histórico." }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}
