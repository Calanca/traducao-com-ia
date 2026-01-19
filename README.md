# traducao-com-ia (MVP)

MVP de plataforma de tradução com:
- Login obrigatório (Supabase Auth)
- Tradução de texto (LibreTranslate como provider inicial)
- Privacidade: **não salvamos texto original nem traduzido**; salvamos somente metadata
- Limite atual: **2000 caracteres** por request
- Idiomas: top 10 (fixo no MVP)

## 1) Configurar variáveis de ambiente

Edite `.env.local` (existe um template em `.env.example`) e preencha:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TEXT_HASH_SALT` (string longa e secreta)
- `LIBRETRANSLATE_URL` (ex.: `http://localhost:5000`)

Opcional (recomendado):
- `PROVIDER_TIMEOUT_MS` (default: 10000)
- `RATE_LIMIT_REQUESTS` e `RATE_LIMIT_WINDOW_MS` (default: 20 req / 60s)

Extra (best-effort):
- `RATE_LIMIT_IP_REQUESTS` e `RATE_LIMIT_IP_WINDOW_MS` (default: 60 req / 60s)

Cache em memória (não persiste texto no banco):
- `TRANSLATION_CACHE_TTL_MS` (default: 300000)
- `TRANSLATION_CACHE_MAX_ENTRIES` (default: 500)

## 2) Configurar Supabase (DB + RLS)

No Supabase (SQL Editor), rode o script:
- `supabase/schema.sql`

Ele cria a tabela `translations` (metadata-only) e habilita RLS para cada usuário ver/insirir apenas seus registros.

Se você já rodou uma versão anterior do script, rode novamente após alterações (o script é independente).

## 3) Subir LibreTranslate (local)

Opção simples via Docker:

```bash
docker run --rm -p 5000:5000 libretranslate/libretranslate
```

Depois, garanta que `LIBRETRANSLATE_URL=http://localhost:5000`.

## 4) Rodar o projeto

```bash
npm run dev
```

- Acesse `http://localhost:3000`
- Faça login em `/login`
- Traduza em `/translate`
- Veja metadata em `/history`

## Troubleshooting

- `POST /api/translate 401 Unauthorized`
	- Você não está logado (ou cookies não foram setados). Faça login em `/login` e tente novamente.

- `POST /api/translate 502` com `errorCode` relacionado a LibreTranslate
	- O LibreTranslate não está online/atingível em `LIBRETRANSLATE_URL`.
	- Teste: `http://localhost:5000/languages`
	- Suba o container novamente (ou confira a porta/host).

- `POST /api/translate 429`
	- Rate limit atingido (por usuário e/ou por IP). Aguarde alguns segundos e tente novamente.

- Exportar metadata (CSV)
	- Acesse `/history` e use o botão "Exportar CSV" (somente metadata; não inclui texto original/traduzido).

## Observações

- O backend gera `text_hash = sha256(TEXT_HASH_SALT + text)` para telemetria/deduplicação sem armazenar conteúdo.
- Não logamos payload de tradução (texto original/traduzido).

## Rate limit (MVP)

O rate limit atual é **in-memory** (por instância). Em produção com múltiplas instâncias/serveless, substitua por Redis (ex.: Upstash) para consistência.

## Cache (MVP)

O cache atual é **in-memory** (por instância) e serve para evitar chamadas repetidas ao provider na mesma combinação (user + text_hash + source + target).
Em produção com múltiplas instâncias/serveless, substitua por Redis (com TTL) se quiser cache consistente.
