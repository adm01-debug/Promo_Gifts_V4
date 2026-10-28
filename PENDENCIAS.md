# PENDENCIAS.md -- Workflows com bloqueio externo
> Atualizado: 2026-10-28 | Branch: claude_pink/focused-lamport-qyupp8

## Sumario de status

| # | Workflow | Causa raiz | Quem resolve |
|---|---|---|---|
| P1 | Edge Function Drift (106 funcoes) | Deploy de edge functions nunca rodou | PO: dispatch deploy-edge-functions.yml |
| P6 | E2E auth redirect (Critical Flows, Nightly, Quote Builder) | loginViaUI timeout em CI | PO: verificar secrets E2E |
| P10 | E2E /reposicao (Replenishment) | Mesma causa do P6 | PO: mesma acao do P6 |
| P15 | R_SCHEMA_DRIFT: 647 remote_only -- **BLOQUEADOR DIRETO** | Migrations aplicadas fora do fluxo | PO: dispatch schema-snapshot-export.yml ANTES do merge |
| P17 | Kit Coverage: permission denied | GRANT SELECT faltando para anon | PO: migration DDL via PR |
| P18 | Nightly: visual regression color-swatch/magazine-header | Baselines desatualizados | PO: re-gerar baselines |
| P19 | Nightly: E2E Visual sem VITE_SUPABASE_URL/KEY | Variaveis ausentes nos jobs | PO: adicionar env: block |
| P20 | Uptime Monitor: health-check 4xx/5xx | Funcao nao deployada | PO: dispatch deploy-edge-functions.yml |
| P21 | Vercel phantom project double build | vercel link rodado fora do raiz | PO: deletar prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok |
| P22 | Branch Protection Sentinel | Commit historico direto em main | Historico -- nao corrigivel |
| P23 | E2E Swatch QuickView webkit/chromium/firefox | Pre-existing flakes + timeout | Investigacao separada |

---

## P6 -- E2E: Autenticacao redireciona para /login em vez de continuar
**Workflows afetados:** E2E Critical Flows, Nightly Full CI (shards 1 e 2), Quote Builder Delivery Quality  
**Evidencia (Nightly, run 40622763252):**
```
[loginViaUI] Timeout aguardando redirect pos-login.
  URL atual: http://localhost:8080/login
```
**Acao PO:** Verificar secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` estao configurados nos environments de CI e se a conta Supabase Auth tem login habilitado para CI.

---

## P10 -- E2E: /reposicao redireciona (auth expirada)
**Workflow:** CI - Replenishment Module Quality Gate (run 40622370786, sha 62af0798)  
**Causa:** Pagina `/reposicao` exige auth; em CI, auth nao chega ao ponto do teste.  
**Acao PO:** Mesma do P6.

---

## P15 -- Drift R_SCHEMA_DRIFT: 647 migrations remote_only -- BLOQUEADOR DIRETO DO DEPLOY GATES
**Workflow:** Deploy Gates (Gate Final / R_SCHEMA_DRIFT)  
**Evidencia:** Run [40633601828](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40633601828) -- step "Ledger parity (repo x canonical)":
```
[migration-ledger][bloqueado] local_only=1108; remote_only=647; mismatched=0; malformed=0
```
**Causa:** 647 migrations aplicadas em producao que NAO tem arquivo em `supabase/migrations/`. O check de ledger parity bloqueia com exit 1 -> R_SCHEMA_DRIFT=failure -> Deploy Gates falha.  
**Fix aplicado nesta sessao:** Migration `20261027120000` corrigida para ser replay-safe (RAISE NOTICE em vez de RAISE EXCEPTION quando pg_cron nao instalado). Isso evita falha no *replay* da baseline, mas **nao elimina o remote_only=647**.  
**Acao PO -- NECESSARIA ANTES DO MERGE (unblocks Deploy Gates):**
1. Dispatch `schema-snapshot-export.yml` -> `force_rotate: true`
2. Isso cria novo baseline a partir do estado atual de producao, zerando `remote_only`
3. Apos o dispatch, rerun do Deploy Gates neste PR -> deve passar
4. So entao fazer merge

---

## P17 -- Kit Coverage: permission denied (product_kit_components / v_kit_component_complete)
**Workflow:** Kit Coverage -- Integration (run 40628415319, sha 62af0798)  
**Evidencia:**
```
Unknown Error: permission denied for table product_kit_components
Unknown Error: permission denied for view v_kit_component_complete
```
**Causa:** Role `anon` nao tem GRANT SELECT. DDL via execute_sql proibido em sessao de agente (REGRA #8 corolario E056).  
**Acao PO:** Criar migration com:
```sql
GRANT SELECT ON TABLE product_kit_components TO anon;
GRANT SELECT ON VIEW v_kit_component_complete TO anon;
```
Via PR seguindo o fluxo `db-apply-migration.yml`.

---

## P18 -- Nightly Full CI: visual regression (color-swatch, magazine-header)
**Workflow:** Nightly Full CI (run 40622763252)  
**Causa:** Testes visuais E2E falham -- baselines desatualizados apos mudancas de UI pelo Lovable.  
**Acao PO:** Re-gerar baselines de color-swatch e magazine-header apos estabilizar auth (P6).

---

## P19 -- Nightly Full CI: E2E Visual Focused sem VITE_SUPABASE_URL/KEY
**Workflow:** Nightly Full CI -- job E2E Visual Focused  
**Acao PO:** Verificar se jobs `E2E Visual Focused` em `nightly-full.yml` tem `env:` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## P20 -- Uptime Monitor: health-check edge function retorna erro HTTP
**Workflow:** Uptime Monitor  
**Acao PO:** Dispatch `deploy-edge-functions.yml` -> `function_name: health-check`.

---

## P21 -- Vercel: projeto fantasma causa double build
**Causa:** Projeto `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) criado por agente que rodou `vercel link` fora do raiz (REGRA #11). Gera 2x builds em todo push.  
**Acao PO:** Acessar painel Vercel -> deletar projeto `promo-gifts-reconciliation-integrity-20260915`.

---

## P1 -- Edge Function Drift (106 funcoes divergentes)
**Causa:** 106 edge functions diferem entre GitHub (codigo) e producao (deployada).  
**Acao PO:** Dispatch `deploy-edge-functions.yml` -> `function_name: ""` (deploy all) para sincronizar.

---

## P22 -- Branch Protection Sentinel: commit direto em main
**Workflow:** Branch Protection Sentinel (push em 04239fdd)  
**Status:** Historico -- nao e possivel retroativamente corrigir. Nao afeta merges futuros que seguirem o fluxo normal de PR.

---

## P23 -- E2E Swatch QuickView: webkit cancelado + falhas chromium/firefox
**Workflow:** E2E -- Color Swatch QuickView  
**Status:** Pre-existing -- requer investigacao separada de testes especificos e baselines.

---

## Correcoes aplicadas nesta sessao

| Arquivo | Correcao | Impacto |
|---|---|---|
| `supabase/migrations/20261027120000_fix_connections_auto_test_cron_secret.sql` | Migration tornada replay-safe: RAISE NOTICE em vez de RAISE EXCEPTION quando pg_cron nao instalado ou cron job nao existe | Evita falha no replay da baseline apos nova baseline ser gerada (P15 dispatch) |
