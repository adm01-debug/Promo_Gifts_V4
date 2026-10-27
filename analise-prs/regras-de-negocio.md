# REGRAS DE NEGÓCIO — promo-gifts-v4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**Fontes:** CLAUDE.md, src/types/, supabase/migrations/, .github/workflows/deploy-gates.yml, PromoFlixPlayer.test.tsx, NegotiationMarkupCard tests

---

## REGRA #1 — SSOT Supabase (IMUTÁVEL)
- **Projeto canônico de produção:** `doufsxqlfjyuvxuezpln` (Gold/Medallion)
- **Proibido:** alterar `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts`
- **Proibido:** tratar como dead code qualquer guarda que rejeite `pqpdolkaeqlyzpdpbizo`
- **Fonte:** CLAUDE.md §REGRA#1; Gate 0 em deploy-gates.yml; `scripts/validate-supabase-config.mjs`

## REGRA #2 — Campos críticos do tipo `Product`
O tipo `Product` em `src/types/product-catalog.ts` DEVE conter:
- `price: number` — preço original
- `sale_price?: number` — preço de venda
- `shortDescription: string`
- `category_id?: string`
- `category_name?: string`
- **Fonte:** CLAUDE.md §REGRA#2; Gate 1.1 em deploy-gates.yml; incidente commit `f22e1e2` (2026-06-11)

## REGRA #3 — Resolução de conflitos (semântica, não heurística)
- Código com `// SSOT:`, `// GUARD:`, `// CRÍTICO:`, `// DO NOT REMOVE` é IMUTÁVEL
- Formato de commit para resolução: `merge(pr-NNN): resolve conflitos — [lista]`
- **Fonte:** CLAUDE.md §REGRA#3

## REGRA #4 — Schema Supabase (types.ts)
- Tabelas obrigatórias: `personalization_techniques`, `products`, `product_variants`, `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates`
- Gate 1.2 verifica drift estrutural via TypeScript Compiler API (não contagem de linhas)
- **Fonte:** CLAUDE.md §REGRA#4; scripts/extract-types-inventory.mjs; incidente `7716ae9` (2026-07-16)

## REGRA #5 — CI e Testes
- Snapshots quebrados em massa (>3 de uma vez) → parar, investigar Lovable, não corrigir snapshots
- `continue-on-error: true` proibido em Gates de qualidade (Gate 0–6)
- **Fonte:** CLAUDE.md §REGRA#5

## REGRA #6 — Padrão de commit
Formato: `tipo(escopo): descrição concisa\n\n[corpo]\n\nhttps://claude.ai/code/session_XXXXX`
Tipos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`, `build`

## REGRA #7 — Lovable (bot)
O Lovable pode: reverter `client.ts`, renomear campos de API, sobrescrever guardas de segurança
Após commits "Changes" do Lovable: verificar `validate-supabase-config.mjs` + campos Product type
**Fonte:** CLAUDE.md §REGRA#7

## REGRA #8 — Lovable emite código, não ordens
- Migration, DDL, deploy de edge function exigem aprovação explícita do PO — não do bot
- `execute_sql` com DDL proibido em sessão de agente
- Único caminho para migration em prod: `.github/workflows/db-apply-migration.yml`
- **Fonte:** CLAUDE.md §REGRA#8; E056

## REGRA #9 — Push ao terminar sessão de governança
**Fonte:** CLAUDE.md §REGRA#9; incidente 2026-09-17 (29 commits locais)

## REGRA #10 — Merge cross-agente exige PR
- 6 agentes: Claude, Codex, Devin, Lovable, github-actions, cline
- `sentinel-check.sh` recusa merge entre branches de prefixos diferentes
- **Fonte:** CLAUDE.md §REGRA#10; E189

## REGRA #11 — Vercel CLI proibido fora do raiz
- Proibido: `vercel link`, `vercel pull` fora do diretório raiz
- `.vercel/project.json` contém `"projectId": "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"` — âncora
- **Fonte:** CLAUDE.md §REGRA#11; incidente 2026-09-15

---

## CI GATES OBRIGATÓRIOS (Gate Final — deploy-gates.yml)

| Gate | Descrição | Tipo |
|---|---|---|
| Gate 0 | SSOT — ID canônico `doufsxqlfjyuvxuezpln` | job |
| Gate 0.5 | npm audit --audit-level high | job |
| Gate 0.6 | Dependency Review (PR-only) | job |
| Gate 1 | Lint ESLint + TypeScript sem erros | job |
| Gate 1.1 | Campos críticos do tipo Product | step |
| Gate 1.2 | Drift estrutural types.ts | step |
| Gate 1.3 | Contratos de migration (preflight E15) | step |
| Gate 2 | Vitest unitários | job |
| Gate 2.5 | Integridade transacional PostgreSQL | job |
| Gate 3 | E2E Smoke (Playwright, chromium) | job |
| Gate 5 | SEO sanity check | job |
| Gate 5.5 | RPC restore_seller_cart presente | job |
| Gate 6 | Build Vite sem erro + SBOM | job |
| Gate Final | Deploy Gates aggregator | job |

---

## CONTRATOS DE COMPONENTES (extraídos dos testes)

### PromoFlixPlayer.tsx — src/components/products/gallery/PromoFlixPlayer.tsx
Fonte: `PromoFlixPlayer.test.tsx` (22 testes PASSED no baseline)
Contratos verificados:
- Sem atributo `crossOrigin` no elemento video (Cloudflare Stream CORS compatibility) — test linha ~155
- Limpa `src` e chama `load()` no unmount (previne erros residuais) — test linha ~168
- Reset do estado de erro ao trocar `src` — test linha ~181
- Tenta muted autoplay fallback se `play()` falhar com som — test linha ~194
- NÃO persiste mute forçado por autoplay como preferência do usuário — test linha ~220
- Persiste mute/unmute explícito do usuário após mute forçado por autoplay — test linha ~233
- Protege contra race conditions via `initTokenRef` em mudanças rápidas de src — test linha ~207
- `suppressMutePersistRef` NÃO deve ser limpo no branch de supressão (fix #2616) — PromoFlixPlayer.tsx:655
- Botão "Manual Load" presente e reinicializa player ao clicar — test linha ~129
- Atualiza estado de qualidade durante múltiplas mudanças de nível — test linha ~142

### NegotiationMarkupCard — src/components/quotes/
Fonte: 3 arquivos de teste (23 testes PASSED no baseline)
Contratos verificados:
- Header sem texto descritivo "Ative para inflar..." — singleline.test:10
- Título, badge e switch como irmãos diretos (uma linha) — singleline.test:20
- Slider focável com ArrowRight/ArrowLeft/Home/End atualizando aria-valuenow — visualA11y.test:60
- Label do slider e aria-live do % para acessibilidade — visualA11y.test:73
- Escala responsiva px-3/py-2.5 (mobile) → sm:px-2.5/sm:py-2 (desktop) — visualA11y.test:35

### chunk-recovery — src/lib/__tests__/
Fonte: `chunk-recovery.shared-reload-budget.test.ts` (8 testes PASSED)
Contratos verificados:
- 2 bumps dentro da janela: incrementa preservando `__bart`
- Teto atingido (`__bare=2`): recusa e NÃO muta a URL
- Janela expirada (>20s): reseta para 1 com `__bart` novo
- `readSharedReloadBudget` não muta a URL (só leitura)
- Orçamento compartilhado já esgotado mas fora da janela: não bloqueia

---

## FALHAS PRÉ-EXISTENTES NO MAIN (não bloqueantes)

| Workflow/Job | Status | Observação |
|---|---|---|
| color-swatch | FAILURE | Visual baseline — não é Gate Final |
| magazine-header | FAILURE | Visual baseline — não é Gate Final |
| e2e-gates | FAILURE | E2E adicional — não é Gate Final |
| chromium•swatch→QV | FAILURE | E2E Swatch QuickView — não é Gate Final |
| Full User Flows authed | FAILURE | E2E fluxos completos — não é Gate Final |
| webkit•swatch→QV | FAILURE | E2E webkit — não é Gate Final |
| check | FAILURE | Check adicional — não é Gate Final |

**Testes por nome:** NÃO COLETADOS para as 7 falhas acima (são E2E visuais, não unit tests).
**Gate Final:** SUCCESS confirmado em todos os merges desta sessão.

---

## REGRAS DE MIGRAÇÃO
- Migration aditiva e não destrutiva: sem DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa
- Deve ser idempotente
- Único caminho: `.github/workflows/db-apply-migration.yml` (`workflow_dispatch`)
- Fonte: CLAUDE.md §REGRA#8 corolário E15

## REGRAS DE EDGE FUNCTION
- Deploy somente via `.github/workflows/deploy-edge-functions.yml`
- Fonte: CLAUDE.md §REGRA#8 corolário

## REGRAS DE RLS/PERMISSÕES
- Gate 1.13: RLS policies baseline vs pg_policies live
- Gate 1.13.1: Tabelas com RLS habilitada e zero policies → deny-all silencioso
- Gate 1.13.2: 7 tabelas com INSERT anônimo têm trigger de rate guard
- Auditoria de schema somente via `pg_catalog`, nunca PostgREST/OpenAPI
- Fonte: CLAUDE.md §REGRA#8 corolário; Gate 1.13.x
