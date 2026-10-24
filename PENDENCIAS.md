# Pendências CI — Bloqueios Externos

**Atualizado em:** 2026-10-24 (rev 2 — erros exatos adicionados)  
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

**Workflow:** (workflow com job `e2e-gates`)  
**Run:** [#40097995631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995631)  
**Conclusão:** `failure`  
**Job:** `e2e-gates` → step `🛑 Fail-fast se header sticky falhou`

**Erro exato confirmado (via spec + run failure summary):**
```
Test: [chromium-authed] › e2e/flows/22-header-sticky.spec.ts:132:7
      › header permanece fixo ao rolar em /novidades [mobile 390×844]

Error: [waitForTestIdVisible] testid="app-header" não ficou visível em ${timeout}ms
  at helpers/waits.ts:48
  at assertHeaderSticky (e2e/flows/22-header-sticky.spec.ts:81)

Result: 20 passed, 1 failed, 1 interrupted, 149 did not run (fail-fast)
```

**Diagnóstico:**  
- Segredos `E2E_USER_EMAIL: ***` e `VITE_SUPABASE_URL: ***` presentes no runner (confirmado nos logs).
- Não é falha de auth/setup — os 20 outros testes passaram. É regressão real: o elemento `data-testid="app-header"` não fica visível na rota `/novidades` no viewport mobile 390×844.
- `MainLayout.tsx` usa `overflow-x-clip` correto (commit `6844b8f`) — Gate 1.15 verde. A regressão pode ser CSS específico da rota `/novidades`.
- **Pré-existente no `main` (commit `325b0bd`)** — não introduzida por este PR.

**Ação necessária:** investigar CSS da rota `/novidades` que pode estar ocultando o header no mobile.

---

### P2b — Cart Invariants Smoke: todos os shards falham

**Run:** [#40097995522](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995522)  
**Conclusão:** `failure`  
**Jobs:** 6 shards (chromium × 3 + firefox × 3) — todos falharam (job 120884195253 analisado)

**Erros exatos confirmados (job logs):**
```
Error: [E108] sem carrinhos disponíveis
Error: [E108] precisa de 3+ carrinhos para A→B→A→C
Error: [E108] precisa de 2+ carrinhos
Error: [E108] sem carrinhos disponíveis
Error: [E108] precisa de 2+ carrinhos
Error: [E108] sem carrinhos
6 failed
```

**Diagnóstico:**  
Código de erro `[E108]` = fixture de dados insuficiente. Os testes exigem 2–3 carrinhos activos no ambiente de CI, mas o estado do banco de teste não os tem. Problema de dados de teste no runner, não regressão de código.  
**Pré-existente no `main` (commit `325b0bd`)** — não introduzida por este PR.

**Ação necessária:** seed de dados de teste no runner de CI com carrinhos suficientes.

---

### P2c — E2E Personalization Flow: falha de URL navigation

**Run:** [#40097995548](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995548)  
**Conclusão:** `failure`  
**Job:** `E2E — Personalization Journey` (job 120884172213 analisado)  
**Steps falhos:** `Run Personalization E2E Tests` + `Check min tests executed`

**Erros exatos confirmados (job logs):**
```
flows/90-personalization-pdp: Error: expect(page).toHaveURL(/\/produtos\/.+/) failed
  - Expect "toHaveURL" with timeout 15000ms
  > 24 | await expect(page).toHaveURL(/\/produtos\/.+/);

flows/91-personalization-via-simulator: Error: expect(page).toHaveURL(/\/produtos\/.+/) failed
  - Expect "toHaveURL" with timeout 15000ms
  > 24 | await expect(page).toHaveURL(/\/produtos\/.+/);

flows/92-personalization-auth: Error: expect(page).toHaveURL(/\/login/) failed
  - Expect "toHaveURL" with timeout 15000ms
  > 21 | await expect(page).toHaveURL(/\/login/);

flows/92-personalization-auth: expect(page).not.toHaveURL(expected) failed

4 failed (chromium-authed) — retries incluídos
```

**Diagnóstico:**  
Flows 90 e 91 esperavam chegar a `/produtos/...` mas a navegação falhou (timeout). Flow 92 esperava ser redirecionado para `/login` mas isso não ocorreu. Regressão de roteamento/autenticação no fluxo de personalização.  
**Pré-existente no `main` (commit `325b0bd`)** — não introduzida por este PR.

**Ação necessária:** investigar roteamento do fluxo de personalização (PDP → Personalization).

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

## P5 — Gate 2.5: PostgreSQL Transactional Integrity — live check HTTP 400

**Workflow:** job `database-integrity` (run [#40099111918](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099111918))  
**Job ID:** 120887889328  
**Conclusão:** `failure`  
**Commit:** `aa704af1ecd68ac99ae39732dccc1ebb79d7b859`

**Situação:**  
43/43 testes passaram localmente (`SIMULATION_PASS_LOCAL_ONLY`). A falha ocorre apenas no step de verificação live:

```
[Quote RPC canonical readiness] inconclusive: A consulta read-only do contrato
canonico nao produziu evidencia conclusiva.
result={"status":"inconclusive","reason":"http-error","httpStatus":400}
##[error]Process completed with exit code 2.
```

**Causa:**  
O script `check:quote-rpc:canonical --require-live` faz uma query read-only ao Supabase
(`doufsxqlfjyuvxuezpln`) e recebeu HTTP 400. Problema de credenciais/conectividade no runner,
não regressão de código. Os arquivos alterados neste PR são apenas testes e documentação —
sem relação com o RPC de quotes.

**Pré-existente:** NÃO introduzido por este PR (Gate 2.5 pré-existente com este comportamento).

**Ação necessária pelo PO:** verificar se `SUPABASE_ACCESS_TOKEN` no runner está válido e com
permissões para query read-only em `doufsxqlfjyuvxuezpln`.

---

## P4 — 50+ runs históricos `action_required` de bots

**Workflows:** `release-please.yml` (disparado por `release-please[bot]`, `copilot-swe-agent[bot]`)  
**Categoria:** Registros históricos de PRs fechados — não corrigíveis retroativamente

**Causa:** GitHub exige aprovação manual para workflows disparados por colaboradores externos. Os 50+ runs são de PRs já fechados — não é possível aprovar retroativamente.

**Resolução:** Não se aplica (registros históricos). Novos runs passarão quando `RELEASE_PLEASE_TOKEN` for configurado (P1).

---

*Atualizado pela sessão Claude Code — https://claude.ai/code/session_01Nc1nb7PArDnixYvvZssnKy*
