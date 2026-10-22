# Seção 10 — Logs e Observabilidade

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 10.1 Acesso a Logs via MCP

**Status:** NÃO VERIFICADO

A ferramenta `query_logs` do MCP "SUPABASE - GESTÃO DE PRODUTOS - PROMO GIFTS V4" não retornou dados úteis:

- Tentativas com `edge_logs.edge_logs` → erro: tabela não existe
- Tentativas com `postgres_logs.postgres_logs` → erro: tabela não existe  
- Tentativas com `service` parameter → ferramenta rejeita o parâmetro (aceita apenas `sql`)

O projeto usa ClickHouse para logs, mas os nomes de tabela disponíveis para este projeto via MCP não foram determinados. A ferramenta está conectada ao projeto correto (`doufsxqlfjyuvxuezpln`) mas o catálogo de tabelas de log não foi exposto.

**Roteiro para verificação manual (Supabase Dashboard):**
1. Acessar Dashboard → Logs → Logs Explorer
2. Verificar disponibilidade de: edge function logs, postgres logs, auth logs, storage logs, realtime logs
3. Executar queries ClickHouse para identificar padrões de erro nas últimas 24-72h

---

## 10.2 Observabilidade Existente (via código e workflows)

Embora os logs diretos não tenham sido acessíveis, foram identificadas as seguintes camadas de observabilidade no repositório:

### Uptime Monitor
- **Arquivo:** `.github/workflows/uptime-monitor.yml`
- **Frequência:** A cada 30 minutos (schedule `*/30 * * * *`)
- **Cobertura:** Health check externo da aplicação

### Wraparound Monitor
- **Arquivo:** `.github/workflows/wraparound-monitor-report.yml`
- **Objeto monitorado:** `ops.wraparound_monitor_log`
- **Cobertura:** PostgreSQL transaction ID wraparound (risco crítico de DB corruption)

### Audit Log Tables (no banco)
- `audit_log` — log geral de operações
- `audit_log_gravacao` — log específico de gravações/personalizações
- `admin_audit_log` — log de ações administrativas
- `mcp_access_log` — log de acessos via MCP server (confirmado no código do mcp-server)

### Structured Logger nas Edge Functions
- `_shared/structured-logger.ts` — logger estruturado usado em várias edge functions
- Emite JSON com `requestId`, `fn`, campos de contexto

---

## 10.3 Achados

---

### [ID-LOG-001] Logs de edge function não acessíveis via MCP nesta auditoria
- **Severidade:** INFO
- **Objeto:** Ferramenta `query_logs` MCP
- **Evidência:** 3 tentativas de query retornaram "Tables do not exist" ou erro de parâmetro inválido.
- **Impacto:** Auditoria de logs de edge functions não pôde ser completada via MCP. Verificação manual no dashboard necessária.
- **Correção sugerida:** Para futuras auditorias, documentar os nomes corretos das tabelas ClickHouse deste projeto ou usar Supabase CLI `supabase functions logs <nome>`.
- **Esforço:** N/A

---

### [ID-LOG-002] Ausência de alertas automáticos para erros de edge function
- **Severidade:** MÉDIO
- **Objeto:** Observabilidade geral
- **Evidência:** Uptime monitor existe (uptime-monitor.yml) mas verifica apenas disponibilidade HTTP. Não há workflow que alerte sobre taxa de erro elevada em edge functions ou queries lentas no Postgres.
- **Impacto:** Erros silenciosos em edge functions (ex: falhas no DND check de notificações, falhas de webhook pg_net) podem passar despercebidos por horas.
- **Correção sugerida:** 
  1. Configurar alerta no Supabase Dashboard → Observability → Alerts para: error rate > 5% em edge functions, query latência p99 > 1s
  2. Ou criar workflow CI que consulte logs periodicamente e notifique via Slack/email
- **Esforço:** Pequeno

---

### [ID-LOG-003] `pg_net` sem alerta automático para taxa de falha
- **Severidade:** MÉDIO
- **Objeto:** `net._http_response` (pg_net webhooks)
- **Evidência:** Taxa de falha de 57% identificada na Seção 9 (ID-NET-001). Não há workflow ou monitor que alerte sobre essa taxa.
- **Impacto:** Falhas em webhooks críticos (CRM, ERP, pagamentos) podem ficar sem alerta por dias.
- **Correção sugerida:** Criar função PostgreSQL ou workflow agendado que verifique `net._http_response` e notifique se taxa de erro > 20% nas últimas 24h.
- **Esforço:** Pequeno

---

### [ID-LOG-004] Wraparound monitor existe mas sem documentação de resposta a incidente
- **Severidade:** BAIXO
- **Objeto:** `.github/workflows/wraparound-monitor-report.yml`
- **Evidência:** Workflow existe e monitora `ops.wraparound_monitor_log`. Não foi encontrado runbook de resposta quando o monitor dispara.
- **Impacto:** Sem runbook, equipe pode não saber o que fazer quando XID wraparound se aproxima.
- **Correção sugerida:** Criar `docs/runbooks/wraparound-response.md` com passos: identificar tabelas com mais dead tuples, executar `VACUUM FREEZE`, escalar para Supabase support se necessário.
- **Esforço:** Pequeno (documentação)

---

## 10.4 Sumário da Seção 10

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 2 (LOG-002, LOG-003) |
| BAIXO | 1 (LOG-004) |
| INFO | 1 (LOG-001) |

**Nota:** Verificação de padrões de erro em logs de edge function e Postgres requer acesso ao Supabase Dashboard → Logs Explorer. Marcado como NÃO VERIFICADO via MCP.
