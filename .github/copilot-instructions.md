# Copilot instructions (workspace)

- Stack: Next.js (App Router) + TypeScript + Tailwind.
- MVP: login obrigatório; tradução de texto; salvar somente metadata (NÃO persistir texto original/traduzido).
- Limite: 2000 caracteres por request.
- Idiomas: top 10 fixos no MVP.
- Segurança: gerar hash SHA-256 do texto com salt do servidor; nunca logar payload de tradução.

Convensões:
- Preferir código simples e incremental.
- Evitar dependências desnecessárias.
- Sempre validar auth no server (não confiar só no client).
