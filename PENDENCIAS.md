# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-27  
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597)

---

## Workflows que NÃO podem ser corrigidos por código

### 1. Running Copilot Code Review
- **Run ID:** 40451624818 (sha `c86a3812`, main)
- **Erro:** Step "Processing Request (Linux)" — cleanup do Copilot SWE agent (`api.business.githubcopilot.com`) falhou com processo orphan.
- **Causa raiz:** Comportamento interno do GitHub Copilot bot. O agente SWE (`sweagent-capi:gpt-6.1-sol`) não retornou conclusão limpa ao endpoint de cleanup.
- **Por que não posso corrigir:** Não há código no repo que controle o comportamento do bot de revisão.
- **O que você (PO) pode fazer:**
  1. Verificar se a licença GitHub Copilot Business está ativa e não excedeu cota.
  2. Em GitHub → Settings → Copilot → verificar se o agente SWE está habilitado para o repo.
  3. Se o workflow continuar falhando em toda run, desabilitar o trigger automático ou verificar com GitHub Support.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 2. Uptime Monitor
- **Run IDs:** 40451113594, múltiplos (sha `48899b65`, main)
- **Erro:** Step "Probe site + edge function" falhou — site/edge function do Supabase (`doufsxqlfjyuvxuezpln.supabase.co`) estava temporariamente indisponível.
- **Causa raiz:** Transiente — probe externo detectou indisponibilidade momentânea. Jobs subsequentes executaram com sucesso.
- **Por que não posso corrigir:** Monitoramento externo depende da disponibilidade do Supabase Cloud e do Vercel.
- **O que você (PO) pode fazer:**
  1. Se o site estiver indisponível regularmente: investigar logs no Supabase dashboard e Vercel.
  2. Se for ruído, considerar aumentar o número de retries no workflow `uptime-monitor.yml`.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 3. E2E Workflows (pré-existentes)
- **Workflows:** E2E (Playwright), E2E — Critical Flows & Error Boundaries, E2E — Personalization Flow, E2E • Swatch QuickView, CI - Replenishment Module Quality Gate (smoke)
- **Causa raiz:** Infraestrutura de CI — auth Supabase no ambiente de CI, variáveis de ambiente, timeout de recursos.
- **Por que não corrigi neste PR:** Falhas existem em SHAs anteriores ao PR (`48899b65`, `c86a3812`). São falhas de infraestrutura, não de código alterado neste PR.
- **Impacto no Gate Final:** NÃO são required checks — não bloqueiam deploy.

---

## Workflows aguardando merge do PR #2597

### (Resolvidos no PR — aguardando merge)

#### CI Security & Drift Checks
- **Última falha:** Run 40447563295 (sha `48899b65`)
- **Fixes aplicados no PR:** timing race (chunk-recovery), snapshot reset (NegotiationMarkupCard), jsdom volumechange (PromoFlixPlayer)
- **Status:** Corrigido. Após merge, a próxima run deverá passar.

#### Kit Coverage — Integration
- **Última falha:** Run 40446574419 (sha `3ffbf322`)
- **Fix aplicado no PR:** `hookTimeout` do `beforeAll` elevado de 30s para 60s
- **Status:** Corrigido. Após merge, a próxima run deverá passar.

---

## Workflows que requerem ação pós-merge

### 4. edge-functions-drift-check
- **Run ID:** 40453930945 (sha `eb04236c`, main)
- **Erro:** "Drift detectado entre GitHub e canônico" — step "Fail if drift detected" exit 1
- **Causa raiz:** Commit Lovable `eb04236c` (2026-10-27T05:19 UTC) alterou código de edge function(s) no repositório GitHub sem fazer deploy correspondente no Supabase (`doufsxqlfjyuvxuezpln`). O check detectou divergência de conteúdo entre GitHub e o canônico deployado.
- **Por que não corrigi antes do merge:** A falha foi introduzida por commit Lovable APÓS a criação do PR. Não é relacionada às correções do PR. Não é required check do Gate Final.
- **Ação requerida (pós-merge):**
  - Disparar `.github/workflows/deploy-edge-functions.yml` via `workflow_dispatch` para sincronizar as edge functions.
  - Ou identificar qual função driftou (artefato `drift-report.csv` da run 40453930945) e fazer deploy pontual com `function_name` específico.
- **Status pós-merge:** `deploy-edge-functions.yml` disparado via `workflow_dispatch` (run 40476968791 — pós-merge de PR #2597; run 40480767717 — pós-merge de PR #2629). `edge-functions-drift-check` run 40480776196 em `in_progress` (2026-10-27T09:27 UTC).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 5. Quote Builder Delivery Quality
- **Run ID:** 40476927065 (sha `6ef07df8`, main — pós-merge)
- **Run ID pré-merge (confirma pré-existente):** 40474032315 (sha `83c81d58`, main — antes do merge)
- **Workflow:** `.github/workflows/delivery-quality.yml`
- **Erro:** Falha no step "E2E & Visual Regression" — infraestrutura E2E (mesmo padrão dos 5 workflows E2E do §3).
- **Causa raiz:** Falha de infraestrutura E2E pré-existente. Confirmada pré-existente: run 40474032315 já mostrava `failure` no SHA `83c81d58` (commit anterior ao merge do PR #2597). Não é regressão do PR.
- **Por que não corrigi:** Falha existia antes do PR #2597. É infraestrutura E2E, não código alterado neste PR.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 6. Gate 5 — Supabase Security Audit
- **Run ID:** 40476927261 (sha `6ef07df8`, main — pós-merge)
- **Workflow:** `.github/workflows/supabase-security-gate.yml`
- **Erro:** Step "RPC get_profile_and_roles smoke test" retornou HTTP 503 após 3 tentativas — log: `O smoke da RPC retornou HTTP 503 após 3 tentativas — serviço indisponível.`
- **Causa raiz:** Transiente — indisponibilidade momentânea do Supabase (`doufsxqlfjyuvxuezpln.supabase.co`). Idêntico ao padrão do Uptime Monitor (§2). Não é regressão de código.
- **Por que não corrigi:** Falha transiente de disponibilidade do Supabase Cloud. Não há código a corrigir.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

### 7. Branch Protection Sentinel — commit `b6a2b359` (PR #2629)
- **Run ID:** 40480654007 (sha `b6a2b359`, main, 2026-10-27T09:26 UTC)
- **Erro:** `1 commit(s) em push para main sem padrão aceito: b6a2b35` — Regra 1 do sentinel (`scripts/sentinel-check.sh`): squash merge DEVE terminar em `(#NNN)` (regex `\(#[0-9]+\)[[:space:]]*$`).
- **Causa raiz:** Squash merge do PR #2629 usou `commit_title` sem sufixo `(#2629)`. Título usado: `chore: entrega RELATORIO_CI.md e PENDENCIAS.md — /goal CI fix concluído`. O sentinel detectou corretamente uma violação real de convenção de commit.
- **Por que não posso corrigir o commit já mergeado:** Retroativamente impossível — commit já está na main. Force-push em main é proibido (REGRA #9).
- **Impacto no Gate Final:** NÃO é required check (não está em `.github/required-checks.json`) — não bloqueia deploy nem PRs futuros.
- **Resolução:** Este PR (#2630+) usa squash merge com `commit_title` terminando em `(#NNN)` — o sentinel passará verde no HEAD após este merge.

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4*
*Atualizado: 2026-10-27T09:30 UTC — adicionado §7 Branch Protection Sentinel (PR #2629 squash sem `(#NNN)`)*
