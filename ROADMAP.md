# Roadmap (MVP  v1)

## Pré-requisitos do MVP (feito)
- Login obrigatório (Supabase Auth)
- Tradução de texto (LibreTranslate)
- Limite: 2000 caracteres por request (server-side)
- Idiomas: Top 10 fixos
- Privacidade: não persistir texto original/traduzido; salvar apenas metadata
- Hash com salt do servidor (SHA-256) e não logar payload

## Etapa 1  Hardening (feito)
- Rate limit por usuário (MVP, in-memory)
- Rate limit por IP (best-effort via headers)
- Timeout de provider e mensagens de erro melhores (sem payload)
- Telemetria (metadata): provider, latency_ms, status, error_code, text_hash

## Etapa 2  Plano de custo/escala (em andamento)
- Cache/dedupe (janela curta) por (user + text_hash + source/target) (MVP, in-memory)
- Exportar metadata (CSV) para auditoria
- Próximos passos para produção:
  - Migrar rate limit e cache para Redis/Upstash (multi-instância)
  - Dashboard/relatórios (métricas agregadas por dia/idioma/provider)
  - Logs estruturados sem payload + alertas (ex.: Sentry)

## Etapa 3  Tradução de documentos (fase 1) (12 semanas)
- Upload de arquivo (começar com TXT e DOCX)
- Storage: Supabase Storage ou Cloudflare R2
- Tabelas:
  - documents (metadata do arquivo)
  - document_jobs (status/fila)
- Fila/worker: BullMQ + Redis (Upstash) OU worker simples no início
- Status: enfileirado/processando/pronto/erro

## Etapa 4  Deploy e produção (contínuo)
- Vercel: env vars e preview deployments
- Supabase: RLS, backups e limites
- Observabilidade: Sentry (erros) + logs sem payload
- Planos: limites por usuário/dia e futura integração com Stripe
