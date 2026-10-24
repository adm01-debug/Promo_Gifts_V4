# Pendências CI — Bloqueios Externos

**Atualizado em:** 2026-10-24  
**Branch de referência:** `claude_05/upbeat-hamilton-5gnz50`  
**Commit de referência (main):** `269ec66b1500d45a5b655613ca2e8a1ea2876027`

---

## P1 — Release Please: "Resource not accessible by integration"

**Workflow:** `.github/workflows/release-please.yml`  
**Run:** [#40097995569](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995569)  
**Conclusão:** `failure`  
**Categoria:** Restrição de permissão — PAT ausente (não corrigível via YAML)

**Erro exato:**
```
release-please failed: Resource not accessible by integration
https://docs.github.com/rest/releases/releases#create-a-release
```

**Causa raiz:**  
O `release-please-action` tenta criar a release via `POST /repos/{owner}/{repo}/releases`. O `GITHUB_TOKEN` padrão de Actions não tem permissão para criar releases quando "Allow GitHub Actions to create and approve pull requests" está desativado na organização, ou o token não tem escopo `contents: write` efetivo para releases.

**Ação necessária pelo PO:**
1. Criar PAT clássico com escopos `repo` e `workflow`
2. Adicionar como segredo `RELEASE_PLEASE_TOKEN` em Settings → Secrets → Actions
3. **Ou** habilitar em Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"

**Impacto no negócio:** Releases e CHANGELOGs não são gerados automaticamente. Versões precisam ser criadas manualmente.

---

## P2 — E2E Playwright: header sticky, cart invariants, personalization

### P2a — E2E (Playwright): header sticky

**Workflow:** (provavelmente `e2e-smoke.yml` ou similar)  
**Run:** [#40097995631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995631)  
**Conclusão:** `failure`  
**Job:** `e2e-gates` → step `🛑 Fail-fast se header sticky falhou`

**Erro exato no log:**
```
1 error was not a part of any test, see above for details
##[error] O Header global deixou de ser sticky em alguma rota/viewport.
Spec: e2e/flows/22-header-sticky.spec.ts.
Causa raiz típica: 'overflow' / 'transform' / 'filter' em ancestral do <header>
em src/components/layout/MainLayout.tsx criando scroll container indevido.
```

**Status da causa hipotética inicial (commit `6844b8f`):**  
`MainLayout.tsx` já tem `overflow-x-clip` — confirmado em código. Gate 1.15 está verde.  
A mensagem "1 error was not a part of any test" indica **erro de setup** (fixture, `beforeAll`, auth ou dev server), NÃO falha de asserção CSS.

**Diagnóstico necessário:**
1. Baixar artifact `personalization-e2e-artifacts` ou `cart-invariants-failure-*` e abrir trace Playwright
2. Verificar se auth (`E2E_USER_EMAIL`, `VITE_SUPABASE_*`) está configurada no runner
3. Rodar `npx playwright test e2e/flows/22-header-sticky.spec.ts --trace on` localmente

---

### P2b — Cart Invariants Smoke: todos os shards falham

**Run:** [#40097995522](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995522)  
**Conclusão:** `failure`  
**Jobs:** 6 shards (chromium × 3 + firefox × 3) — todos falharam

**Evidência:**
```
❌ Ao menos um shard/browser do smoke de invariants falhou.
```
Todos os 6 shards falham em: step `Playwright — invariants do header/sidebar`.  
Falha uniforme em chromium E firefox indica problema de ambiente/setup, não renderização.

**Causa provável:** Mesmo setup error que P2a (auth, dev server ou fixture).

---

### P2c — E2E Personalization Flow: mínimo de testes não executado

**Run:** [#40097995548](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995548)  
**Conclusão:** `failure`  
**Job:** `E2E — Personalization Journey`  
**Steps falhos:** `Run Personalization E2E Tests` + `Check min tests executed`

**Erro:** Menos testes do que o mínimo exigido foram executados (check `min tests executed`).  
Artifact `personalization-e2e-artifacts` (340MB) disponível para download no run acima.

**Causa provável:** Falha de autenticação ou timeout no setup — os testes abortem antes de executar.

---

## P3 — Branch Protection Sentinel: push direto em main sem PR

**Workflow:** `.github/workflows/branch-protection-sentinel.yml`  
**Run:** [#40097995567](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995567)  
**Conclusão:** `failure`  
**Job:** `Verify push to main matches accepted patterns` → step `Audit every commit in push`

**Causa exata:**  
Commit `269ec66b1500d45a5b655613ca2e8a1ea2876027` ("ci(workflows): HUSKY=0 em todos os steps de git commit do CI") foi empurrado **diretamente em main sem PR**. O sentinel aceita apenas:
1. Squash merge de PR — mensagem termina em `(#NNN)`
2. Merge commit de PR — `Merge pull request #NNN`, `Merge PR #NNN:` ou `merge(pr-NNN):`
3. Bots oficiais — `github-actions[bot]`, `dependabot[bot]`, `renovate[bot]`

O commit `269ec66` é push direto de `adm01-debug` — não atende nenhum padrão.

**Resolução automática esperada:**  
O sentinel verifica apenas os commits do push atual. Quando o PR #2389 for mergeado (squash), o próximo push em main terá mensagem `... (#2389)` — padrão aceito — e o sentinel passará.  
O run `40097995567` reflete um push direto pré-existente que não pode ser retroativamente corrigido.

**Ação necessária pelo PO:**  
Evitar futuros pushes diretos em main. Todos os commits devem chegar via PR merge.

---

## P4 — 50+ runs históricos `action_required` de bots

**Workflows:** `release-please.yml` (disparado por `release-please[bot]`, `copilot-swe-agent[bot]`)  
**Categoria:** Registros históricos de PRs fechados — não corrigíveis retroativamente

**Causa:** GitHub exige aprovação manual para workflows disparados por colaboradores externos. Os 50+ runs são de PRs já fechados — não é possível aprovar retroativamente.

**Resolução:** Não se aplica (registros históricos). Novos runs passarão quando `RELEASE_PLEASE_TOKEN` for configurado (P1).

---

*Atualizado pela sessão Claude Code — https://claude.ai/code/session_01Nc1nb7PArDnixYvvZssnKy*
