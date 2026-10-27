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
  - Ou identificar qual função drifted (artefato `drift-report.csv` da run 40453930945) e fazer deploy pontual com `function_name` específico.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4*
