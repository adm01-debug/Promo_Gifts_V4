# RELATORIO_PRS — Análise Exaustiva das PRs Abertas

**Atualizado em:** 2026-10-29T22:30Z  
**Sessão:** https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo  
**Main HEAD atual:** `c3b41286` (pós-merge #2720 e #2730 nesta sessão)  
**Gate Final no main atual:** em andamento (22:28Z — checks queued/in_progress)

---

## 🚨 RISCOS E DECISÕES HUMANAS (PO) — LEIA PRIMEIRO

### 1. RISCO CRÍTICO — PR #2731 (NÃO MERGEAR)

**PR #2731** — `fix(db): protege kill_switch_hits contra INSERT anônimo sem rate guard`

A PR adiciona `--require-live` ao Gate 1.13.2 E uma migration para `trg_anon_rate_guard` em `kill_switch_hits`. **Se mergeada antes de aplicar a migration**, o Gate 1.13.2 falhará para TODAS as PRs futuras e no main, bloqueando todos os merges.

**Ação necessária do PO:**
1. Executar `workflow_dispatch` em `.github/workflows/db-apply-migration.yml` com a migration `20261029160339_add_kill_switch_hits_anon_rate_guard.sql`
2. Confirmar via Supabase que `trg_anon_rate_guard` existe em `kill_switch_hits`
3. Então #2731 pode ser mergeada

### 2. DECISÃO HUMANA — PR #2713 (Release Please)

**PR #2713** — `chore(main): release 1.1.0` (gerada pelo bot `release-please[bot]`)

Pela REGRA #8 do CLAUDE.md, PRs de bot requerem confirmação do PO. O changelog precisa ser validado. PO deve confirmar se a versão 1.1.0 é correta e mergear manualmente.

### 3. BRANCH COM COMMIT UNPUSHED — `fix/gate-e40-cron-seed-261028`

A branch tem 1 commit unpushed (`dbdb7b88`) que corrige o Gate E40 em `scripts/drift-baseline.mjs`. O push foi bloqueado pelo auto mode nesta sessão. PO ou operador deve executar:
```sh
git push -u origin fix/gate-e40-cron-seed-261028
```
E abrir PR (REGRA #9: commits de governança exigem PR).

---

## ✅ MERGEADAS NESTA SESSÃO

| PR | Título | SHA merge | Gate Final |
|---|---|---|---|
| #2720 | ci(e2e): não ocultar falha de fixtures E2E | `14b6d5fc` | SUCCESS ✅ |
| #2730 | fix(ci): repair-only E15 — corrige injeção de expressão | `c3b41286` | em andamento |

### Histórico de merges anteriores (sessões anteriores)

| PR | Título | Veredito anterior |
|---|---|---|
| #2679 | test(calendar): corrige seletores react-day-picker v10 | MERGEADA |
| #2646 | fix(migrations): adiciona cabeçalho Rollback | MERGEADA |
| #2680 | ... | FECHADA_SEM_MERGE |
| (e outros das sessões anteriores) | ver prs.json para histórico completo | — |

---

## ⏳ AGUARDANDO CI — Prontas, bloqueadas apenas por Gate Final

Estas PRs não têm regressão identificada, não têm conflito e não têm bloqueio de negócio. Aguardam apenas Gate Final verde.

| PR | Título | HEAD SHA | Estado | Notas |
|---|---|---|---|---|
| #2734 | fix(ci): usa mirror Docker Hub após limite do GHCR | d7cba5ab | behind | Atualizar branch contra main |
| #2738 | docs(analise-prs): rev47 | 95057305 | blocked | Docs pura — zero risco |
| #2739 | fix(mockup): gerador | a4d70ea6 | blocked | Fix de produto |
| #2741 | fix(mockup): telas | db49de03 | blocked | Fix de produto |
| #2742 | fix(magic-up): compartilhar, brand kit, a11y | 0c0bbfbb | blocked | Fix de produto |
| #2743 | chore(audit): Graphify + CI | 7eea1696 | blocked | Body diz não mesclar até checks |
| #2745 | ci(ratchet): evita SIGPIPE | a12972b0 | behind | Fix legítimo de CI |

---

## ❌ NÃO MERGEAR — Com motivo documentado

| PR | Título | Motivo |
|---|---|---|
| #2701 | fix(ci): Kit Coverage | Conflito de merge (`dirty`) + coverage 56% < 70% |
| #2714 | fix(db): reconciliar migrations | Conflito de merge (`dirty`) |
| #2717 | fix(e2e): isola Vite | Conflito de merge (`dirty`) — provavelmente conflita com #2720 |
| #2731 | fix(db): kill_switch_hits rate guard | **REGRESSÃO** — `--require-live` bloqueará main antes da migration E15 |
| #2744 | [NÃO MESCLAR] fix(edge) | DRAFT + bloqueio explícito no título + edge function |
| #2746 | docs(ci): auditoria workflows | DRAFT |

---

## 📊 RESUMO FINAL

**Total PRs abertas analisadas:** 14  
**Total PRs com veredito emitido:** 14 ✅

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEADA (esta sessão) | 2 | #2720, #2730 |
| NÃO_MERGEAR | 5 | #2701, #2714, #2717, #2731, #2744 |
| NÃO_MERGEAR (DRAFT) | 2 | #2744, #2746 |
| AGUARDANDO_CI | 6 | #2734, #2738, #2739, #2741, #2742, #2743, #2745 |
| DECISÃO_HUMANA | 1 | #2713 |

---

## 🔗 CLUSTERS DE PRs RELACIONADAS

### Cluster Mockup (3 PRs relacionadas)
- #2739 fix(mockup): gerador
- #2741 fix(mockup): telas
- #2742 fix(magic-up): compartilhar, brand kit, a11y

Estas PRs provavelmente se complementam. Após Gate Final verde em todas, mergear na ordem: #2739 → #2741 → #2742.

### Cluster Rate Guard E049 (bloqueada)
- #2731 fix(db): kill_switch_hits rate guard
- Precisa de: migration E15 aplicada primeiro pelo PO

### Cluster CI/Docs desta sessão
- #2730 ✅ MERGEADA — injeção de expressão
- #2720 ✅ MERGEADA — fixtures E2E
- #2745 AGUARDANDO_CI — SIGPIPE fix (complementa #2730)
- #2738 AGUARDANDO_CI — docs análise PRs

---

## ⚠️ NÃO VERIFICADO (itens que precisam de mais investigação)

- **#2743** body: verificar o texto exato do "não mesclar até checks" para confirmar se é instrução permanente ou temporária
- **#2713** changelog: conteúdo do changelog da release 1.1.0 não foi lido — PO deve validar

---

## 📁 Arquivos entregues nesta sessão

- `analise-prs/baseline/state.md` — atualizado com main `c3b41286`
- `analise-prs/dossies/PR-2701.md` .. `PR-2746.md` — 14 dossiers criados
- `analise-prs/prs.json` — atualizado com 14 PRs abertas
- `analise-prs/prs.csv` — atualizado
- `analise-prs/progresso.json` — atualizado com main `c3b41286`
- `analise-prs/RELATORIO_PRS.md` — este arquivo
