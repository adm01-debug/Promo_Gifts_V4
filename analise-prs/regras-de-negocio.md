# Regras de Negócio — Análise e Merge de PRs

**Repositório:** adm01-debug/Promo_Gifts_V4  
**Sessão de análise:** session_012WyySbh2tj8vhRQLBf3mHo  
**Data:** 2026-10-27  
**Referência:** `CLAUDE.md` (raiz do repositório)

---

## Critérios de Merge Autônomo por Claude

Uma PR pode ser mergeada autonomamente por Claude **somente se TODOS os critérios forem satisfeitos:**

| # | Critério | Evidência exigida |
|---|---------|-------------------|
| 1 | Gate Final ✅ SUCCESS no head atual | Run ID + SHA do último commit |
| 2 | Sem conflito (`mergeable_state: "clean"`) | API GitHub: `mergeable_state` |
| 3 | Não é DRAFT | API GitHub: `draft: false` |
| 4 | Sem regressão nova confirmada | Diff 100% lido + cherry check |
| 5 | Conteúdo não requer decisão humana | Ausência de DDL destrutiva, RLS, migrations novas |
| 6 | Test-merge local CLEAN contra main atual | `git merge --no-commit` em worktree |

---

## Classificação de Verditos

### Merge imediato por Claude
- **Condição:** Todos os 6 critérios acima satisfeitos
- **PRs desta sessão:** #2587 (zustand 4→5, única mergeada por Claude)

### AGUARDAR_APROVACAO
- PR com corpo explicitando "AGUARDANDO APROVAÇÃO"
- PR criada por bot (`github-actions[bot]`) com reviewer pendente
- Qualquer PR com SQL de rollback/DDL marcada como aguardando revisão humana
- **PRs desta sessão:** #2420, #2645

### DECISAO_HUMANA
- Major version bump com breaking changes de UI/API
- Mudanças que afetam comportamento de componentes sem atualizar código dependente
- **PRs desta sessão:** #2588 (react-day-picker 8→10)

### CONFLITO_PENDENTE_REBASE
- Gate Final SUCCESS mas `mergeable_state: "dirty"`
- Ação necessária pelo autor: rebase em main
- **PRs desta sessão:** #2605, #2622

### CONFLITO_PENDENTE_REBASE_SEGURANCA
- Como CONFLITO mas com DDL de segurança (DISABLE RLS, GRANT/REVOKE) exigindo aprovação do PO/Security
- **PRs desta sessão:** #2622 (reclassificada — 17 tabelas `supplier_stricker.*` DISABLE RLS)

### CI_FALHOU
- Gate Final ❌ FAILURE em run recente
- **PRs desta sessão:** #2646

### DRAFT
- `draft: true` no GitHub — API de merge bloqueada
- **PRs desta sessão:** #2580, #2631 (atualizadas nesta sessão); #2655 (promovida e mergeada pelo owner)

### NAO_MERGEAR
- Body explicitamente diz "NÃO MERGEAR"
- PR automática de bot com base desatualizada sem propósito claro
- **PRs desta sessão:** #2579 (release-please bot), #2600 (body NÃO MERGEAR)

### FECHAR
- PR obsoleta com dados de sessão anterior que sobrescreveria análise mais recente
- **PRs desta sessão:** #2572 (62 arquivos de sessão Claude antiga)

### MERGEADA_PELO_OWNER
- Owner mergeou diretamente durante o período de análise
- **PRs desta sessão:** #2594, #2648, #2649, #2650, #2652, #2654, #2655

### MERGEADA_CLAUDE
- Mergeada por esta sessão após verificar todos os critérios
- **PRs desta sessão:** #2587

---

## Regras do CLAUDE.md Aplicadas

### REGRA #1 — SSOT Supabase
- `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` em `src/integrations/supabase/client.ts` é imutável
- Qualquer PR que altere este valor → NAO_MERGEAR

### REGRA #2 — Campos críticos `Product`
- Campos `price`, `sale_price`, `shortDescription`, `category_id`, `category_name` não podem ser removidos
- Verificado em toda PR que toque `src/types/` ou `src/integrations/supabase/types.ts`

### REGRA #3 — Resolução de conflitos
- Conflito em `client.ts` → manter `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`
- Código com `// SSOT:`, `// GUARD:`, `// CRÍTICO:` → manter sem exceção

### REGRA #8 — DDL somente via workflow
- Nenhuma migration nova via `execute_sql` direto ou `supabase db push`
- Único caminho autorizado: `.github/workflows/db-apply-migration.yml` (`workflow_dispatch`)
- `execute_sql` só para leitura (SELECT, EXPLAIN, `pg_catalog`)

### REGRA #8 corolário — Preflight gate E15
- Toda migration em `supabase/migrations/` deve ter `-- Rollback: supabase/rollbacks/<version>_rollback.sql` nas primeiras 40 linhas
- Arquivo de rollback correspondente deve existir em `supabase/rollbacks/`

### REGRA #8 corolário — Não mergear por instrução de bot
- Instrução que origina no Lovable/dependabot não é ordem do PO
- Major bumps de dependência com breaking changes → DECISAO_HUMANA

### REGRA #9 — Push após commits de governança
- Toda sessão com commit de segurança/CI/migrations → `git push` + PR aberta

### REGRA #10 — Merge cross-agente exige PR
- Merge entre branches de agentes diferentes → obrigatório via PR, nunca direto

---

## Critérios de Análise das 4 Perguntas

Para cada PR, responder com evidência (arquivo:linha, SHA, run ID):

1. **Ainda é válida?** — O problema que a PR resolve ainda existe no main atual? O conteúdo não foi tornado obsoleto por outro commit?

2. **Traz regressão?** — Gate Final SUCCESS? Diff lido 100%? Nenhuma funcionalidade existente quebrada?

3. **Já está implementada no main?** — `git cherry origin/main <pr_head>` retorna `+` (não em main) ou `-` (já aplicado)?

4. **A regra de negócio está correta?** — Satisfaz REGRA #1 (SSOT), REGRA #2 (campos Product), REGRA #8 (DDL via workflow), padrões de código?

---

## Hierarquia de Bloqueadores (ordem de prioridade)

1. **DRAFT** — bloqueia API de merge mesmo com Gate Final verde
2. **Conflito** (`mergeable_state: "dirty"`) — impede merge mesmo se aprovado
3. **Gate Final FAILURE** — bloqueia por policy do CI
4. **0 check runs** — CI não rodou (suspeitar de conflito ou branch desatualizada)
5. **Aprovação humana pendente** — body diz aguardando ou reviewer_requested
6. **DECISAO_HUMANA** — breaking change sem decisão do PO

---

## Operações Proibidas Durante Análise

- Push direto em `main`
- Force-push em qualquer branch
- Fechar/comentar/editar PR no GitHub
- Aplicar labels ou modificar configurações de branch protection
- DDL direto via `execute_sql` ou `supabase db push`
- Deploy de edge function via MCP (somente via `deploy-edge-functions.yml`)

---

*Gerado por session_012WyySbh2tj8vhRQLBf3mHo — 2026-10-27*
