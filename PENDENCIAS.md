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
garante via `updateParam` que defaults são removidos da URL quando o usuário altera filtros,
mas NÃO havia efeito de sync-on-mount para remover params com valor = default quando a página
é carregada com eles na URL (ex: `/orcamentos?status=all`).

**3 testes falhando:**
1. `e2e/carrinhos/list-url-state-restore.spec.ts:38` — reload preserva filtros e ordenação
2. `e2e/carrinhos/list-url-state-restore.spec.ts:60` — valores default não poluem a URL após hidratação
3. `e2e/orcamentos/list-url-state-restore.spec.ts:42` — valores default são removidos da URL após hidratação

**Fix aplicado:** `src/hooks/common/useListUrlState.ts` — adicionado `useEffect` de mount
que itera sobre `keyList` e remove params cujo valor = default via `setSearchParams`.
Commitado em `fix/alignment-fuzz-test-e128-split` (ver PR #2854).

**Status:** ✅ Fix de código aplicado e commitado. Aguarda CI verde no PR.

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

## P5 — Uptime Monitor: probe de produção falhando

**Workflow:** Uptime Monitor
**Última execução com falha:** [run/41124195036](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41124195036)
**Data:** 2026-10-30

**Erro:** "Probe site + edge function" falhou. O log indica que comentário idêntico já existe na issue #2841.

**Causa raiz:** URL de produção (Vercel/Supabase edge function) inacessível no momento do probe.
Pode ser outage temporário ou problema persistente.

**O que o PO precisa fazer:**
- Verificar a issue [#2841](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2841) para contexto do problema
- Verificar se a edge function está operacional no dashboard Supabase
- Verificar se o projeto Vercel `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` está com deploy bem-sucedido

---

## P6 — Running Copilot Code Review: GitHub Copilot API failure

**Workflow:** Running Copilot Code Review
**Última execução com falha:** [run/41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979)
**Data:** 2026-10-30

**Erro:** "Processing Request (Linux)" falhou usando modelo `sweagent-capi:gpt-6.1-sol[ReasoningEffort=high]`

**Causa raiz:** Falha na API do GitHub Copilot (serviço externo). Não é corrigível por código.

**O que o PO precisa fazer:**
- Verificar se o GitHub Copilot está ativo e autorizado no repositório
- O workflow pode ser reexecutado manualmente para verificar se foi flake

---

## P7 — E2E — Critical Flows, Personalization, Quote Builder, Replenishment: auth/infra

**Workflows afetados:**
- E2E — Critical Flows & Error Boundaries ([run/41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508))
- E2E — Personalization Flow ([run/41115240723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723))
- Quote Builder Delivery Quality ([run/41114861094](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41114861094))
- CI - Replenishment Module Quality Gate ([run/41102931819](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41102931819))

**Causa comum:** Todos os jobs E2E autenticados falham. Jobs atingem a etapa de Playwright
mas falham ao tentar autenticar ou acessar dados no Supabase.

**O que o PO precisa fazer:**
- Verificar e renovar os secrets de E2E: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`
- Confirmar que a conta de teste tem acesso ativo no Supabase `doufsxqlfjyuvxuezpln`
- Reexecutar os workflows após confirmar as credenciais

---

## Resumo de Ações Requeridas do PO

| # | Ação | Workflows impactados |
|---|------|---------------------|
| 1 | Verificar/renovar secrets E2E (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`) | P2, P7 (5 workflows) |
| 2 | Reexecutar Swatch QuickView + investigar artefatos gigantes | P3 |
| 3 | Atualizar baselines visuais se UI mudou intencionalmente | P4 |
| 4 | Verificar issue #2841 + edge function/Vercel deploy | P5 |
| 5 | Verificar GitHub Copilot API no repositório | P6 |
| 6 | Branch Protection Sentinel: próximos commits serão convencionais | P1 |
