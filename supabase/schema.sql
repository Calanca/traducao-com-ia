
create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  source_lang text not null,
  detected_source_lang text null,
  target_lang text not null,

  chars_in int not null,
  provider text not null,
  latency_ms int null,

  status text not null check (status in ('success', 'error')),
  error_code text null,

  text_hash text not null
);
-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

create index if not exists translations_user_created_idx
  on public.translations (user_id, created_at desc);

alter table public.translations enable row level security;

drop policy if exists "translations_select_own" on public.translations;
create policy "translations_select_own"
  on public.translations
  for select
  using (auth.uid() = user_id);

drop policy if exists "translations_insert_own" on public.translations;
create policy "translations_insert_own"
  on public.translations
  for insert
  with check (auth.uid() = user_id);

alter table public.translations
  add constraint translations_chars_in_positive check (chars_in > 0);
