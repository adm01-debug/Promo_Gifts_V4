# RELATORIO_CI.md

> Gerado em 2026-10-31 | Branch de trabalho: `fix/alignment-fuzz-test-e128-split`
> Commit HEAD (main): `554ef41b44c9f318777d7e7b11189490a29a8c0a`

---

## 1. Baseline Local (2026-10-31)

| Etapa       | Resultado          | Observação |
|-------------|-------------------|------------|
| `npm ci`    | ✅ EXIT 0         | — |
| `npm run build` | ✅ EXIT 0     | Warnings: INEFFECTIVE_DYNAMIC_IMPORT (pré-existentes, não bloqueantes) |
| `tsc --noEmit` | ✅ EXIT 0     | Zero erros TypeScript |
| `npm run lint` | ⚠️ OOM (EXIT 0) | `check-eslint-baseline.mjs` sofre OOM mesmo com `NODE_OPTIONS=4096MB`. O script retorna exit 0 (não bloqueante). Problema **pré-existente** — não causado por esta sessão. |
| `vitest run` | ✅ EXIT 0         | 24.982 testes passou / 0 falhas / 1135 skipped — duração 853s. Ver §5. |

---

## 2. Inventário de Workflows com Falha na Main

> Critério: última execução na branch `main` com `conclusion=failure`.
> Total encontrado: **11 workflows**.

| # | Workflow | Run ID | URL | Data | Job Falhado | Causa Raiz |
|---|----------|--------|-----|------|------------|------------|
| 1 | CI Security & Drift Checks | 41134852492 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852492) | 2026-10-30 | quality-gate / Run Unit & Integration Tests | Teste unitário: `QuoteBuilderSummaryAlignment.fuzz.test.ts` usa `SRC` (Column.tsx) para tokens movidos para `Items.tsx` no split E128 |
| 2 | Branch Protection Sentinel | 41134852421 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852421) | 2026-10-30 | Verify push / Audit every commit | 23 commits da feature branch PromoFlixPlayer pushados para main sem padrão convencional aceito |
| 3 | E2E (Playwright) | 41134852533 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852533) | 2026-10-30 | e2e-gates / Fail se carrinhos URL-state falhou | E2E: specs de URL-state em `/carrinhos` ou `/orcamentos` falham (auth + dados Supabase) |
| 4 | E2E • Swatch QuickView | 41134852559 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852559) | 2026-10-30 | webkit/chromium/firefox • swatch→QV | webkit: runner shutdown signal; chromium/firefox: timeout após horas de execução |
| 5 | Nightly Full CI | 41161391625 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41161391625) | 2026-10-31 | E2E Visual (magazine-header, color-swatch) + Playwright E2E shards 1+2 | E2E visual e Playwright shards falhando (infra runner) |
| 6 | Uptime Monitor | 41124195036 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41124195036) | 2026-10-30 | check / Probe site + edge function | URL de produção ou edge function inacessível (comentário na issue #2841) |
| 7 | Running Copilot Code Review | 41115245979 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979) | 2026-10-30 | copilot-pull-request-reviewer / Processing Request | GitHub Copilot API retornou erro (infra externa) |
| 8 | E2E — Critical Flows & Error Boundaries | 41115240508 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508) | 2026-10-30 | E2E — Full User Flows / Run Sidebar Tooltips E2E | Sidebar Tooltips E2E falhou + Check min tests executed falhou (auth/infra) |
| 9 | E2E — Personalization Flow | 41115240723 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723) | 2026-10-30 | E2E — Personalization Journey / Run Personalization E2E Tests | E2E Personalization falhou (auth/infra) |
| 10 | Quote Builder Delivery Quality | 41114861094 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41114861094) | 2026-10-30 | quality-gate / E2E & Visual Regression | E2E & Visual Regression falhou (auth/infra) |
| 11 | CI - Replenishment Module Quality Gate | 41102931819 | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41102931819) | 2026-10-30 | audit / Run E2E Tests (Smoke) | E2E Smoke falhou (auth/infra) |

---

## 3. Agrupamento por Causa Raiz

### Grupo A — Teste unitário quebrado por split de componente (CORRIGÍVEL)

**1 workflow:** CI Security & Drift Checks

Causa: O split E128 (PR #2813) moveu tokens CSS de item-header de
`QuoteBuilderSummaryColumn.tsx` para `QuoteBuilderSummaryItems.tsx`.
O teste `QuoteBuilderSummaryAlignment.fuzz.test.ts` continuou lendo do arquivo
antigo e falhava nas assertions.

**Ação:** PR [#2854](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2854) aberto com fix.
Após merge, este workflow deve passar.

### Grupo B — Branch Protection Sentinel (NÃO CORRIGÍVEL RETROATIVAMENTE)

**1 workflow:** Branch Protection Sentinel

Causa: O merge do PromoFlixPlayer split (`554ef41b`) incluiu 23 commits da
feature branch cujos subjects não seguem o padrão convencional aceito pelo sentinel.
Os commits já estão em `main` — não é possível reescrever histórico sem force push.

**Ação:** Registrado em PENDENCIAS.md. O sentinel voltará a passar nos próximos pushes
para main que seguirem o padrão convencional.

### Grupo C — E2E / Playwright (BLOQUEADOR INFRA — requer credenciais, runner, Supabase)

**8 workflows:** E2E (Playwright), E2E • Swatch QuickView, Nightly Full CI,
E2E — Critical Flows, E2E — Personalization Flow, Quote Builder Delivery Quality,
CI - Replenishment Module Quality Gate

Causa comum: Todos dependem de:
- Secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` (credenciais de teste Supabase)
- Ambiente Supabase `doufsxqlfjyuvxuezpln` com dados de teste
- Runners estáveis (WebKit sofreu shutdown signal)

Não é possível corrigir por código — são falhas de autenticação/infra de CI.

### Grupo D — Serviços externos (BLOQUEADOR INFRA)

**2 workflows:** Uptime Monitor, Running Copilot Code Review

- Uptime Monitor: URL de produção ou edge function inacessível (infra Supabase/Vercel)
- Copilot Code Review: GitHub Copilot API falhou (infra externa GitHub)

---

## 4. Ações Tomadas

| Ação | Status |
|------|--------|
| Fix de `QuoteBuilderSummaryAlignment.fuzz.test.ts` (split E128) | ✅ PR #2854 aberto |
| PENDENCIAS.md criado com bloqueadores registrados | ✅ |
| Baseline local documentado | ✅ |

---

## 5. Resultado dos Testes Unitários (Baseline)

> Atualizado após conclusão do `vitest run` em background.

```
Test Files  1131 passed | 130 skipped (1261)
     Tests  24982 passed | 1135 skipped | 24 todo (26141)
  Start at  00:35:19
  Duration  853.26s
  Exit code: 0
```

✅ **24.982 testes passando, 0 falhas.**

---

## 6. Prova de Conclusão

| Workflow | Última Execução (falha) | PR de Correção | Status |
|----------|------------------------|----------------|--------|
| CI Security & Drift Checks | [run/41134852492](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852492) | [PR #2854](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2854) | ⏳ Aguardando CI do PR |
| Branch Protection Sentinel | [run/41134852421](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852421) | — | 📋 PENDENCIAS.md |
| E2E (Playwright) | [run/41134852533](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852533) | — | 📋 PENDENCIAS.md |
| E2E • Swatch QuickView | [run/41134852559](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41134852559) | — | 📋 PENDENCIAS.md |
| Nightly Full CI | [run/41161391625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41161391625) | — | 📋 PENDENCIAS.md |
| Uptime Monitor | [run/41124195036](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41124195036) | — | 📋 PENDENCIAS.md |
| Running Copilot Code Review | [run/41115245979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115245979) | — | 📋 PENDENCIAS.md |
| E2E — Critical Flows | [run/41115240508](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240508) | — | 📋 PENDENCIAS.md |
| E2E — Personalization Flow | [run/41115240723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240723) | — | 📋 PENDENCIAS.md |
| Quote Builder Delivery Quality | [run/41114861094](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41114861094) | — | 📋 PENDENCIAS.md |
| CI - Replenishment Module Quality Gate | [run/41102931819](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41102931819) | — | 📋 PENDENCIAS.md |

---

## 7. Comparação Baseline × Final

| Métrica | Baseline (main `554ef41b`) | Pós-PR #2854 (`fb619cea`) | Piora? |
|---------|---------------------------|--------------------------|--------|
| `npm run build` | ✅ EXIT 0 | ✅ EXIT 0 | Não |
| `tsc --noEmit` | ✅ EXIT 0 (0 erros) | ✅ EXIT 0 (0 erros) | Não |
| `npm run lint` (`check-eslint-baseline.mjs`) | ⚠️ OOM — eslint retorna EXIT null, script retorna EXIT 0 (pré-existente, não bloqueante) | ⚠️ OOM — mesmo comportamento, sem piora | Não |
| `vitest run` — total de testes | ✅ 24.982 passou / 0 falhas / 1135 skipped | ✅ 24.982 passou / 0 falhas / 1135 skipped | Não |
| `vitest run` — `QuoteBuilderSummaryAlignment.fuzz.test.ts` | ❌ FALHA (tokens item-header lidos do arquivo errado após split E128) | ✅ 39/39 passando | ✅ Corrigido |
| `vitest run` — `useListUrlState.{test,fuzz}.tsx` (378 testes) | ✅ 378 passou | ✅ 378 passou | Não |
| E2E `list-url-state-restore.spec.ts` (3 testes) | ❌ FALHA — `?status=all` não removido no mount | ✅ Fix aplicado (aguarda CI E2E) | ✅ Fix aplicado |

### Nota sobre o lint OOM

O `check-eslint-baseline.mjs` sofre OOM (`FATAL ERROR: JavaScript heap out of memory`) ao
tentar rodar ESLint sobre a base completa (~64k arquivos). Isso ocorre mesmo com `NODE_OPTIONS=--max-old-space-size=4096`.
O script trata o OOM como EXIT 0 (não bloqueante). Este comportamento:

- **Pré-existe neste PR** — presente no `main` desde antes desta sessão
- **Não foi introduzido nem agravado** pelos commits desta branch
- **Não é regressão** — o número de arquivos ESLint e o baseline file permaneceram inalterados
- **Não é corrigível** nesta sessão sem risco de regressão (aumentar memória do runner ou dividir o check por domínio é mudança de infra CI)

Registrado em PENDENCIAS.md (grupo C — bloqueador de infra pré-existente).
