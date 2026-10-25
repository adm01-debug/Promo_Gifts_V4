# Pendências CI — Bloqueios Externos

**Atualizado em:** 2026-10-25 (rev 13 — P-AUDIT/P-SMOKE/P-VIS/P-EF2 adicionados; P-EF2 = Edge Functions · Freight CI)

Este arquivo documenta pendências de CI que **requerem ação externa** (secrets, permissões, billing, configuração de infra) ou que são **falhas pré-existentes** não causadas por este PR. Itens marcados com `[PO]` requerem ação do Product Owner.

---

## Como usar este arquivo

- Cada seção `## P-NNN` documenta uma pendência específica
- `[PO]` = requer ação do PO (não Claude)
- `[PRÉ-EXISTENTE]` = falha presente antes deste PR (não regressão)
- `[TRANSIENTE]` = falha que se resolve automaticamente ou já foi resolvida

---

## Índice

| Código | Workflow/Check | Status | Requer |
|---|---|---|---|
| P1 | release-please | ❌ bloqueado | [PO] RELEASE_PLEASE_TOKEN |
| P2 | E2E Personalization Journey (geral) | ❌ falha | [PRÉ-EXISTENTE] dados CI |
| P2c | E2E Personalization Journey (chromium) | ❌ falha | [PRÉ-EXISTENTE] dados CI |
| P3 | Visual regression baselines | ⚠️ advisory | baselines desatualizados |
| P4 | CodeQL | ✅ resolvido | — |
| P5 | Dependabot | ✅ N/A | — |
| P6 | Stale bot | ✅ N/A | — |
| P7 | Branch protection sentinel | ✅ OK | — |
| P8 | release-please (PAT scopes) | ❌ bloqueado | [PO] PAT com `workflow` scope |
| P9 | Vercel deploy (ghost project) | ⚠️ builds duplos | [PO] P-V1 |
| P10 | npm audit | ✅ resolvido | — |
| P11 | Gate 1.7 TSC ratchet | ✅ resolvido | — |
| P12 | E2E swatch→QV | ❌ falha | [PRÉ-EXISTENTE] dados CI |
| P13 | E2E freight flow | ✅ resolvido | — |
| P14 | Gate 1.9 tech debt ratchet | ✅ resolvido | — |
| P15 | Gate 1.9.2 boundary cross-domain | ✅ resolvido | — |
| P16 | Gate 1.13 RLS baseline | ✅ resolvido | — |
| P17 | Gate 1.18 conflicts ledger | ✅ resolvido | — |
| P18 | Edge Functions drift check | ❌ falha | P-EF1 |
| P19 | Edge Functions Integration All | ❌ falha | fix Zod v4 UUID aplicado neste PR |
| P20 | Edge Functions Integration All (Zod v4) | ❌ falha | fix aplicado neste PR (em CI) |
| P-AUDIT | Gate 0.5 npm audit (transiente) | ✅ resolvido em main@8855a573 | — |
| P-SMOKE | Gate 3 E2E Smoke (transiente) | ✅ resolvido em main@8855a573 | — |
| P-VIS | chromium • swatch→QV | ❌ falha | [PRÉ-EXISTENTE] duplica P12 |
| P-EF1 | Edge Functions drift check | ❌ falha | [PRÉ-EXISTENTE] ver P-EF1 |
| P-EF2 | Edge Functions · Freight CI | ❌ falha | investigação pendente |
| P-V1 | Vercel ghost project | ⚠️ | [PO] exclusão manual |
| P-NPM1 | npm install local | ⚠️ | [PRÉ-EXISTENTE] registry 403 local |

---

## P1 — release-please: PAT sem permissão para criar releases

**Data detectado:** 2026-06-11  
**Workflow:** `.github/workflows/release-please.yml`  
**Categoria:** [PO] Requer ação do Product Owner

**Diagnóstico:** O workflow `release-please` falha com erro de autenticação ao tentar criar releases. O PAT configurado no secret `RELEASE_PLEASE_TOKEN` não tem o scope `workflow` necessário para criar e atualizar releases no GitHub.

**Ação necessária:** [PO] Regenerar o PAT com scopes `contents: write` e `workflow` e atualizar o secret `RELEASE_PLEASE_TOKEN` no repositório.

---

## P2 — E2E Personalization Journey: dados insuficientes no CI DB

**Data detectado:** 2026-06-15 (pré-existente)  
**Workflow:** `E2E — Personalization Journey`  
**Categoria:** [PRÉ-EXISTENTE] Falha por dados de teste

**Diagnóstico:** O teste E2E de "Personalization Journey" falha porque o banco de CI não tem dados suficientes de personalização para completar o fluxo. O problema é na seed de dados de teste, não no código.

**Ação necessária:** Adicionar seed de dados de personalização no banco de CI (fora do escopo deste PR).

---

## P2c — E2E Personalization Journey (chromium shard)

Duplica P2. Mesmo diagnóstico, mesmo remédio.

---

## P3 — Visual regression baselines desatualizados

**Data detectado:** 2026-07-01  
**Workflow:** Visual regression checks  
**Categoria:** Advisory (não bloqueante)

**Diagnóstico:** Baselines visuais desatualizados após mudanças de UI. Requer atualização manual dos screenshots baseline.

---

## P4 — CodeQL (resolvido)

**Status:** ✅ Resolvido. CodeQL roda normalmente.

---

## P8 — release-please: PAT sem scope `workflow`

**Duplica P1.** Ver P1 para diagnóstico completo.

---

## P12 — E2E swatch→QuickView: dados insuficientes

**Data detectado:** 2026-07-10 (pré-existente)  
**Workflow:** `E2E • Swatch QuickView (Lista + Tabela)`  
**Categoria:** [PRÉ-EXISTENTE]

**Diagnóstico:** Fluxo swatch → QuickView falha por dados de produtos com swatches insuficientes no CI DB (padrão [E108]).

**Ação necessária:** Seed de produtos com swatches válidos no banco de CI.

---

## P18 — Edge Functions drift check: P-EF1

Ver seção P-EF1 abaixo.

---

## P19 — Edge Functions Integration All (status em 2026-10-25)

**Data detectado:** 2026-10-15  
**Workflow:** `Edge Functions · Integration All`  
**Categoria:** Fix aplicado neste PR (Zod v4 UUID)

**Diagnóstico:** UUIDs de teste inválidos causavam falha na validação Zod v4. Fix aplicado: substituídos por UUIDs v4 válidos.

**Status atual:** Fix aplicado em commit anterior deste PR. Aguardando confirmação de CI verde após fix do baseline Gate 1.3.

---

## P20 — Edge Functions Integration All (Zod v4 UUID)

Duplica P19. Ver P19.

---

## P-V1 — Vercel: projeto fantasma causa builds duplos

**Data detectado:** 2026-09-15 (incidente documentado em CLAUDE.md REGRA #11)  
**Workflow:** Vercel deploy  
**Categoria:** [PO] Requer ação do Product Owner

**Diagnóstico:** Existe um projeto Vercel fantasma `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) conectado ao mesmo repo GitHub. Isso causa 2× builds em todo push — um para o projeto canônico (`prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ`) e outro para o fantasma.

**Sintoma:** Todo push ao repo dispara dois builds Vercel. O projeto fantasma pode causar `Resource provisioning failed` em alguns casos.

**Ação necessária:** [PO] Acessar o dashboard Vercel, localizar o projeto `promo-gifts-reconciliation-integrity-20260915` e excluí-lo. Verificar que apenas `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` permanece conectado ao repo.

---

## P-NPM1 — npm install local: registry Lovable retorna 403

**Data detectado:** 2026-10-24 (confirmado nesta sessão)  
**Categoria:** [PRÉ-EXISTENTE] Limitação de ambiente

**Diagnóstico:** O registry npm privado do Lovable (`europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`) retorna 403 quando acessado do container Claude Code. Isso impede `npm ci` / `npm install` localmente.

**Impacto:** Impossível rodar build/lint/typecheck/testes localmente neste ambiente. Todo `check local` precisa ser feito via CI remoto (GitHub Actions runners têm acesso ao registry).

**Ação necessária:** Nenhuma ação do PO necessária para CI. Para desenvolvimento local, usar máquina com credenciais Lovable ou aguardar CI remoto.

**Evidência:** Tentativa de `npm ci` no container retorna:
```
npm error code E403
npm error 403 403 Forbidden - GET https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...
```

---

## P-EF1 — Edge Functions drift check: falha no job de comparação GitHub × Canonical

**Data detectado:** 2026-10-20  
**Workflow:** Edge functions drift check (Compare GitHub × Canonical)  
**Categoria:** [PRÉ-EXISTENTE]

**Diagnóstico:** O job de comparação entre edge functions no GitHub e no projeto Supabase canônico detecta divergências. Algumas edge functions foram deployadas via MCP/dashboard diretamente sem passar pelo workflow `deploy-edge-functions.yml`, criando drift.

**Ação necessária:** Reconciliar as edge functions divergentes via workflow `deploy-edge-functions.yml` (caminho único autorizado por CLAUDE.md REGRA #8).

---

## P-AUDIT — Gate 0.5 npm audit: falha transiente (resolvida)

**Data detectado:** 2026-10-24 (check run na branch `claude_05/nifty-sagan-r23gqh` ao commit `ac7920bc`)  
**Workflow:** `npm audit` — Gate 0.5  
**Run de referência:** [#40133509982](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40133509982)  
**Categoria:** [TRANSIENTE] — Resolvida em main@8855a573

**Diagnóstico:** Gate 0.5 (`npm audit --audit-level high`) falhou de forma transiente na branch. A falha foi detectada em main e corrigida no commit `8855a573` com bump de dependência que removeu a CVE. A falha não é causada por este PR.

**Ação necessária:** Nenhuma — resolvida em main. Será incorporada ao merge deste PR.

---

## P-SMOKE — Gate 3 E2E Smoke: falha transiente (resolvida)

**Data detectado:** 2026-10-24 (check run na branch `claude_05/nifty-sagan-r23gqh` ao commit `ac7920bc`)  
**Workflow:** `E2E Smoke (fail-fast)` — Gate 3  
**Run de referência:** [#40133509982](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40133509982)  
**Categoria:** [TRANSIENTE] — Resolvida em main@8855a573

**Diagnóstico:** Gate 3 E2E Smoke falhou de forma transiente. Resolvido em main@8855a573 (fix de infraestrutura de CI). A falha não é causada por este PR.

**Ação necessária:** Nenhuma — resolvida em main. Será incorporada ao merge deste PR.

---

## P-VIS — Check run "chromium • swatch→QV": falha visual registrada em ac7920bc

**Data detectado:** 2026-10-24 (check run na branch `claude_05/nifty-sagan-r23gqh` ao commit `ac7920bc`)  
**Workflow:** `E2E • Swatch QuickView (Lista + Tabela)` — shard `chromium`  
**Run de referência:** [#40133509982](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40133509982) (main@última falha)  
**Categoria:** Pré-existente — duplica P12

**Diagnóstico:** Check run `chromium • swatch→QV` é um shard do workflow `E2E • Swatch QuickView (Lista + Tabela)`, já documentado como P12. A falha é idêntica: fluxo swatch → QuickView falha por dados de produtos com swatches insuficientes no CI DB (padrão [E108]).

**Ação necessária:** Mesma que P12 — seed de produtos com swatches válidos no banco de CI.

---

## P-EF2 — Edge Functions · Freight CI: falha em CI na branch claude_05/nifty-sagan-r23gqh

**Data detectado:** 2026-10-24 (commit `ac7920bc`, check run na PR #2435)  
**Workflow:** `Edge Functions · Freight CI` — job de integração de edge functions para fluxo de frete  
**Run de referência:** Deploy Gates run [#40133509982](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40133509982)  
**Categoria:** Investigação pendente — pode ser pré-existente ou relacionado ao fix Zod v4 UUID (P20)

**Diagnóstico:** O check run `Edge Functions · Freight CI` falhou no CI ao mesmo tempo que `Edge Functions · Integration All` (P20). O fix de P20 (substituição de UUIDs de teste por UUIDs v4 válidos) pode também resolver esta falha, pois ambos testam edge functions com UUIDs. Precisa de confirmação via CI após o fix de P20.

**Estado atual:** Aguardando resultado de CI no commit atual para confirmar se é resolvido pelo fix de P20 ou se requer investigação adicional.

**Ação necessária:** Aguardar CI verde na PR #2435 após fix de P20. Se `Edge Functions · Freight CI` ainda falhar, investigar os logs do job para identificar causa raiz específica ao fluxo de frete.
