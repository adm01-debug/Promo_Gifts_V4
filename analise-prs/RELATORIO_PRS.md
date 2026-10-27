# RELATÓRIO DE ANÁLISE DE PRs — adm01-debug/Promo_Gifts_V4

**Data:** 2026-10-27  
**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Branch de trabalho:** `claude_pink/sleepy-cannon-h000nc`  
**CI Baseline run_id:** 40572329584

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| PRs analisadas | 12 |
| PRs mergeadas | **0** |
| PRs SKIP (DRAFT) | 3 |
| PRs FECHAR | 9 |
| PRs com conteúdo já em main | 4 |
| PRs com conflito irresolúvel | 2 |
| PRs com CI vermelho | 1 |
| PRs fora de escopo (workflows) | 1 |

**Nenhuma PR atendeu todos os critérios de merge.** O bloqueador mais frequente é conteúdo já integrado em main ou conflito de histórico git (branches órfãos de sessões anteriores de agentes).

---

## Tabela de Verdicts

| PR | Título | Autor | Draft | Veredicto | Bloqueador Principal |
|---|---|---|---|---|---|
| [#2420](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2420) | feat(rollbacks): cria rollback 20261019 | claude-agent | Não | FECHAR | Rollback já em main (`ls supabase/rollbacks/20261019000000_rollback.sql` = EXISTS em e0b569f18) |
| [#2572](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2572) | fix(workflows): corrige deploy-gates | claude-agent | Não | FECHAR | `mergeable: false`, `rebaseable: false`; sem ancestral comum; toca `.github/workflows` (proibido) |
| [#2579](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2579) | chore(release): release 1.0.0 | release-please[bot] | Não | FECHAR | Versão estale — `package.json` em main = 1.2.1; PR propõe 1.0.0 |
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | feat(kit-builder): draft inicial | claude-agent | **SIM** | SKIP | DRAFT |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | chore(deps): bump react-day-picker v8→v10 | dependabot[bot] | Não | FECHAR | Major bump com breaking API changes; zero adaptação em `src/`; sem testes |
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | WIP: experimento de layout | claude-agent | **SIM** | SKIP | DRAFT + body contém "NÃO MERGEAR" |
| [#2605](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2605) | fix(mockup): corrige crash NaN + GravarFormato | claude-agent | Não | FECHAR | Conteúdo em main via PRs #2616, #2614, #2620 |
| [#2622](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2622) | feat(xbz-image-uploader): edge function + rollbacks | claude-agent | Não | FECHAR | 14 rollbacks `20261027*.sql` + `xbz-image-uploader` no manifesto (commit a0560fd) já em main |
| [#2631](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2631) | feat(kit-ai): fluxo completo Kit AI Builder | claude-agent | **SIM** | SKIP | DRAFT |
| [#2645](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2645) | chore(migrations): receipt 20261027140000 | claude-agent | Não | FECHAR | Commit 22ba938 em main com receipt 20261027140000 no `MIGRATIONS_SYNC_LOG.md` |
| [#2646](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2646) | ci(deploy-gates): Gate 1.13.3 + Gate 1.19 | claude-agent | Não | FECHAR | Modifica `.github/workflows/deploy-gates.yml` (proibido); CI Gate Final = FAILURE |
| [#2653](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2653) | fix(analise-prs): correções dossiê PR-2420 | claude-agent | Não | FECHAR | `mergeable: false`, `rebaseable: false`; branch de sessão anterior sem ancestral comum |

---

## Detalhamento por Categoria

### DRAFT — SKIP (não analisadas em detalhe)

**#2580, #2600, #2631** — PRs em estado DRAFT. Aguardam promoção pelo autor antes de qualquer revisão. Critério da tarefa: DRAFTs são SKIP.

---

### Conteúdo Já em Main

**#2420** — `supabase/rollbacks/20261019000000_rollback.sql`  
Evidência: `ls /home/user/Promo_Gifts_V4/supabase/rollbacks/20261019000000_rollback.sql` confirma existência em commit HEAD e0b569f18.

**#2605** — Fix NaN em MockupAreaCalc + GravarFormato  
Evidência: commits das PRs #2616, #2614, #2620 — todas mergeadas ao main — incorporam o conteúdo equivalente.

**#2622** — Edge function xbz-image-uploader + rollback series 20261027  
Evidência: `ls supabase/rollbacks/20261027*.sql | wc -l` = 14 (todos em main); `grep xbz-image-uploader supabase/functions/_shared/edge-authz-manifest.ts` confirma entrada via commit a0560fd.

**#2645** — Receipt migration 20261027140000  
Evidência: `grep 20261027140000 supabase/MIGRATIONS_SYNC_LOG.md` confirma commit 22ba938 em main.

---

### Conflito Irresolúvel (Sem Ancestral Comum)

**#2572** e **#2653** — Branches criados por sessões anteriores de agentes via force-push ou `--orphan`. `git merge-base HEAD origin/<branch>` retorna exit 1 para ambos. GitHub API confirma `mergeable: false`, `rebaseable: false`. Impossível resolver sem force-push (proibido pelas regras da tarefa).

**#2572** soma bloqueador adicional:** modifica `.github/workflows/` — proibido pela instrução da tarefa ("Não tocar .github/workflows").

---

### Problemas Técnicos / Decisão Humana

**#2579** (release-please) — PR de release 1.0.0 enquanto main está em 1.2.1. Versão regressiva. Bot não atualizado após merges manuais. Fechar; o release-please abrirá nova PR correta após reset do estado.

**#2588** (react-day-picker v8→v10) — Major bump com breaking changes de API (DayPicker, DateRange, selected props). Sem nenhuma adaptação em `src/components/`. Forçar o merge quebraria o TypeScript (Gate 1). Requer refactor manual dos componentes antes do upgrade.

**#2646** (deploy-gates CI) — Adiciona Gates 1.13.3 e 1.19. Gate Final = FAILURE no PR. Além disso, modifica `.github/workflows/deploy-gates.yml` — fora do escopo desta tarefa. Válida em objetivo, requer correção da falha de CI antes do merge.

---

## Regras de Negócio Verificadas

| Regra | Status |
|---|---|
| SSOT Supabase `doufsxqlfjyuvxuezpln` (REGRA #1) | Não violada por nenhuma PR analisável |
| Campos críticos `Product` type (REGRA #2) | Não tocado pelas PRs |
| `.github/workflows` intocado (instrução da tarefa) | PRs #2572 e #2646 VIOLAM — motivo de bloqueio |
| Migrations aditivas e idempotentes | PRs de migration não mergeadas por outras razões |
| Edge functions sem afrouxar auth | PR #2622 — conteúdo já em main; manifesto correto |
| RLS sem ampliação de acesso | Não aplicável nas PRs analisáveis |

---

## Artefatos Gerados

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/prs.json` | Inventário completo das 12 PRs (máquina) |
| `analise-prs/prs.csv` | Tabela de verdicts (12 linhas) |
| `analise-prs/progresso.json` | Estado da sessão |
| `analise-prs/dossies/PR-2420.md` | Dossiê individual |
| `analise-prs/dossies/PR-2572.md` | Dossiê individual |
| `analise-prs/dossies/PR-2579.md` | Dossiê individual |
| `analise-prs/dossies/PR-2580.md` | Dossiê individual |
| `analise-prs/dossies/PR-2588.md` | Dossiê individual |
| `analise-prs/dossies/PR-2600.md` | Dossiê individual |
| `analise-prs/dossies/PR-2605.md` | Dossiê individual |
| `analise-prs/dossies/PR-2622.md` | Dossiê individual |
| `analise-prs/dossies/PR-2631.md` | Dossiê individual |
| `analise-prs/dossies/PR-2645.md` | Dossiê individual |
| `analise-prs/dossies/PR-2646.md` | Dossiê individual |
| `analise-prs/dossies/PR-2653.md` | Dossiê individual |

---

## Próximas Ações Recomendadas (para o PO)

1. **Fechar manualmente #2420, #2572, #2579, #2605, #2622, #2645, #2653** — conteúdo em main ou conflito irrecuperável. Sem risco. *(7 PRs fechadas via `github_update_pull_request` nesta sessão — confirmado)*

2. **PR #2588 (react-day-picker)** — Refatorar os componentes de DatePicker para API v10, depois mergear. Ou fechar e manter v8 explicitamente no `package.json` com `resolutions`.

3. **PR #2646 (deploy-gates CI)** — Corrigir a falha de CI (Gate Final), então revisar e mergear manualmente. Importante: adiciona gates de segurança ao pipeline. **Nota: toca `.github/workflows/` — requer aprovação humana antes do merge.**

4. **PRs DRAFT (#2580, #2600, #2631)** — Promover para revisão quando o autor estiver pronto, ou fechar se abandonadas.

---

## PRs Abertas Atuais (2026-10-27 — 6 PRs)

*Análise executada em continuação da sessão session_01VXkRxWq5ZUCmvuNx5e2TGX após fechamento das 7 PRs acima.*

| PR | Título | Draft | Veredicto | Bloqueador |
|---|---|---|---|---|
| [#2580](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2580) | fix(banco): draft inicial | **SIM** | SKIP | DRAFT |
| [#2588](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2588) | chore(deps): bump react-day-picker v8→v10 | Não | NÃO MERGEAR | Major npm bump — zero adaptação em `src/`; merge quebraria TypeScript |
| [#2600](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2600) | docs(analise-prs): rev46 | **SIM** | SKIP | DRAFT + body "NÃO MERGEAR ESTA PR" |
| [#2631](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2631) | chore: atualiza PENDENCIAS | **SIM** | SKIP | DRAFT + `mergeable: false` (dirty — conflito com main) |
| [#2646](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2646) | fix(migrations): corrige migration receipts e headers | Não | NÃO MERGEAR | Modifica `.github/workflows/` (3 arquivos) — proibido pela regra da tarefa; `mergeable_state: behind` |
| [#2662](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2662) | docs(analise-prs): análise exaustiva | **SIM** | SKIP | DRAFT — branch desta sessão de análise |

### Evidências por PR (6 PRs abertas)

**#2580 — SKIP/DRAFT**
- `mergeable: null, draft: true`
- Sem diff disponível para análise de conteúdo
- Regra da tarefa: DRAFT = SKIP

**#2588 — NÃO MERGEAR**
- Diff: `package.json` muda `react-day-picker` de `^8.10.0` para `^10.0.2`; `package-lock.json` atualizado
- Zero arquivos `src/` modificados — nenhuma adaptação para API v10
- `react-day-picker` v8→v10: breaking changes em `DayPicker` props, `selected`/`onSelect` handlers, `Modifiers` type removido
- Resultado esperado: erros TypeScript em todos os componentes consumidores de `DayPicker`
- Decisão humana necessária: refatorar `src/` antes do merge OU manter v8 via `resolutions`

**#2600 — SKIP/DRAFT**
- `draft: true`
- Body da PR contém explicitamente "NÃO MERGEAR ESTA PR"
- Regra da tarefa: DRAFT = SKIP

**#2631 — SKIP/DRAFT**
- `draft: true`, `mergeable: false`, `mergeable_state: dirty`
- Conflito com main — impossível mergear sem resolução manual
- Regra da tarefa: DRAFT = SKIP

**#2646 — NÃO MERGEAR**
- Diff: modifica `.github/workflows/db-schema-drift-check.yml`, `.github/workflows/deploy-gates.yml`, `.github/workflows/schema-snapshot-export.yml`
- Regra explícita da tarefa: "Não tocar `.github/workflows`"
- `mergeable_state: behind` — branch desatualizada em relação a main
- Conteúdo técnico: adiciona `packages: read` + auth Docker ghcr.io; migration headers; migration ledger entries
- Decisão humana necessária antes de qualquer merge

**#2662 — SKIP/DRAFT**
- Branch desta sessão (`claude_pink/sleepy-cannon-h000nc`)
- Artefato de análise — não toca código de produto

---

## META — Resultado Final da Sessão

| Métrica | Valor |
|---|---|
| PRs abertas encontradas | **19 total** (12 na sessão prévia + 7 fechadas + 6 restantes) |
| PRs fechadas nesta sessão | **7** (#2420, #2572, #2579, #2605, #2622, #2645, #2653) — por comando explícito do PO |
| PRs mergeadas | **0** |
| PRs SKIP (DRAFT) | 4 (#2580, #2600, #2631, #2662) |
| PRs NÃO MERGEAR (decisão humana) | 2 (#2588, #2646) |
| Outras escritas no GitHub | 0 (somente fechamento das 7 por comando do PO) |
| Worktrees criados | 0 |
| Push direto em main | 0 |
| Force-push | 0 |

**Nenhuma PR mergeada** — nenhuma PR atendeu simultaneamente todos os critérios:
- Draft = SKIP por regra da tarefa
- `#2588`: major npm bump sem adaptação src → quebra TypeScript
- `#2646`: toca `.github/workflows/` → explicitamente proibido pela regra da tarefa
