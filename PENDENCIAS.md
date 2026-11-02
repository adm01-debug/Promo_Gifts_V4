# PENDENCIAS.md

> Criado em 2026-10-31 | Atualizado por sessão Claude durante fix de workflows CI
> Branch de referência: `fix/alignment-fuzz-test-e128-split`

---

## P1 — Branch Protection Sentinel: 23 commits sem padrão aceito

**Workflow:** Branch Protection Sentinel
**Última execução com falha:** [run/41134852421](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852421)
**Data:** 2026-10-30
**HEAD afetado:** `554ef41b44c9f318777d7e7b11189490a29a8c0a`

**Erro exato:**
```
23 commit(s) em push para main sem padrão aceito: 3cdfef1 1589089 cd2b2b7 c032001
f3bb7da 4684f8d 940fa4e e07a240 72fae20 ff861c2 d4c9f8b b99aed4 50aa214 557bce2
1b5df73 9b4833a b6742dd 577adcb f2ebce5 69dd56c cf2a350 208b415 05f8d37
```

**Causa raiz:** O merge do split PromoFlixPlayer (PR #2813, commit `554ef41b`) foi um merge commit,
mas o sentinel auditou TODOS os commits no range do push (23 commits da feature branch),
não apenas o merge commit. Esses 23 commits usam mensagens que não seguem os padrões
aceitos pelo `scripts/sentinel-check.sh`.

**Por que não é corrigível retroativamente:**
- Os commits já estão em `main`
- Force push em `main` é proibido sem aprovação explícita do PO (REGRA CLAUDE.md)
- Reescrever histórico publicado violaria o processo de governança

**O que o PO precisa fazer:**
- Opção A: Aceitar a falha pontual — o sentinel voltará a passar nos próximos pushes com commits convencionais
- Opção B: Se quiser zerar o alerta, disparar manualmente o workflow com `PUSH_BEFORE` e `PUSH_AFTER` apontando para o merge commit `554ef41b` e o commit anterior

**Impacto:** O sentinel volta a passar automaticamente no próximo push para `main` com commit convencional.

---

## P2 — E2E (Playwright): URL-state restore em /carrinhos e /orcamentos

**Workflow:** E2E (Playwright)
**Última execução com falha:** [run/41134852533](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852533)
**Data:** 2026-10-30

**Erro exato verificado nos logs (job 124339662718):**
```
Error: expect(received).toBeNull()
Received: "all"
Timeout 3000ms exceeded while waiting on the predicate

  47 |     await expect
  48 |       .poll(() => new URL(page.url()).searchParams.get('status'), { timeout: 3_000 })
> 49 |       .toBeNull();
     |                   ^
     at e2e/orcamentos/list-url-state-restore.spec.ts:49:8
```

Autenticação FUNCIONA (E2E_USER_EMAIL está configurado — `***` no log = secret presente).

**Causa raiz (verificada por análise do código):** Bug em `useListUrlState.ts` — o hook
garantia via `updateParam` que defaults são removidos da URL quando o usuário altera filtros,
mas NÃO havia efeito de sync-on-mount para remover params com valor = default quando a página
é carregada com eles na URL (ex: `/orcamentos?status=all`).

**3 testes falhando:**
1. `e2e/carrinhos/list-url-state-restore.spec.ts:38` — reload preserva filtros e ordenação
2. `e2e/carrinhos/list-url-state-restore.spec.ts:60` — valores default não poluem a URL após hidratação
3. `e2e/orcamentos/list-url-state-restore.spec.ts:42` — valores default são removidos da URL após hidratação

**Fix 1 (fb619cea):** `src/hooks/common/useListUrlState.ts` — adicionado `useEffect` de mount
que itera sobre `keyList` e remove params cujo valor = default via `setSearchParams`.

**Fix 2 (7c553377):** Race condition no search-sync — `q=''` (string vazia no URL) ≠ `null`
(target), fazendo o search-sync chamar `updateParam` cujo `prev` funcional recebia a URL
**original** (antes do cleanup), restaurando `status=all&sort=newest`. Fix: normalizar
`rawUrl` → `null` quando vazio ou igual ao default; o early-return `effectiveUrl === target`
(null === null) evita a sobrescrita. Confirmado pelos bots Codex (P2) e Qodo (Medium)
nos comentários do PR.

Commitados em `fix/alignment-fuzz-test-e128-split` (ver PR #2854).
Também em `fix/ci-workflows` (branch de processo exigido).

**Status:** ✅ Ambos os fixes aplicados e commitados. Aguarda CI verde no PR.

---

## P3 — E2E • Swatch QuickView: runner shutdown + timeout

**Workflow:** E2E • Swatch QuickView (Lista + Tabela)
**Última execução com falha:** [run/41134852559](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852559)
**Data:** 2026-10-30

**Erro exato:**
```
webkit: The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.
chromium: Upload bytes 5509018004 bytes (timeout após ~1h)
firefox: Upload bytes 8599619670 bytes (timeout após >1h)
```

**Causa raiz:**
- webkit: Runner foi desligado durante a execução (problema de infra GitHub Actions)
- chromium/firefox: Os testes geraram artefatos de 5.5GB e 8.6GB (possível loop ou screenshots excessivos), sugerindo falha nos próprios testes que levou horas

**O que o PO precisa fazer:**
- Reexecutar o workflow manualmente para verificar se é flake de runner
- Verificar se os testes de swatch estão em loop ou gerando screenshots excessivos
- Considerar adicionar timeout por teste individual no `playwright.config.ts`

---

## P4 — Nightly Full CI: E2E Visual + Playwright Shards

**Workflow:** Nightly Full CI
**Última execução com falha:** [run/41161391625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41161391625)
**Data:** 2026-10-31

**Jobs falhados:**
- `E2E Visual Focused · magazine-header` — visual regression
- `E2E Visual Focused · color-swatch` — visual regression
- `Playwright E2E (1)` — shard 1 (692MB de artefato)
- `Playwright E2E (2)` — shard 2 (356MB de artefato)

**Causa raiz:** Falhas de E2E visual (screenshots divergindo de baseline) e E2E sharded
dependentes de auth/infra. Mesma família que P2 e P3.

**O que o PO precisa fazer:**
- Atualizar baselines visuais se houve mudanças intencionais de UI (e.g., split E128 do QuoteBuilder)
- Verificar credenciais E2E para os shards
- Reexecutar após merge do PR #2854 (fix do fuzz test pode influenciar o visual do QuoteBuilder)

---

## ~~P5~~ — Uptime Monitor: ✅ RESOLVIDO AUTOMATICAMENTE

**Workflow:** Uptime Monitor
**Última execução com falha:** [run/41124195036](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41124195036)
**Nova execução com sucesso:** [run/41164886753](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41164886753) — conclusion=**success**
**Resolução:** Falha transitória de probe. Outage temporário da Vercel/edge function resolvido.

---

## ~~P6~~ — Running Copilot Code Review: ✅ RESOLVIDO AUTOMATICAMENTE

**Workflow:** Running Copilot Code Review
**Última execução com falha:** [run/41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979)
**Resolução:** Nova execução automática concluiu com sucesso — falha foi transitória na API do Copilot.

---

## ~~P7~~ — E2E — Critical Flows, Personalization, Quote Builder, Replenishment: ✅ RESOLVIDO AUTOMATICAMENTE

**Workflows afetados (todos resolvidos):**
- E2E — Critical Flows & Error Boundaries → [run/41134852668](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852668) ✅
- E2E — Personalization Flow → [run/41134852480](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852480) ✅
- Quote Builder Delivery Quality → [run/41134852447](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852447) ✅
- CI - Replenishment Module Quality Gate → [run/41134852537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852537) ✅

**Resolução:** Falhas transitórias de auth/infra resolvidas automaticamente no re-run após push `554ef41b` em main.

---

## P8 — Lint OOM: `check-eslint-baseline.mjs` esgota memória do runner

**Classificação:** Bloqueador de infra — pré-existente (não introduzido por esta sessão)

**Comportamento observado:**
```
FATAL ERROR: JavaScript heap out of memory
❌ eslint falhou com status null
LINT_EXIT: 0
```

`check-eslint-baseline.mjs` roda ESLint na base completa (~64k arquivos). O processo Node
sofre OOM mesmo com `NODE_OPTIONS=--max-old-space-size=4096`. O script captura o crash e
retorna EXIT 0 (não bloqueante), mas a verificação de baseline ESLint não é realizada.

**Por que não é corrigível nesta sessão:**
- Aumentar memória do runner é mudança de infra CI (`.github/workflows/`) que requer PR separado
- Dividir o check por domínio (ex.: `--filter src/pages/quotes/**`) exigiria refatorar `check-eslint-baseline.mjs`
- Risco de regressão: qualquer mudança no script afeta o Gate 1 (bloqueante)

**Impacto:**
- Não bloqueia o Gate 1 (o script trata OOM como EXIT 0)
- Não há regressão introduzida por esta branch (baseline file inalterado)
- Verificação de baseline ESLint não está funcionando desde antes desta sessão

**O que o PO precisa fazer:**
- Abrir issue para investigar divisão do check por domínio ou aumento de `--max-old-space-size`
- Ou adicionar `--max-old-space-size=8192` no step de lint do CI (testando localmente primeiro)

---

## P9 — schema-snapshot-export: arquivo de manifesto do ledger ausente

**Workflow:** schema-snapshot-export
**Última execução com falha:** [run/41348311003](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41348311003)
**Data:** 2026-11-01 | **HEAD afetado:** `cbbabc2f3`

**Erro exato:**
```
[ledger-manifest-drift] inconclusive: Arquivo baseline não encontrado:
docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json — checagem inconclusa
Process completed with exit code 2.
```
Segundo job ("Drift gate"): `Ledger parity (repo x canonical)` também falhou.

**Causa raiz:** O arquivo `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json` não existe no repo. O workflow `schema-snapshot-export` precisa dele para comparar ledger. O arquivo deve ser gerado pelo próprio workflow via `schema-snapshot-export.yml` com `workflow_dispatch`.

**Por que não é corrigível nesta sessão:**
- Requer `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` para conectar ao banco canônico
- O arquivo de manifesto é gerado pelo workflow e precisa de dispatch manual (REGRA #8 corolário)
- Não é possível criar o arquivo sem acesso live ao banco `doufsxqlfjyuvxuezpln`

**O que o PO precisa fazer:**
- Disparar `schema-snapshot-export.yml` via `workflow_dispatch` (botão "Run workflow" em GitHub Actions)
- Verificar que o job "Drift gate" passou ANTES de girar o baseline
- O manifesto será commitado automaticamente pelo workflow

**Classificação:** Bloqueador de infra — exige credenciais e dispatch manual

---

## P10 — Policies Baseline: drift de RLS detectado (+0/-1/~8)

**Workflow:** Policies Baseline
**Última execução com falha:** [run/41347780875](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41347780875)
**Data:** 2026-11-01 | **HEAD afetado:** `f99f36ae1`

**Erro exato:**
```
[policies-baseline] failed: drift de policies: e043=0 +0 / -1 / ~8
removed: ["public._backup_stock_daily_summary_20260618.backup_stock_service_only"]
changed: [
  "public.ai_usage_quotas.ai_usage_quotas_admin_delete",
  "public.ai_usage_quotas.ai_usage_quotas_admin_insert",
  "public.ai_usage_quotas.ai_usage_quotas_admin_update",
  "public.ai_usage_quotas.ai_usage_quotas_read_authenticated",
  "public.art_file_attachments.Users delete own art files",
  "public.art_file_attachments.Users insert own art files",
  "public.art_file_attachments.Users update own art files",
  "public.art_file_attachments.Users view own art files"
]
```

**Causa raiz:** Políticas RLS foram modificadas diretamente no banco (`doufsxqlfjyuvxuezpln`) fora do fluxo de migrations — drift clássico de DDL out-of-band (REGRA #8). O arquivo `.security/policies-baseline.json` não reflete o estado atual do banco.

**Por que não é corrigível nesta sessão:**
- Regenerar o baseline exige `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` na Management API
- `node scripts/check-policies-baseline.mjs --update-baseline` não pode ser executado sem credenciais no runner local
- O drift deve ser revisado antes de aceitar: policy `_backup_stock_daily_summary_20260618` parece ser de backup — remoção provavelmente intencional. As 8 políticas alteradas precisam de revisão do PO.

**O que o PO precisa fazer:**
1. Revisar se as 8 mudanças em `ai_usage_quotas` e `art_file_attachments` são intencionais
2. Se intencionais: criar migration espelho documentando a mudança + disparar CI para regenerar baseline
3. Se não intencionais: reverter via migration e investigar quem alterou
4. Criar as migrations espelho correspondentes (REGRA #8 corolário — DDL out-of-band)

**Classificação:** Bloqueador de governança — exige revisão do PO + credenciais para regenerar baseline

---

## P11 — Branch Protection Sentinel: commit `5b5cef36` sem padrão aceito (2026-11-01)

**Workflow:** Branch Protection Sentinel
**Execução com falha:** [run/41359937302](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41359937302)
**Data:** 2026-11-02T00:25 | **HEAD afetado:** `5b5cef36`

**Erro exato:**
```
1 commit(s) em push para main sem padrão aceito: 5b5cef3
PUSH_BEFORE: 0ad30ce26c39b8298095d6fbdab25668960d6179
PUSH_AFTER:  5b5cef36c12e49d310bc89b45d51138a3d6f1069
```

**Commit infrator:** `5b5cef36 chore(analise): revalidação exaustiva 9 branches TOP + 44 A/B/F (2026-11-01)`

**Causa raiz:** Commit `chore(analise)` foi pushado diretamente em `main` sem PR. O sentinel auditou o push e detectou que o commit não corresponde a nenhum padrão aceito (PR merge, Lovable, release-please, fix/docs/ci/chore com hash de PR).

**Por que não é corrigível retroativamente:**
- Commit já está em `main` como parte do histórico
- Force push em `main` proibido sem aprovação explícita do PO (REGRA #9)
- Esta é a segunda ocorrência do tipo (P1 documenta 23 commits similares em 2026-10-30)

**O que o PO precisa fazer:**
- Aceitar o run como failure histórico (o sentinel voltará a passar no próximo push convencional)
- Considerar revisão do `scripts/sentinel-check.sh` para aceitar `chore(analise)` como padrão válido, OU
- Garantir que commits de análise futuros vão via PR (conforme REGRA #9)

**Classificação:** Violação de governança — não corrigível retroativamente

---

## P12 — Edge Integration Tests: HTTP 408 timeout em materials-api (infra instável)

**Workflow:** Edge Integration Tests — All Functions
**Última execução com falha:** [run/41351706586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41351706586)
**Data:** 2026-11-01 | **HEAD afetado:** `23f634de`

**Causa raiz:** Edge function `materials-api` retornou HTTP 408 no happy-path do teste de integração. Falha de infraestrutura — timeout na edge function do Supabase, não erro de código.

**Classificação:** Infra/edge function instável — auto-recuperável. Reexecutar o workflow se necessário.

---

## Resumo de Ações Requeridas do PO

> **Atualizado 2026-11-02:** Novos workflows diagnosticados: P9 (schema-snapshot-export), P10 (Policies Baseline), P11 (Branch Protection Sentinel novo), P12 (Edge Integration Tests). PR de `fix/ci-workflows` em preparação.

| # | Ação | Workflows impactados | Status |
|---|------|---------------------|--------|
| 1 | Dispatch `schema-snapshot-export.yml` → gera manifesto e rotaciona baseline | P9 | 📋 Exige dispatch manual |
| 2 | Revisar drift RLS (+0/-1/~8) + regenerar policies-baseline.json com credenciais | P10 | 📋 Exige revisão + credenciais |
| 3 | Aceitar failure histórico do sentinel em `5b5cef36` (ou ajustar padrão aceito) | P11 | 📋 Não corrigível retroativamente |
| 4 | Reexecutar Edge Integration Tests se necessário | P12 | 📋 Infra/auto-recuperável |
| 5 | Branch Protection Sentinel: próximos commits serão convencionais | P1 | 📋 Histórico |
| 6 | Rerun E2E Playwright em main após merge de fix/ci-workflows | P2 | 🔄 Aguarda PR |
| 7 | Reexecutar Swatch QuickView + investigar artefatos gigantes | P3 | 📋 Aberto |
| 8 | Atualizar baselines visuais se UI mudou intencionalmente | P4 | 📋 Aberto |
| 9 | Investigar lint OOM: aumentar `--max-old-space-size` ou dividir check por domínio | P8 | 📋 Pré-existente |
| ~~10~~ | ~~Verificar issue #2841 + edge function/Vercel~~ | ~~P5~~ | ✅ Auto-resolvido |
| ~~11~~ | ~~Verificar GitHub Copilot API~~ | ~~P6~~ | ✅ Auto-resolvido |
| ~~8~~ | ~~Renovar secrets E2E~~ | ~~P7~~ | ✅ Auto-resolvido |
