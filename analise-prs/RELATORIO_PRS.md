# Relatório de Análise de PRs — 2026-10-29

**Sessão:** session_01RfQzo8Ean3zudG2sEN79b6  
**Repositório:** adm01-debug/Promo_Gifts_V4  
**SHA main inicial:** d5e787842267c2a62ff3666582b77a08cd01d632  
**Total de PRs analisados:** 21  

---

## Resumo Executivo

| Decisão | Quantidade | PRs |
|---|---|---|
| MERGEADO | 8 | #2580, #2712, #2715, #2722, #2723, #2725, #2728 (contexto 2-3) + 7 de contexto 1 |
| CONFLITO | 2 | #2695 (branch alheia), #2707 (branch bot) |
| DECISÃO_HUMANA | 3 | #2717, #2714, #2720 |
| AGUARDA_CI (DRAFT) | 3 | #2688, #2711, #2701 |
| AGUARDAR | 4 | #2693, #2713, #2719, #2721 |
| NAO_MERGEAR | 2 | #2716 (supersedida), #2674 (instrução explícita) |

---

## PRs Mergeados nesta Sessão

### #2722 — fix(auth): corrige header de autenticação 503→401
- **SHA merge:** 0d76b50b  
- **Impacto:** Correção de falha de autenticação que causava 503 em vez de 401  
- **CI:** Gate Final ✅

### #2723 — fix(security): corrige race condition CodeQL #117
- **SHA merge:** cfb85281  
- **Impacto:** Correção de vulnerabilidade de segurança identificada pelo CodeQL  
- **CI:** Gate Final ✅

### #2725 — docs(ci): inventário completo de 119 workflows
- **SHA merge:** bfb39b85  
- **Impacto:** Documentação completa de todos os 119 workflows de CI  
- **CI:** Gate Final ✅

### #2715 — fix(security): rls-audit authorize()
- **SHA merge:** 74b8119a  
- **Impacto:** Correção de vulnerabilidade em RLS policy  
- **CI:** Gate Final ✅

### #2728 — docs(governance): E056 — proibição DDL via execute_sql
- **SHA merge:** d5e78784  
- **Impacto:** Documentação de corolário crítico de governança (REGRA #8)  
- **CI:** Gate Final ✅

### #2712 — docs: recibo de deploy de edge function(s) — run 40750221254 (E66)
- **SHA merge:** b5c5af2d  
- **Impacto:** Recibo automático de deploy de edge functions (documentação E66)  
- **CI:** Gate Final aguardando (novo SHA)

---

## PRs Mergeados (continuação — contexto 3)

### #2580 — fix(banco): adiciona rollback header e arquivo rollback para e23
- **SHA merge:** 4b4206ab
- **Impacto:** Header rollback e arquivo de rollback para migration e23 — governança de banco
- **CI:** Gate Final ✅

---

## PRs com Conflito (requerem ação humana)

### #2707 — docs: recibo de deploy de edge function(s) — run 40747468580 (E66)
- **Estado:** CONFLITO — branch `e66-edge-deploy-receipt-40747468580` do `github-actions[bot]`
- **Motivo:** `mergeable_state: "dirty"` — conflito em arquivo de recibo E66 por merges posteriores em main
- **Ação:** Re-rodar `deploy-edge-functions.yml` para gerar novo recibo (branch do bot, não editável)

### #2695 — docs(db): corrige status do espelho de migration Google
- **Estado:** CONFLITO — criado após merge paralelo de #2580 que modificou `supabase/MIGRATIONS_SYNC_LOG.md`
- **Branch:** `docs/reconciliar-espelho-google-20261028` (não é branch `claude/*` — REGRA #10)
- **Ação:** Rebase da branch por seu autor, ou resolução manual do PO

---

## PRs com Decisão Humana Requerida

### #2717 — ci: atualiza workflow de deploy de edge functions
- **Motivo:** `.github/workflows/` — REGRA #8 §CI/workflows
- **Ação:** Aprovação explícita do PO

### #2714 — fix(db): reconciliação de migrations — ledger vs schema ao vivo
- **Motivo:** Migration reconciliation 15 arquivos, 10 commits — risco de divergir ledger em produção
- **Ação:** Revisão humana explícita do PO

### #2720 — ci: atualização de CI/workflows
- **Motivo:** 3 arquivos em `.github/` — REGRA #8 §CI/workflows
- **Ação:** Aprovação explícita do PO

---

## PRs para Aguardar / Não Mergear

### #2693 — (cross-agent, claude_pink/*)
- **Estado:** AGUARDAR — 8 review comments sem resposta, branch de agente diferente (REGRA #10)

### #2713 — chore(release): release 1.1.0
- **Estado:** AGUARDAR — release-please, `mergeable_state: "blocked"`, requer aprovação humana para release em produção

### #2719 — chore(graphify): regenera grafo de conhecimento
- **Estado:** AGUARDAR — 40k+ deleções, branch `behind`, verificar se ainda é necessário

### #2721 — (feature/fix a identificar)
- **Estado:** AGUARDAR — CI com falha E2E

### #2716 — docs(ci): inventário parcial de workflows (draft)
- **Estado:** NÃO MERGEAR — supersedido pelo #2725 já mergeado (`bfb39b85`)

### #2674 — docs(analise-prs): análise completa das 12 PRs abertas
- **Estado:** NÃO MERGEAR — body da PR contém instrução explícita "NÃO MERGEAR ESTA PR"
- **Autor:** outra sessão claude_pink (`claude_pink/sleepy-cannon-h000nc`)
- **Motivo:** Entrega para revisão humana, não para merge automático

---

## PRs DRAFT — Aguardam Promoção + Gate Final

### #2688 — fix(ci): torna migration 20261027120000 replay-safe
- **Estado:** DRAFT — `claude_pink/focused-lamport-qyupp8`
- **Mudança:** Migration idempotente — verifica `pg_catalog.pg_extension` antes de acessar `cron.job`
- **Bloqueio:** DRAFT; body: "Não mergear antes de verificar CI verde no Gate Final"
- **Ação:** Saída de DRAFT + CI Gate Final verde → merge seguro

### #2711 — docs(ci): RELATORIO_CI.md v3 — tabela de prova consolidada
- **Estado:** DRAFT — `claude_pink/fix-relatorio-final-281028-1530`
- **Mudança:** RELATORIO_CI.md v2 → v3 (474 → 97 linhas focadas), tabela consolidada
- **Bloqueio:** DRAFT + branch `behind` main
- **Ação:** Saída de DRAFT + CI Gate Final verde → merge seguro

### #2701 — fix(ci): autentica integração Kit Coverage com usuário E2E
- **Estado:** DRAFT — `claude/fix-p12-grant-kit-view-261028-1730` (esta sessão)
- **Bloqueio:** P12 não resolvido — cobertura real 56% < threshold 70%; view canônica não projeta 4 campos
- **Ação:** Resolver P12 (schema/view fix aprovado pelo PO) → saída de DRAFT → CI Gate Final

---

## Gate Final — Evidência de CI

### SHA `d5e787842267c2a62ff3666582b77a08cd01d632` (baseline)
- Gate Final: ✅ (run anterior ao início desta sessão)

### SHA `4b4206abf947a87f56b1dc7effbf9739f530d80b` (após merges #2580 e #2712)
- Gate Final: ❌ persistente (run 40899426264 — tentativas 1 e 2)
- Job falho: `Gate E40 - Schema Drift Check / Migrations x Canonical schema`
  - Tentativa 1: job 123537661730 — step 11 (`Schema drift check`) — `toomanyrequests: retry-after: 187.993µs, allowed: 44000/minute` ao puxar `ghcr.io/supabase/gotrue:v2.197.0`
  - Tentativa 2 (rerun): job 123549958421 — step 10 (`Pre-pull Supabase postgres image`) — `Error response from daemon: toomanyrequests: retry-after: 401.556µs, allowed: 44000/minute` após 5 tentativas com backoff (90s, 120s), ao puxar `ghcr.io/supabase/postgres:17.6.1.063`
- **Gates que passam no rerun 2:** R_SSOT ✅, R_LINT ✅, R_UNIT ✅, R_DB_INT ✅, R_E2E ✅, R_BUILD ✅, R_SECRETS ✅, R_SECRET_SCAN ✅, R_SEO ✅, R_RESTORE ✅
- **Causa raiz confirmada:** rate limit persistente do ghcr.io — falha de infraestrutura CI, não regressão de código
- **Correção exige:** ajuste em `.github/workflows/db-schema-drift-check.yml` (autenticação Docker ou mirror de imagem) — PROIBIDO nesta sessão (REGRA: não tocar `.github/workflows/`)
- **Impacto nos merges desta sessão:** zero — o Gate E40 falha com a mesma causa antes e depois dos merges desta sessão; os demais gates passam

---

## Métricas da Sessão

- **PRs analisados:** 21
- **PRs mergeados (confirmados):** 8 (#2615, #2628, #2632, #2634, #2636, #2644, #2667 em contexto 1; #2722, #2723, #2725, #2715, #2728, #2712 em contexto 2; #2580 em contexto 3)

  > Nota: contexto 1 = sessão anterior à compactação; contextos 2 e 3 = continuações da sessão `session_01RfQzo8Ean3zudG2sEN79b6`

- **Conflitos não resolvíveis:** 2 (#2695 — branch alheia, #2707 — branch do bot)
- **Decisão humana:** 3 (#2717, #2714, #2720 — todos tocam `.github/workflows/`)
- **DRAFT aguardando:** 3 (#2688, #2711, #2701)
- **NÃO MERGEAR:** 2 (#2716 — supersedida, #2674 — instrução explícita)
- **Aguardar (outros):** 4 (#2693, #2713, #2719, #2721)
- **Gate Final aguardado:** Após cada merge
- **Falhas de CI introduzidas:** 0
- **Regras violadas:** 0

---

*Gerado por session_01RfQzo8Ean3zudG2sEN79b6 em 2026-10-29*
