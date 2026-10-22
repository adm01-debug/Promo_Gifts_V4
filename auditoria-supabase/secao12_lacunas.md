# Seção 12 — Lacunas e Gaps

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 12.1 Backup e PITR

### Achados

---

### [ID-GAP-001] PITR — não confirmável via SQL
- **Severidade:** MÉDIO
- **Objeto:** Backup / PITR (Point-In-Time Recovery)
- **Evidência:** `SHOW wal_level` → `logical` (nível correto para PITR). `SHOW max_wal_size` → `4096MB` (4GB). Supabase habilita PITR automaticamente em planos pagos (Pro+), mas a confirmação de que PITR está ativo e configurado com retenção adequada requer acesso ao Dashboard → Database → Backups.
- **Impacto:** Sem confirmação de PITR, não é possível garantir RTO/RPO para incidentes de perda de dados.
- **Correção sugerida:** Verificar no Dashboard → Database → Backups se PITR está ativo e qual a janela de retenção. Documentar em `docs/runbooks/disaster-recovery.md`.
- **Esforço:** Trivial (verificação + documentação)

---

### [ID-GAP-002] Sem runbook de disaster recovery documentado
- **Severidade:** MÉDIO
- **Objeto:** Documentação operacional
- **Evidência:** Busca em `docs/runbooks/` e `docs/` não encontrou arquivo de disaster recovery ou restore procedure.
- **Impacto:** Em caso de incidente (corrupção, erro de DDL, ataque), equipe sem procedimento documentado = MTTR elevado.
- **Correção sugerida:** Criar `docs/runbooks/disaster-recovery.md` com: (1) como confirmar PITR, (2) como restaurar para ponto no tempo, (3) contatos Supabase support, (4) procedimento de failover.
- **Esforço:** Pequeno (documentação)

---

## 12.2 Soft-Delete

### Status: IMPLEMENTADO (parcialmente)

Tabelas com soft-delete identificadas:
- `categories` (deleted_at)
- `collections` (deleted_at)
- `magazines` (deleted_at)
- `products` (is_active / deleted_at)
- `supplier_products_raw` (provavelmente)

**Gap identificado:**

---

### [ID-GAP-003] Soft-delete sem política de purge documentada
- **Severidade:** BAIXO
- **Objeto:** Tabelas com soft-delete
- **Evidência:** Colunas `deleted_at` identificadas em múltiplas tabelas. Não foi encontrado job/cron de purge de registros deletados há mais de N dias.
- **Impacto:** Registros "deletados" acumulam indefinidamente, aumentando tamanho de tabela e tempo de queries sem índice adequado em `deleted_at IS NULL`.
- **Correção sugerida:** Criar job de purge agendado (via pg_cron ou GitHub Actions) que remova registros com `deleted_at < NOW() - INTERVAL '90 days'`. Documentar política de retenção de dados deletados.
- **Esforço:** Pequeno

---

## 12.3 Auditoria de Ações

### Tabelas de audit log identificadas:
- `audit_log` — log geral
- `audit_log_gravacao` — log de gravações/personalizações
- `admin_audit_log` — log de ações admin
- `mcp_access_log` — acessos via MCP

---

### [ID-GAP-004] Cobertura de audit log não verificada para todas as tabelas críticas
- **Severidade:** MÉDIO
- **Objeto:** Audit log (`audit_log`, triggers)
- **Evidência:** Tabelas de audit log existem. Não foi possível verificar quais tabelas têm triggers de auditoria sem enumerar todos os triggers. Query de triggers por tabela não foi executada nesta sessão.
- **Impacto:** Se tabelas críticas (`quotes`, `quote_items`, `seller_carts`) não tiverem triggers de auditoria, mudanças não são rastreadas.
- **Correção sugerida:** Executar `SELECT trigger_schema, trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table` para verificar cobertura. Garantir que pelo menos: quotes, quote_items, products, users profiles têm triggers de audit.
- **Esforço:** Pequeno (inspeção + eventual criação de triggers)

---

## 12.4 Staging / Ambiente de Desenvolvimento

---

### [ID-GAP-005] Sem ambiente de staging configurado
- **Severidade:** MÉDIO
- **Objeto:** `supabase/config.toml`
- **Evidência:** Arquivo `supabase/config.toml` tem apenas `project_id = "doufsxqlfjyuvxuezpln"`. Nenhum bloco de ambiente staging. Duplica finding ID-EF-005 (Seção 8).
- **Impacto:** Edge functions e migrations são testadas diretamente em produção via CI ou deploy manual.
- **Correção sugerida:** Criar projeto Supabase de staging ou usar Supabase Branches para PRs críticos.
- **Esforço:** Médio

---

## 12.5 LGPD / Privacidade

---

### [ID-GAP-006] Sem política LGPD formal documentada no repositório
- **Severidade:** MÉDIO
- **Objeto:** Conformidade LGPD
- **Evidência:** `docs/qa/perfil-dados-senha-preferencias-checklist.md` existe como checklist de QA. Não foi encontrado: mapeamento de dados pessoais, prazo de retenção de dados de usuários, procedimento de exclusão de dados por solicitação (direito ao esquecimento LGPD Art. 18).
- **Impacto:** Sem mapeamento, não é possível responder a solicitações LGPD (art. 18 - portabilidade, correção, exclusão) de forma sistemática. Risco regulatório.
- **Correção sugerida:** Criar `docs/compliance/LGPD.md` com: (1) mapeamento de dados pessoais no banco, (2) prazo de retenção, (3) procedimento de exclusão/anonimização, (4) responsável pelo tratamento.
- **Esforço:** Médio (exige análise de negócio + documentação técnica)

---

## 12.6 Monitoramento de Service Role no Frontend

---

### [ID-GAP-007] `SUPABASE_SERVICE_ROLE_KEY` não exposto no frontend
- **Severidade:** INFO
- **Objeto:** `src/integrations/supabase/client.ts` e `src/`
- **Evidência:** Busca em `src/` por referências a `service_role` encontrou apenas strings como nome de segredo ("SUPABASE_SERVICE_ROLE_KEY") em arquivos de configuração/docs, nunca como valor real. Nenhuma key de service role hardcoded no frontend.
- **Impacto:** Positivo — service role key não está exposta no bundle do frontend.
- **Correção sugerida:** Manter gate CI que verifica ausência de service role key no frontend (gate E23 / secrets check).

---

## 12.7 Conformidade com Políticas de Governança

| Política | Status | Observação |
|---|---|---|
| SSOT `doufsxqlfjyuvxuezpln` | ✅ Conforme | Gate 0 CI ativo |
| Deploy via workflow | ✅ Conforme | `deploy-edge-functions.yml` existe |
| Migration via workflow | ✅ Conforme | `db-apply-migration.yml` existe |
| Sem `supabase db push` em CI | ✅ Verificado | Gate C19 ativo |
| DDL out-of-band detector | ✅ Ativo | `ddl-out-of-band-detector.yml` |
| Secrets inventory | ✅ Ativo | Gate 1.14, `docs/ci/SEGREDOS.md` |
| RLS cobertura completa | ✅ Aprovado | Ver Seção 11 |
| Staging environment | ❌ Ausente | Ver ID-GAP-005 |
| LGPD documentação | ❌ Incompleta | Ver ID-GAP-006 |
| Runbook disaster recovery | ❌ Ausente | Ver ID-GAP-002 |

---

## 12.8 Sumário da Seção 12

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 5 (GAP-001, GAP-002, GAP-004, GAP-005, GAP-006) |
| BAIXO | 1 (GAP-003) |
| INFO | 1 (GAP-007) |
