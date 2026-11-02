# CLAUDE.md — Promo Gifts V4 (ficha técnica do repositório)

> **Só conteúdo técnico e estado real do projeto**: qual banco, como o schema muda, o que o CI cobra,
> o que a Vercel serve, como o Lovable se comporta e quais arquivos são guardas.
> Como trabalhar (comunicação, PR, merge) fica em `AGENTS.md`, importado abaixo — aqui, não.
> Se algo aqui divergir da realidade, corrija ESTE arquivo no mesmo PR do fix.
> Os títulos `REGRA #N` foram mantidos porque scripts, workflows, hooks e testes citam esses números.

@AGENTS.md

---

## Projeto

- **Repo:** `adm01-debug/Promo_Gifts_V4` — Promo Brindes, catálogo B2B de brindes corporativos.
- **Stack:** React + TypeScript + Vite + Supabase (PG17). Dados em camadas Medallion Bronze → Silver → Gold.
- **Lovable** (`gpt-engineer-app[bot]`) commita direto em `main` (ver REGRA #7).
- **CI:** GitHub Actions com quality gates numerados; o único check required em `main` é
  "Gate Final - Deploy Ready" (ver seção CI).
- **Vercel:** projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`), ancorado em `.vercel/project.json`
  (ver REGRA #11).

- **Estado real gerado (fonte de consulta):** `inventario/estado/` — banco (tabelas, RLS, cron, edges publicadas),
  edge functions do repo, rotas → tela → hooks → dados e tabelas órfãs. Refazer:
  `SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs && node scripts/inventario/gerar-repo.mjs`.

### Projetos Supabase e MCPs (conferido 2026-11-02 com `get_project_url`)

| MCP | Projeto | Papel |
|---|---|---|
| `SUPABASE - GESTÃO DE PRODUTOS` | `doufsxqlfjyuvxuezpln` | **Banco deste app** (produção, SSOT) |
| `SUPABASE - GESTÃO DE CLIENTES` | `pgxfvjmuubtbowutlide` | Banco externo do CRM — o app só o acessa pela edge function `crm-db-bridge` (`src/lib/crm-db.ts`) |

---

## REGRA #1 — Banco oficial (SSOT do Supabase)

- Projeto de produção: **`doufsxqlfjyuvxuezpln`**. Projeto proibido: `pqpdolkaeqlyzpdpbizo`.
- `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` em `src/integrations/supabase/client.ts` é verificado pelo
  Gate 0 (`node scripts/validate-supabase-config.mjs`). Se o Gate 0 falhar, o deploy é bloqueado.
- As funções que validam o ID canônico e rejeitam `pqpdolkaeqlyzpdpbizo` são a guarda do Gate 0 — não são
  código morto. `pqpdolkaeqlyzpdpbizo` (projeto legado — não use) em código executável deve ser trocado por `doufsxqlfjyuvxuezpln`.
- Em conflito de merge em `client.ts`, a versão final mantém `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`
  e a guarda; confira com `grep doufsxqlfjyuvxuezpln src/integrations/supabase/client.ts`.
- O Lovable já reverteu este arquivo silenciosamente (incidente 401 em produção, 2026-06-11).

---

## REGRA #2 — Campos obrigatórios do tipo `Product`

`export interface Product` em `src/types/product-catalog.ts` deve conter:

```typescript
price: number           // preço original
sale_price?: number     // preço de venda
shortDescription: string
category_id?: string
category_name?: string
```

- Verificado pelo Gate 1.1 (`node scripts/check-product-type-fields.mjs`).
- Renomear `price` exige atualizar todos os usos. Em conflito de merge em arquivos de tipos, confira com
  `git diff HEAD -- src/types/ src/integrations/supabase/types.ts` que os campos continuam presentes.

---

## REGRA #3 — Resolução de conflitos de merge

- Código marcado com `// SSOT:`, `// GUARD:`, `// CRÍTICO:` ou `// DO NOT REMOVE` é guarda — mantenha o
  código e o comentário, mesmo se o `main` não os tiver.
- "Main wins" não é heurística válida: leia a descrição da PR antes de resolver. Antes de classificar algo
  como código morto, veja a história: `git log --all -S "<trecho>"`.
- Formato do commit de resolução: `merge(pr-NNN): resolve conflitos — [arquivos]`, com uma linha por
  arquivo dizendo o que foi mantido e por quê.
- Resolução não trivial entre agentes diferentes é registrada em `docs/coordenacao/conflitos-semanticos.md`
  — cobrado pelo Gate 1.18 (`scripts/check-conflict-ledger.mjs`).
- `scripts/sentinel-check.sh` recusa merge commit `Merge branch 'X' into 'Y'` entre branches de prefixos de
  agentes diferentes (`claude/*`, `codex/*`, …). Incorporar trabalho de outro agente = via PR.

---

## REGRA #4 — `src/integrations/supabase/types.ts`

- Antes de regenerar: `npm run check:types-inventory -- src/integrations/supabase/types.ts` grava o
  inventário estrutural (Tables/Views/Functions/Enums por schema; `scripts/extract-types-inventory.mjs`).
- Depois de regenerar: `npm run check:types-inventory-drift` compara com `HEAD~1` (ou `-- --base <ref>`)
  objeto por objeto e **falha** se algo sumiu sem entrada em `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`
  (Gate 1.2). Com `DATABASE_URL`: `-- --live` compara também com o `pg_catalog` ao vivo.
- Entrada na allowlist só para remoção real no banco (campos: schema, category, name, reason, approvedBy,
  date). Testes do gate: `tests/scripts/check-types-inventory-drift.test.mjs`.
- `grep -c "export type"` não serve como proxy: conta só os aliases de topo e não muda quando uma tabela
  some de dentro de `Database['public']['Tables']`.
- Tabelas/views que precisam existir em `types.ts`: `personalization_techniques`, `products`,
  `product_variants`, `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`,
  `magazine_templates`. Regenerações anteriores já droparam `personalization_techniques` (`158c142`) e
  todas as `magazine_*` (`7716ae9`, Lovable). Detalhes: `docs/E41_DIFF_ESTRUTURAL_TYPES_2026-09-16.md`.

---

## REGRA #5 — CI e testes

- `continue-on-error: true` só em checks opcionais (Lighthouse, visual baselines). Gates bloqueantes nunca
  — cobrado pelo contrato C17 de `check-workflow-contracts` (Gate 1.11).
- Projetos Playwright existentes em `playwright.config.ts`: `setup`, `chromium-public`, `firefox-public`,
  `webkit-public`, `chromium-authed`, `firefox-authed`, `webkit-authed`, `mobile-chrome`, `mobile-safari`,
  `chromium-smoke`. Confira a lista atual com `grep "name:" playwright.config.ts` antes de referenciar um
  projeto em workflow.
- Leia o arquivo inteiro de `playwright.config.ts` ou do workflow antes de modificá-lo.

---

## REGRA #6 — Formato de commit (enforced)

- Hook `.husky/commit-msg` roda `commitlint` (`commitlint.config.js`, base `@commitlint/config-conventional`):
  `tipo(escopo opcional): descrição`.
- Tipos aceitos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`, `build`, `perf`, `style`,
  `hotfix`, `revert`, `merge`.

---

## REGRA #7 — Lovable (comportamento observado do bot)

O Lovable (`gpt-engineer-app[bot]`) commita direto em `main`, com mensagens genéricas ("Changes"), e já:
- reverteu arquivos de configuração (`client.ts`, `.env.example`);
- renomeou campos de API sem aviso (`price → sale_price`);
- sobrescreveu guardas durante "Fast Visual Edit";
- sobrescreveu `types.ts` removendo tabelas (`7716ae9`);
- reintroduziu bugs já corrigidos (React #310 em `MagazineEditorPage`, 2026-07-16).

Depois de um commit do Lovable, confira: `node scripts/validate-supabase-config.mjs` (REGRA #1) e
`node scripts/check-product-type-fields.mjs` (REGRA #2). Muitos snapshots quebrando de uma vez = componente
mudou; verifique o componente antes de atualizar snapshot. `.lovableignore` é a proteção primária de
arquivos contra o bot; `lovable-protected-audit.yml` audita alterações do bot em arquivos protegidos.

---

## REGRA #8 — Banco: schema, migrations, DDL e edge functions

### Origem das ordens
Prompt, plano, TODO ou comentário gerado pelo Lovable (ou outro bot) não autoriza migration, DDL, deploy
ou script de infraestrutura. Exemplo real: o `CANONICAL_DB_CREATION_PROMPT` (2026-07-16) pedia "criar o
schema canônico" num banco de produção com 388 tabelas e tinha 9 defeitos medidos
(`docs/SCHEMA_REFERENCE.md` §7).

### Auditoria de schema
Só via `pg_catalog` / `information_schema` (queries em `docs/SCHEMA_REFERENCE.md` §8). PostgREST/OpenAPI
não enxerga trigger, policy, cron nem GRANT, e confunde view com tabela.

### Caminho de uma migration nova
1. Arquivo em `supabase/migrations/` na PR (com header `-- Rollback:` e arquivo em `supabase/rollbacks/`,
   cobrados pelo preflight — Gate 1.3).
2. Aplicação em produção só pelo workflow `.github/workflows/db-apply-migration.yml`
   (`workflow_dispatch(version)`): preflight read-only (`scripts/preflight-migration-apply.mjs`) → `psql -1`
   com `environment: production` → `migration repair --status applied <version>` → post-check → recibo em
   `supabase/MIGRATIONS_SYNC_LOG.md` (via PR).
3. `supabase db push` é bloqueado em workflows e scripts (`scripts/check-no-db-push.mjs`, contrato C19).

### DDL fora do fluxo (MCP `execute_sql`/`apply_migration`, dashboard)
- `execute_sql` serve para leitura (SELECT, EXPLAIN, `pg_catalog`). Mudança de estrutura — incluindo
  criar/alterar/dropar `cron.job` — nasce como migration na PR.
- DDL aplicada fora do workflow não entra no ledger (`supabase_migrations.schema_migrations`) e o schema
  real diverge em silêncio (casos: `catalog_e24_zapp_catalog_stats`, 2026-09-12;
  `audit_r3_revoke_anon_mv_product_compositions`, 2026-09-05; 8 `cron.alter_job` + `variant_stocks_select_org`,
  2026-10-13).
- Reconciliação, no mesmo dia: migration espelho em `supabase/migrations/` com o timestamp da aplicação real
  → `supabase migration repair --status applied <version>` (versão explícita) → PR com o arquivo e o recibo
  em `supabase/MIGRATIONS_SYNC_LOG.md` → `schema-snapshot-export.yml` com `force_rotate: true` se o baseline
  ficou desatualizado. O preflight aceita `mode: repair-only` (`transaction: none`, `approved-by` do dono)
  para registrar sem reaplicar. Política completa: `docs/db/POLITICA_DDL.md`.
- Detector semanal (advisory, não bloqueia): `.github/workflows/ddl-out-of-band-detector.yml` → relatório em
  `docs/ci/DDL_OUT_OF_BAND_REPORT.md`.

### Comandos que apagam o histórico do ledger — nunca contra `doufsxqlfjyuvxuezpln`
- `supabase migration squash --linked` (apaga do ledger tudo ≤ versão);
- `supabase migration repair --status applied` **sem versão explícita** (trunca `schema_migrations`);
- `supabase migration repair --status reverted` em lote (o CLI sugere isso quando o ledger diverge).

### Baseline do drift-check
- `supabase/migrations/` não reconstrói o banco do zero. O `db-schema-drift-check` replaya
  `supabase/baseline/<B>_baseline_schema.sql` (dump do schema vivo, gerado só por
  `schema-snapshot-export.yml`) + as migrations posteriores, numa pasta temporária
  (`scripts/drift-baseline.mjs`, `--workdir`).
- O baseline **não é migration**: não copiar para `supabase/migrations/`, não aplicar em produção, não serve
  para criar ambiente (não tem auth, cron, storage, vault, seed).
- Ruído do diff vai em `supabase/baseline/drift-allowlist.txt`, uma entrada específica e justificada por linha
  (o script recusa `.*` ou `^create table`). Objeto criado em produção sem migration vira migration espelho,
  não entrada de allowlist.
- O `supabase db dump` omite event triggers e publications mas emite `ALTER`/`COMMENT` que os referenciam;
  o replay descarta esses (`sanitizeBaselineForReplay`, só na pasta temporária).
- O export só gira o baseline depois de drift-check verde na mesma execução (job `drift-gate`). Migration
  `repair-only` ou aplicada fora da ordem de versão depois do baseline quebra o replay — remédio: dispatch de
  `schema-snapshot-export.yml` com `force_rotate: true`, revisando o diff do baseline na PR do bot.

### Edge functions
- Deploy só por `workflow_dispatch` em `.github/workflows/deploy-edge-functions.yml` (aceita
  `function_name` para deploy pontual).
- MCP `deploy_edge_function` / dashboard criam divergência sem ledger; o job "Compare GitHub × Canonical"
  (PR e cron diário) é o que detecta. Casos: `kit-ai-builder` (2026-09-23, timeout só em produção) e
  `magazine-reader-state-read` (2026-09-24, fix deployado antes da revisão). Deploy de emergência fora do
  workflow → reconciliar o git no mesmo dia e rodar de novo o "Compare GitHub × Canonical".
- MCP `get_edge_function` serve para inspeção.

---

## REGRA #11 — Vercel CLI

- `.vercel/project.json` (versionado) ancora o projeto `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`. Não apagar nem
  sobrescrever.
- `vercel link`, `vercel pull`, `vercel env pull`, `vc link` só no raiz do repo, depois de conferir `pwd` e o
  `projectId` em `.vercel/project.json`. Fora do raiz (worktree, `/tmp`) o CLI não acha o arquivo e cria
  projeto novo conectado ao mesmo repo — foi assim que surgiu
  `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`, 2026-09-15),
  dobrando os builds de todo push.
- Projeto Vercel novo só com aprovação do dono.

---

## CI — gates e workflows

### Gates obrigatórios (required checks em `main`)

O único check required no branch protection de `main` é **"Gate Final - Deploy Ready"**
(`.github/workflows/deploy-gates.yml`). Esse job agrega todos os gates abaixo; se qualquer um falhar, o
deploy é bloqueado. `.github/required-checks.json` é a lista oficial — PR que altere um `name:` de job em
`deploy-gates.yml` atualiza esse arquivo junto, senão o Branch Protection Sentinel alerta.

Tipo `job` = job independente no Actions (procure pelo `name:` do job); `step` = passo dentro de um job
agregador (`static-gates`, `drift-gates`, `security-gates` ou `build`; procure pelo `- name:` do step).
`scripts/check-gates-table.mjs` exige que todo step `Gate X.Y` de `deploy-gates.yml` tenha linha nesta tabela.

| Gate | Descrição | Tipo | Bloqueante |
|---|---|---|---|
| Gate 0 | SSOT — ID canônico `doufsxqlfjyuvxuezpln` (`validate-supabase-config.mjs`) | job | sim |
| Gate 0.5 | `npm audit --audit-level high` — sem dependências com CVE high/critical | job | sim |
| Gate 0.6 | Dependency Review — deps com CVE severity ≥ high bloqueiam o PR (E97, PR-only) | job | sim (PR-only) |
| Gate 1 | Lint (ESLint) + TypeScript sem erros — job `static-gates` | job | sim |
| Gate 1.1 | Campos críticos do tipo `Product` presentes (REGRA #2) | step | sim |
| Gate 1.2 | Drift estrutural de `types.ts` (nenhuma tabela/view/function/enum sumiu sem allowlist) | step | sim |
| Gate 1.3 | Contratos de migration (preflight — E15) | step | sim |
| Gate 1.4 | Visual baselines commitados | step | sim |
| Gate 1.5 | Sem "Salvar Alterações" em fluxos de rascunho | step | sim |
| Gate 1.6 | Bundle size dentro dos limites — step dentro do job `build` | step | sim |
| Gate 1.7 | TSC ratchet file guard — baseline não aumenta sem label `ratchet-override` (E41, PR-only) | step | sim (PR-only) |
| Gate 1.8 | Detect accidentally base64-encoded files — texto encodado em base64 acidentalmente | step | sim |
| Gate 1.9 | Dívida técnica — ratchets TODO/FIXME/`as any`/file-size não aumentam | step | sim |
| Gate 1.9.1 | `console.*` baseline — número de chamadas não aumenta sem justificativa | step | sim |
| Gate 1.9.2 | Boundary cross-domain — sem import novo entre `src/pages/*` de domínios diferentes | step | sim |
| Gate 1.10 | indexed-access ratchet — `object[key]` não aumenta (E15: promovido de advisory para bloqueante) | step | sim |
| Gate 1.11 | Workflow contracts `check-workflow-contracts --gate` (C10–C26) | step | sim |
| Gate 1.12 | Contract coverage + soft-delete policy commitada | step | sim |
| Gate 1.13 | RLS policies baseline vs pg_policies live (bloqueante com credenciais) | step | sim |
| Gate 1.13.1 | Tabelas com RLS habilitada e zero policies (deny-all silencioso) — `check-rls-no-policy-drift.mjs --gate` (E045) | step | sim |
| Gate 1.13.2 | Anon-insert rate guard manifest (E049) — 7 tabelas com INSERT anônimo têm trigger de rate guard | step | sim |
| Gate 1.13.3 | Migration receipts (E055) — migrations sem recibo há >24h | step | sim |
| Gate 1.14 | Secrets inventory `check-secrets-inventory --gate` — todos `secrets.*`/`vars.*` documentados em SEGREDOS.md (E40/E98) | step | sim |
| Gate 1.15 | `overflow-x-clip` em MainLayout — regressão visual de layout horizontal | step | sim |
| Gate 1.16 | Quotes list invariants — integridade da listagem de orçamentos | step | sim |
| Gate 1.17 | CODEOWNERS coverage de gate files (E72) | step | sim |
| Gate 1.18 | Ledger de conflitos semânticos (E188) — PRs de agentes diferentes bloqueados sem aprovação | step | sim |
| Gate E23 | Sinalizador `has_e2e` — informa se Gate 3 pode executar testes autenticados | job | não (Gate 3 falhará se for pulado em push ou PR confiável) |
| Gate 2 | Testes unitários (`vitest`) — job `unit-tests` | job | sim |
| Gate 2.5 | Integridade transacional PostgreSQL — job `database-integrity` | job | sim |
| Gate 3 | E2E Smoke (Playwright, chromium) — job `e2e-smoke` | job | sim |
| Gate 4 | Lighthouse CI (performance/acessibilidade) — job `lighthouse` | job | opcional |
| Gate 5 | SEO sanity check — job `seo-sanity` | job | sim |
| Gate 5.5 | RPC `restore_seller_cart` presente no canônico — job `restore-cart-rpc-gate` | job | sim |
| Gate 6 | Build Vite sem erro + SBOM SPDX-JSON + build provenance attestation (E99, push-only) — job `build` | job | sim |

### Quem roda o quê

| Trigger | Workflows principais | Propósito |
|---|---|---|
| **PR** | `deploy-gates.yml` (Gate Final) | Todos os gates obrigatórios — `paths-ignore: docs/**` (E197: PRs só-de-docs ignorados; CLAUDE.md na raiz continua disparando) |
| **PR** | `workflow-lint.yml` | actionlint + shellcheck |
| **PR** | `required-checks-guard.yml` | Checks fantasmas + divergência required-checks.json |
| **push: main** | `deploy-gates.yml` + `codeql.yml` | Gate Final + scan de segurança |
| **push: main** | `ddl-out-of-band-detector.yml` | Detecta DDL fora do fluxo |
| **schedule (diário)** | `required-checks-guard.yml` | Auditoria de checks |
| **schedule (semanal)** | `codeql.yml` | Scan completo seg 09:33 UTC |
| **schedule (semanal)** | `ddl-out-of-band-detector.yml` | Drift do ledger |
| **schedule (30 min)** | `uptime-monitor.yml` | Health check externo |
| **workflow_dispatch** | `db-apply-migration.yml` | ÚNICO caminho para migration em prod |
| **workflow_dispatch** | `deploy-edge-functions.yml` | ÚNICO caminho para deploy de edge function |
| **workflow_dispatch** | `schema-snapshot-export.yml` | Gira baseline do drift-check |

### Regras de workflow (cobradas por `check-workflow-contracts --gate`, Gate 1.11)

Texto completo em `docs/ci/PADRAO_WORKFLOW.md`. Resumo:

- **R1** `permissions:` explícito no topo (`contents: read` mínimo).
- **R2/R17** `concurrency:` com `cancel-in-progress: true` em PR; `false` em push/schedule; em triggers
  mistos: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- **R3** `timeout-minutes:` em todo job. Classes: estático/lint ≤ 5, unitário ≤ 10, E2E shard ≤ 20,
  E2E full/nightly ≤ 60, cron pesado ≤ 60. `unit-tests` usa 45 (classe "Full job").
- **R4** `node-version-file: .nvmrc` (nunca literal).
- **R5** segredos via `env:` no step, nunca como argumento de CLI.
- **R6/R20** todo `upload-artifact` declara `retention-days:` — 14 padrão, 30 relatórios semanais, 90
  auditoria (com comentário `# E88`).
- **R7** sem `master`/`develop` nos triggers.
- **R8** ID de job em kebab-case e estável (mudar o ID quebra required checks).
- **R9** `persist-credentials: false` em `actions/checkout` com token de escrita.
- **R10** `defaults.run.shell: bash` em workflows com `run:`.
- **R11** `permissions.contents: write` proibido em workflow com trigger `pull_request`; nenhum segredo de
  escrita em job de PR.
- **R12** workflow com `paths:` inclui o próprio `.github/workflows/<self>.yml`.
- **R13** `test-results/` nunca como único path de upload.
- **R14** runner fixo `ubuntu-24.04` (nunca `ubuntu-latest`).
- **R15** actions externas pinadas por SHA de 40 caracteres.
- **R16** `continue-on-error: true` proibido a nível de job em gate bloqueante.
- **R18** `supabase db push` proibido em `run:`.
- **R19** nenhum workflow referencia `pqpdolkaeqlyzpdpbizo`.

Lint de workflows: `actionlint` + `shellcheck` em `.github/workflows/workflow-lint.yml`. Local:
`npx --yes actionlint .github/workflows/<arquivo>.yml`.

### Inventário de segredos
`docs/ci/SEGREDOS.md` lista todo `secrets.*` e `vars.*` usado nos workflows (Gate 1.14). Segredo novo em
workflow = linha nova nesse arquivo com dono, escopo e rotação.

---

## Arquivos protegidos (guardas — alterar só com motivo explícito)

| Arquivo | Por quê |
|---|---|
| `src/integrations/supabase/client.ts` | ID do banco oficial — REGRA #1 |
| `scripts/validate-supabase-config.mjs` | Guarda do Gate 0 |
| `.env.example` | Referência canônica de variáveis |
| `.lovableignore` | Proteção primária contra o Lovable |
| `.github/CODEOWNERS` | Revisão obrigatória |
| `scripts/sentinel-check.sh` | Branch Protection Sentinel |
| `.github/workflows/deploy-gates.yml` | Pipeline de deploy (Gate 0 → Gate Final) |
| `.vercel/project.json` | Âncora do projeto Vercel — REGRA #11 |
| `docs/SCHEMA_REFERENCE.md` | Retrato `pg_catalog` do banco oficial — REGRA #8 |

---

## graphify

O grafo de conhecimento do código fica em `graphify-out/`.

- Versionados: só `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json`. `graph.json` e `graph.html`
  são ignorados (`.gitignore`, bloco `graphify-out/*`) — `graphify query/path/explain` só funcionam depois
  de gerar o grafo localmente com `graphify update .`.
- Instalação do CLI: pacote Python `graphifyy` (ver `.claude/skills/graphify/SKILL.md`, Step 1); skill
  acionada por `/graphify`.
- Frescura: compare `git rev-parse --short HEAD` com `grep "Built from commit" graphify-out/GRAPH_REPORT.md`.
  Não há sincronização automática ativa; rebuild manual com `graphify update . --force`.

Uso:
- Para perguntas sobre o código, quando `graphify-out/graph.json` existir, rode primeiro
  `graphify query "<pergunta>"`; `graphify path "<A>" "<B>"` para relações; `graphify explain "<conceito>"`
  para um conceito.
- Se `graphify-out/wiki/index.md` existir, use-o para navegação ampla.
- `graphify-out/GRAPH_REPORT.md` só para revisão ampla de arquitetura.
- Depois de alterar código, rode `graphify update .` (só AST, sem custo de API).
