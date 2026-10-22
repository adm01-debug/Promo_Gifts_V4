# Relatório de Análise de PRs — Promo Gifts V4

**Baseline SHA do main:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`
**Data da análise:** 2026-10-22
**Total de PRs abertas analisadas:** 24 de 24
**PRs mergeadas nesta análise:** 0

> ⚠️ PR #2332 ("Add stale issue and PR management workflow") já estava mergeada em `main`
> antes desta análise (merged 2026-10-21T20:27 por adm01-debug). Não está no conjunto de 24.

---

## Resumo por veredicto

| Veredicto | Quantidade | PRs |
|---|---|---|
| **CI_PENDENTE** | 1 | #2338 |
| **AGUARDAR_REBASE** | 4 | #2312, #2314, #2315, #2316 |
| **DECISÃO_HUMANA** | 2 | #2290, #2293 |
| **DRAFT** | 1 | #2320 |
| **NÃO_MERGEAR** | 1 | #2319 |
| **FECHAR** | 15 | #2322–#2337 (exceto #2332) |
| **MERGEADA** | 0 | — |

---

## PRs com CI Pendente

### PR #2338 — fix(ci): corrige 5 workflows em failure
- **Branch:** `claude/laughing-cori-o9w35e`
- **Head atual:** `3d2fe287c954e8fbe39d98df4d86dacb808742f9` (18:08:02Z)
- **Base:** `8e8053b9` (= main ✅)
- **Label:** `large-pr-approved`
- **CI status (18:10 UTC):** Gate Final não iniciado — CI em andamento para `3d2fe287`
- **Bloqueio:** adm01-debug empurra commits continuamente (~4 min/commit, 153 total). Cada push cancela CI anterior via `concurrency: cancel-in-progress: true`.
- **Ação:** Sessão subscrita a eventos do PR. Safety-net 19:04 UTC. Quando Gate Final = `success` → mergear imediatamente.
- **Constraints aplicadas:** proibido comentar na PR para pedir pausa nos pushes.

---

## PRs que aguardam rebase

### PR #2312 — ci(deploy-gates): skip docs-only PRs + timeout unit-tests 45min
- Base `1ac6992` (behind main). Arquivo protegido `deploy-gates.yml`. Mudança válida (E197+E24).
- **Ação:** Autor deve fazer rebase em main. Verificar se já está em main antes.

### PR #2314 — ci(ratchet): atualiza .as-assertions-baseline.json 2162→2164
- Conflito com #2315 no mesmo arquivo. Valores incompatíveis (2163 vs 2164).
- **Ação:** Consolidar com #2315 após rebase em main.

### PR #2315 — ci(e2e): remove credenciais reais de playwright.config.ts
- Correção de segurança C25 (alta prioridade). Conflito com #2314 no mesmo arquivo.
- **Ação:** Rebase em main, resolver conflito com #2314, verificar CI verde.

### PR #2316 — fix(ci): Gate 1.12 — magazine-reader-state-read ao contrato
- Base `45545ae` (behind main). Correção válida de Gate 1.12. Verificar se PR #2338 já inclui.
- **Ação:** Aguardar resultado de #2338. Se #2338 já incluir esta correção, fechar #2316.

---

## PRs que exigem decisão humana

### PR #2290 — Bump @eslint/js from 9.39.5 to 10.0.1 (dependabot)
- **Risco:** Major bump 9→10. Breaking changes: Node.js ≥ 20.19 obrigatório, formato `.eslintrc` removido.
- **Decisão necessária:** Verificar compatibilidade de todos os plugins ESLint com v10 antes de mergear.

### PR #2293 — Bump recharts from 2.10.3 to 3.10.1 (dependabot)
- **Risco:** Major bump 2→3. Breaking API changes. Remove `recharts-scale`. Pode quebrar componentes.
- **Decisão necessária:** Audit dos componentes que usam recharts antes de mergear.

---

## PRs para fechar (templates irrelevantes)

15 PRs (#2322, #2323, #2324, #2325, #2326, #2327, #2328, #2329, #2330, #2331, #2333, #2334, #2335, #2336, #2337) são templates genéricos do GitHub Actions para stacks incompatíveis (Node, Django, Python, Ruby, Rust, Go, Java Maven/Gradle, CMake, Docker, npm publish, GHCR, blank, Webpack).

**Violações:** Todas violam R1 (sem permissions), R2 (sem concurrency), R3 (sem timeout), R14 (ubuntu-latest), R15 (actions sem SHA 40 chars).

**Ação:** Fechar todas. Nenhuma tem valor para este repositório React/TypeScript/Vite/Supabase.

---

## PRs não mergear

### PR #2319 — Confirm repository access and workflow status (Jules bot)
- PR vazia — 0 arquivos alterados. Artefato de verificação de acesso do bot Jules.
- **Ação:** Fechar.

### PR #2320 — Align ESLint dependency ranges (Copilot) — DRAFT
- Em estado DRAFT, base desatualizada, depende de decisão sobre #2290.
- **Ação:** Aguardar decisão sobre #2290; se #2290 for mergeado, atualizar e promover de DRAFT.

---

## PRs mergeadas nesta análise

**Nenhuma** — PR #2338 (única candidata com base = main) ainda aguarda Gate Final verde no head `ac0f4e10fc9d0197980f1ff3e140578d708f38a9`.

---

## Nota sobre baseline CI

O CI local não pôde ser executado devido a registro npm privado (`europe-west1-npm.pkg.dev`) inacessível no container cloud (403 Forbidden). Todo o baseline foi derivado dos check runs do GitHub Actions para o SHA `8e8053b9ed85142e85809783cd3acf9a3077ecde` de main.

**Falha pré-existente em main (NÃO é regressão desta análise):**
- `uptime-monitor.yml` — health check externo, falha por evento `schedule` apenas. Não é causado por código.

---

## Arquivos gerados

| Arquivo | Descrição |
|---|---|
| `analise-prs/prs.json` | Dados estruturados de todas as 24 PRs |
| `analise-prs/prs.csv` | Tabela CSV para planilha |
| `analise-prs/progresso.json` | Estado do processo de análise |
| `analise-prs/regras-de-negocio.md` | Regras extraídas do CLAUDE.md |
| `analise-prs/dossies/PR-NNNN.md` | 24 dossiers individuais |
| `analise-prs/RELATORIO_PRS.md` | Este relatório |
