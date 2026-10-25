# Regras de Negócio — Análise de PRs (rev10, 2026-10-25)

Documento gerado/atualizado nesta sessão (`session_01Ss1tXZ4cAbxBvdmu95uNPz`) com base na leitura de 100% dos diffs das 13 PRs abertas.

---

## 1. docs

### Tratamento de PRs docs-only

PRs que modificam apenas arquivos de documentação (`.md`, `.txt`, arquivos em `docs/`, `analise-prs/`) têm tratamento diferenciado no CI:

- **`paths-ignore: docs/**`** em `deploy-gates.yml`: PRs que tocam APENAS arquivos dentro de `docs/` não disparam o Gate Final. Isso é um bypass intencional (E197).
- **Arquivos na raiz NÃO são bypassados**: `RELATORIO_CI.md`, `PENDENCIAS.md`, `CLAUDE.md` (raiz), e arquivos em `analise-prs/` estão na raiz ou em diretório não coberto por `docs/**` → Gate Final DISPARA.

### Regra observada: docs de outra sessão = FECHAR ou DECISAO_HUMANA

De todas as PRs docs analisadas:
- **PR #2452** (analise-prs/dossies/PR-2441.md — outra sessão): FECHAR (REGRA #10 + draft)
- **PR #2503** (RELATORIO_CI.md Rev21 — outra sessão): DECISAO_HUMANA (REGRA #10 + draft)
- **PR #2443** (APROVACAO_FASE_B_IMPACTO.md — outra sessão): DECISAO_HUMANA (draft + "APROVAÇÃO REQUERIDA")

Nenhuma PR docs-only pode ser mergeada autonomamente quando: (a) é draft, OU (b) vem de outra sessão (REGRA #10).

### Regra observada: RELATORIO_CI.md dispara Gate Final

`RELATORIO_CI.md` está na raiz do repo. `paths-ignore: docs/**` não o cobre. PRs que modificam apenas este arquivo triggeriam Gate Final completo — importante para avaliar se a PR "só-de-docs" é realmente sem impacto de CI.

---

## 2. testes

### Baseline desta sessão

- **429 testes unitários (vitest)**, 0 falhas — Gate 2 ✅
- Estabelecido em SHA `e0be76690381d15a4e7d0c2d728d05d8abb533c4` (Gate Final run #40174922055)
- Confirmado em SHA `dcaa20da` (Gate Final run #40179146830) via RELATORIO_CI.md Rev21 (lido nesta sessão)
- 8 merges autônomos desta sessão (PRs #2479–#2505) não quebraram a baseline

### Regra: testes de contrato não são snapshots visuais

`tests/contracts/webhook-schemas.ts` aparece em PRs #2417 e #2419 (adiciona `MagazineReaderStateReadSchemaV1`). Contratos de schema de webhook são testes funcionais que verificam formato de payload — não devem ser atualizados sem verificar o contrato correspondente no serviço.

### Regra: `check-file-size-baseline.test.mjs` não roda via Vitest

PR #2415 documenta incompatibilidade de `node:test` com jsdom do Vitest. O arquivo usa `import { test } from 'node:test'` e deve ser excluído do Vitest via `exclude` e rodar via `node --test` separadamente. Isso está em `vitest.config.ts` (conflitante em PR #2415).

---

## 3. enums

### Nenhuma PR aberta modifica enums TypeScript diretamente

Nenhuma das 13 PRs abertas modifica `src/integrations/supabase/types.ts` nem arquivos de enums em `src/types/`. A Gate 1.2 (drift estrutural de types.ts) não está em risco pelas PRs abertas.

### Regra: enums de DB via types.ts regenerado devem passar Gate 1.2

Qualquer regeneração de `types.ts` deve usar `npm run check:types-inventory-drift` para verificar que nenhuma tabela/view/function/enum sumiu (REGRA #4). O baseline estrutural está em `scripts/extract-types-inventory.mjs`.

---

## 4. migrations

### PRs com migrations abertas

| PR | Migrations | Estado | Veredicto |
|---|---|---|---|
| #2420 | `supabase/migrations/20261019000000_mirror_oob_*` + rollback | Orphan + draft + Rule 8 | FECHAR |
| #2449 | `20261022195616_fix_update_company_fields_security_definer_search_path.sql` + `20261022203935_update_company_fields_security_fix.sql` | Conflict + draft + Rule 8 | DECISAO_HUMANA |

### Regra: migrations = Rule 8 §2.2 invariável

Qualquer arquivo em `supabase/migrations/` ou `supabase/rollbacks/` ativa Rule 8 §2.2 automaticamente. Nenhuma PR com migration pode ser mergeada autonomamente — independente de ser migration nova, espelho, rollback ou apenas adição de comentário.

### Regra: único caminho autorizado para migration em produção

O caminho é `workflow_dispatch` em `.github/workflows/db-apply-migration.yml` (REGRA #8 corolário E15). MCP `execute_sql` com DDL é proibido em sessão de agente (E056). PRs com migrations abertas devem ter aprovação explícita do PO.

### Regra: reconciliação E99

DDL aplicada fora do fluxo (via MCP/dashboard) deve ser reconciliada via migration espelho + `migration repair --status applied <version>` (com versão explícita) + PR com recibo em `MIGRATIONS_SYNC_LOG.md`. PR #2449 segue este padrão corretamente — bloqueada apenas por Rule 8 + draft + REGRA #10.

---

## 5. policies

### Nenhuma PR aberta modifica policies RLS diretamente

Nenhuma das 13 PRs abertas inclui arquivos com `CREATE POLICY` ou `ALTER POLICY`. 

### PR #2443 referencia policies indiretamente

A análise de impacto em `APROVACAO_FASE_B_IMPACTO.md` (PR #2443) documenta:
- **P14** — 590 policies com `auth.uid()` sem `(SELECT auth.uid())` → performance
- **P15** — 56 tabelas com policies para `anon`; `color_synonym_map` com `qual = 'true'` (acesso total)
- **P03_security_definer** — 45 funções SECURITY DEFINER com `pg_temp` em `search_path`

Essas são propostas que exigem aprovação explícita (PR #2443 é "APROVAÇÃO REQUERIDA"). Nenhuma migration DDL de policy está em execução pendente nas PRs abertas.

### Regra: Gate 1.13 cobre baseline de policies

Gate 1.13 (RLS policies baseline vs pg_policies live) e Gate 1.13.1 (tabelas com RLS e zero policies) são checks automáticos. Qualquer PR que adicione migration com `CREATE POLICY` deve estar coberta por esses gates.

---

## 6. UI

### ProductFormFullscreen.tsx aparece em 4 PRs orphan

`src/components/product/ProductFormFullscreen.tsx` está modificado em PRs #2418, #2419, #2420 e #2422 — todas branches orphan (NO_MERGE_BASE), todas draft, todas de outra sessão. A mudança é uniforme: adiciona `type Resolver` import e cast `as unknown as Resolver<ProductFormData>` / `as ProductFormData`.

**Regra observada:** mudanças de UI em branches orphan são irrecuperáveis via merge normal. Se a mudança for necessária, o PO deve cherry-pick manual em nova branch a partir de `main`.

### Regra: Gate 1.9 controla `as any` e `as unknown`

`.as-assertions-baseline.json` e `.as-unknown-baseline.json` rastreiam counts de asserções TypeScript não seguras. PR #2419 atualiza esses baselines (+2 asserções em ProductFormFullscreen.tsx). Gate 1.9 (ratchet) bloqueia se o count aumentar sem justificativa em label `ratchet-override`. O baseline atual em `main` reflete o estado antes das mudanças de #2418/#2419/#2420/#2422.

### Regra: changes do Lovable podem reverter UI

O bot Lovable (`gpt-engineer-app[bot]`) pode sobrescrever silenciosamente arquivos de UI como `ProductFormFullscreen.tsx`. Se esse arquivo conflitar em merge futuro, verificar se a guarda SSOT em `client.ts` permanece (REGRA #1) e se os campos críticos do tipo `Product` estão presentes (REGRA #2).

### Estado atual de UI em produção

Nenhuma das PRs abertas com mudanças de UI pode ser mergeada (todas orphan/draft/REGRA #10). O estado de UI em `main` é o da última merge autônoma desta sessão (PR #2505, SHA `b058d97d`).

---

## Resumo Executivo

| Seção | PRs Impactadas | Regra Principal |
|---|---|---|
| docs | #2443, #2452, #2503 | REGRA #10 + draft → DECISAO_HUMANA ou FECHAR |
| testes | Baseline 429/0 mantida | Gate 2 baseline preservada por 8 merges autônomos |
| enums | Nenhuma | Gate 1.2 não em risco |
| migrations | #2420, #2449 | Rule 8 §2.2 invariável; E15 único caminho prod |
| policies | #2443 (proposta apenas) | Gate 1.13 cobre; nenhuma DDL pendente |
| UI | #2418, #2419, #2420, #2422 | Orphan + draft; irreomerável via merge; cherry-pick manual se necessário |
