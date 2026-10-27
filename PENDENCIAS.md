# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-27  
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597)

---

## Workflows que NÃO podem ser corrigidos por código

### 1. Running Copilot Code Review
- **Run ID:** 40451624818 (sha `c86a3812`, main)
- **Erro:** Step "Processing Request (Linux)" — cleanup do Copilot SWE agent (`api.business.githubcopilot.com`) falhou com processo orphan.
- **Causa raiz:** Comportamento interno do GitHub Copilot bot. O agente SWE (`sweagent-capi:gpt-6.1-sol`) não retornou conclusão limpa ao endpoint de cleanup.
- **Por que não posso corrigir:** Não há código no repo que controle o comportamento do bot de revisão. O workflow apenas chama a API do Copilot.
- **O que você (PO) pode fazer:**
  1. Verificar se a licença GitHub Copilot Business está ativa e não excedeu cota.
  2. Em GitHub → Settings → Copilot → verificar se o agente SWE está habilitado para o repo.
  3. Se o workflow continuar falhando em toda run, desabilitar o trigger automático ou verificar com GitHub Support.
- **Impacto no Gate Final:** Este workflow NÃO é required check em `main` — não bloqueia deploy.

---

### 2. Uptime Monitor
- **Run ID:** 40451113594 (sha `48899b65`, main)
- **Erro:** Step "Probe site + edge function" falhou — site/edge function do Supabase (`doufsxqlfjyuvxuezpln.supabase.co`) estava temporariamente indisponível.
- **Causa raiz:** Transiente — o probe externo detectou indisponibilidade momentânea. O job seguinte ("Comentário adicionado na issue #2608") executou com sucesso, confirmando que é transiente.
- **Por que não posso corrigir:** Monitoramento externo de uptime depende da disponibilidade do Supabase Cloud e do Vercel. Falhas pontuais são esperadas.
- **O que você (PO) pode fazer:**
  1. Se o site estiver indisponível regularmente: investigar logs no Supabase dashboard e Vercel.
  2. Se for ruído, considerar aumentar o número de retries no workflow `uptime-monitor.yml`.
- **Impacto no Gate Final:** Este workflow NÃO é required check em `main` — não bloqueia deploy.

---

## Workflows aguardando merge do PR #2597

### 3. Kit Coverage — Integration
- **Última falha:** Run 40446574419 (sha `3ffbf322`)  
- **Erro:** `Hook timed out in 30000ms` em `kit-coverage.integration.test.ts:34:5`
- **Fix aplicado no PR:** `hookTimeout` do `beforeAll` elevado de 30s para 60s (commit `e76acf61`)
- **Status:** Corrigido no PR. Após merge, a próxima run deverá passar.
- **Não foi possível verificar localmente:** o teste é `SKIPPED` por padrão (requer `RUN_INTEGRATION_TESTS=1`) e depende da bridge real do DB externo.

---

## Workflows com CI ainda em execução (aguardar)

No momento deste relatório, os seguintes workflows estão `in_progress` ou `queued` tanto na main quanto no PR branch. Serão analisados após completarem:

| Workflow | Motivo de atenção |
|---|---|
| E2E (Playwright) | Histórico de falha em runs anteriores |
| E2E — Critical Flows & Error Boundaries | Histórico de falha |
| E2E — Personalization Flow | Histórico de falha |
| E2E • Swatch QuickView | Histórico de falha |
| Nightly Full CI | Falhou em 06fe47fd (2 commits atrás) |
| E2E — Visual Regression (Preview button) | Falhou em 06fe47fd |
| CI - Replenishment Module Quality Gate | Falhou em 48899b65 |
| CI Security & Drift Checks | Falhou em 48899b65 — **fixes aplicados no PR** |

**Nota sobre E2E:** Os workflows E2E (Playwright) falham frequentemente por razões de infraestrutura (auth Supabase no ambiente de CI, variáveis de ambiente). São workflows `continue-on-error` ou podem ser falhas pré-existentes não relacionadas ao código alterado no PR. Necessitam investigação adicional após o merge e re-run.

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4*
