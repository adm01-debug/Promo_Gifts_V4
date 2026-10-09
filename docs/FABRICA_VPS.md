# 🏭 Fábrica de Correções (VPS Hostinger)

Documento de referência da fábrica de correções que atua no **Promo_Gifts_V4** a partir da VPS
Hostinger. Explica como o trabalho entra, como é provado e como chega (ou não) na `main`.

---

## 1. O que é a fábrica

A fábrica é um conjunto de **agentes Hermes** que corrigem **cartões pequenos** deste repositório.
Cada cartão é uma tarefa no kanban interno (uma worktree isolada, uma branch própria).

Fluxo resumido:

1. O cartão descreve **um defeito ou uma entrega mínima** (documentação, ajuste pontual).
2. Um agente trabalha **somente na worktree do cartão** e comita lá.
3. O agente **nunca faz push, merge ou deploy** — isso é do integrador.
4. O merge na `main` é **sempre humano, via Pull Request**. Nenhum agente aprova o próprio trabalho.

## 2. Convenção de branch

Formato: `v2/<slug-da-tarefa>-<timestamp>`

- `v2/` — prefixo obrigatório de toda entrega da fábrica.
- `<slug-da-tarefa>` — título do cartão em minúsculas, sem acentos, com hífens.
- `<timestamp>` — carimbo numérico no momento da criação (evita colisão entre cartões).

Exemplo: `v2/docs-criar-docs-fabrica-vps-md-descreven-2610081245`.

## 3. O portão automático

Toda entrega passa por um verificador **sem IA** (`gate.py`) que roda sobre o diff contra
`origin/main` e **reprova na hora**:

- **Provas obrigatórias:** `npm run typecheck` verde e `npx vitest related --run <arquivos>` verde.
- **Mudança mínima:** no máximo **12 arquivos** e **400 linhas** alteradas por cartão.
- **Caminhos proibidos** (intocáveis pela fábrica):
  - `src/integrations/supabase/client.ts` (guardas de SSOT — REGRA #1).
  - `src/integrations/supabase/types.ts` (arquivo gerado).
  - `supabase/migrations/` e `supabase/config.toml` (schema é do Joaquim).
  - `.github/workflows/`, `.env*`, `.husky/`, `package.json`/lockfiles e baselines/ratchets.
- **Guardas imutáveis:** nunca remover linhas `SSOT` / `GUARD` / `CRÍTICO` / `DO NOT REMOVE`.
- **Proibido** referenciar o projeto Supabase antigo (REGRA #1 — usar apenas o canônico).
- **Nunca afrouxar teste:** marcadores de skip/only/todo, supressões de tipo e casts amplos reprovam.
- **Sem segredos** no diff (chave, token, senha).

## 4. Padrão de commit

```
tipo(escopo): descrição
```

Tipos aceitos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`, `build`.
Mensagem sempre no imperativo/descritiva, em pt-BR, referenciando o que mudou.

Exemplos: `docs(fabrica): descrever fábrica de correções da VPS`.

---

Dúvidas sobre as regras do repo: ver `CLAUDE.md` e `AGENTS.md` (fontes técnicas).
