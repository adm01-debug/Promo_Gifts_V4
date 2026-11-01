# Relatório de Auditoria Supabase — Promo Brindes V4

**Projeto:** `doufsxqlfjyuvxuezpln`  
**Data:** 2026-11-01  
**Fase A:** Concluída (parcial em A.7, A.8, A.12)  
**Fase B:** PRs de aprovação listadas ao final

---

## Resumo executivo

| Severidade | Quantidade |
|---|---|
| CRÍTICO | 1 |
| ALTO | 1 |
| MÉDIO | 7 |
| BAIXO | 1 |
| INFO | 1 |

**O achado mais urgente** (SB-0001) expõe a tabela `auth.users` via Realtime para qualquer subscriber, vazando e-mails e metadados de usuários. Requer remoção imediata da publication.

---

## Achados

---

### SB-0001

```
ID: SB-0001
Seção: A.9 / A.3
Severidade: CRÍTICO
Tipo: SEGURANÇA
Objeto: publication supabase_realtime / auth.users
Evidência:
  SELECT pubname, schemaname, tablename 
  FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  → [{pubname:"supabase_realtime","schemaname":"auth","tablename":"users"}]
Impacto no negócio: Qualquer client Supabase autenticado pode se inscrever em
  realtime e receber INSERT/UPDATE/DELETE de auth.users, incluindo campo email,
  phone, raw_user_meta_data e encrypted_password hash de TODOS os usuários da
  plataforma (39 usuários atuais). LGPD art. 46.
Reprodução:
  const channel = supabase.channel('*')
    .on('postgres_changes', {event: '*', schema: 'auth', table: 'users'}, console.log)
    .subscribe()
Correção proposta:
  -- migration: remove auth.users da publication realtime
  ALTER PUBLICATION supabase_realtime DROP TABLE auth.users;
Classe de escrita: APROVAÇÃO
Risco de regressão: baixo — nenhum código do repo assina auth.users via realtime
Esforço: P (<30 min)
```

---

### SB-0002

```
ID: SB-0002
Seção: A.8 / A.3
Severidade: ALTO
Tipo: SEGURANÇA
Objeto: 36 edge functions com verify_jwt=false
Evidência: list_edge_functions → 36 funções com verify_jwt=false (ver inventario/03_edges.md)
Impacto no negócio: Qualquer pessoa na internet pode chamar essas funções sem autenticação.
  Funções de risco alto: run-script (executor genérico), mcp-gateway (acesso amplo),
  dispatcher-proxy, supplier-integrator, cfimages-batch/upload.
  Se essas funções não validam internamente quem chamou, são exploráveis.
Reprodução: curl -X POST https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/run-script
  sem Authorization header → deve retornar 401 se implementada corretamente
Correção proposta:
  Para funções que DEVEM ser privadas: mudar verify_jwt para true no config
    → requer código verificando Authorization internamente ou migrá-las para verify_jwt=true
  Para funções que precisam ser públicas (cleanup, crons): confirmar que validam
    CRON_SECRET ou outro mecanismo interno.
  Code review individual das 36 funções ainda pendente (NÃO VERIFICADO por limite de sessão).
Classe de escrita: APROVAÇÃO (deploy de edge functions é fluxo de aprovação)
Risco de regressão: médio — algumas funções PRECISAM de verify_jwt=false (cron targets)
Esforço: G (análise individual de 36 funções + deploy seletivo)
```

---

### SB-0003

```
ID: SB-0003
Seção: A.9
Severidade: MÉDIO
Tipo: INTEGRIDADE
Objeto: tabelas realtime com REPLICA IDENTITY DEFAULT
  login_attempts, workspace_notifications, device_login_notifications
Evidência:
  SELECT c.relname, c.relreplident FROM pg_class c ... WHERE c.relname IN (...)
  → relreplident = 'D' (DEFAULT) para as 3 tabelas
Impacto no negócio: Subscribers de realtime recebem UPDATE/DELETE sem os dados
  anteriores da linha (apenas PK). Notificações de segurança e login podem
  chegar incompletas para o cliente React.
Correção proposta:
  ALTER TABLE public.login_attempts REPLICA IDENTITY FULL;
  ALTER TABLE public.workspace_notifications REPLICA IDENTITY FULL;
  ALTER TABLE public.device_login_notifications REPLICA IDENTITY FULL;
Classe de escrita: APROVAÇÃO
Risco de regressão: baixo
Esforço: P
```

---

### SB-0004

```
ID: SB-0004
Seção: A.5
Severidade: MÉDIO
Tipo: PERFORMANCE
Objeto: 499 índices com idx_scan = 0 (nunca usados)
Evidência: get_advisors(performance) → 499 entradas tipo "unused_index"
Impacto no negócio: Cada índice não usado consome espaço em disco e lentifica
  INSERT/UPDATE/DELETE. Com 3,6M rows em stock_snapshots e tabelas de log com
  crescimento contínuo, o impacto acumula.
Correção proposta:
  Gerar script de DROP para os 499 índices (apenas os com idx_scan = 0 e
  que não sejam PK/UNIQUE ou usados por constraints).
  Priorizar os maiores por tamanho.
Classe de escrita: APROVAÇÃO (DDL — DROP INDEX)
Risco de regressão: médio — verificar que nenhum índice é usado por FK ou constraint
Esforço: M
```

---

### SB-0005

```
ID: SB-0005
Seção: A.5
Severidade: MÉDIO
Tipo: PERFORMANCE
Objeto: 8 policies com auth_rls_initplan em ai_usage_quotas, art_file_attachments
Evidência: get_advisors(performance) → 8 entradas tipo "auth_rls_initplan"
  Policies usam auth.uid() como função volátil em USING diretamente em vez de
  (SELECT auth.uid()) que permite cache por query.
Impacto no negócio: Em tabelas com muitas linhas (ai_usage_quotas cresce com uso),
  cada linha avaliada pela policy chama auth.uid() como função volátil, impedindo
  o planner de usar o resultado em cache. Degrada queries com muitas linhas.
Correção proposta:
  Substituir auth.uid() por (SELECT auth.uid()) nas policies afetadas.
  Exemplo:
    USING (user_id = auth.uid())
    → USING (user_id = (SELECT auth.uid()))
Classe de escrita: APROVAÇÃO (ALTER POLICY)
Risco de regressão: baixo
Esforço: P
```

---

### SB-0006

```
ID: SB-0006
Seção: A.4
Severidade: MÉDIO
Tipo: INTEGRIDADE
Objeto: kit_quote_requests.user_id, kit_save_requests.user_id (FK sem índice)
Evidência: get_advisors(performance) → "no_primary_key" / missing index hints
  Verificado: kit_quote_requests e kit_save_requests têm FK para auth.users.id
  sem índice correspondente na coluna user_id.
Impacto no negócio: Queries que filtram pedidos de orçamento ou de salvamento por
  usuário fazem seq scan. Com volume de kits crescendo, buscas do painel admin ficam lentas.
Correção proposta:
  CREATE INDEX CONCURRENTLY idx_kit_quote_requests_user_id 
    ON public.kit_quote_requests(user_id);
  CREATE INDEX CONCURRENTLY idx_kit_save_requests_user_id 
    ON public.kit_save_requests(user_id);
Classe de escrita: APROVAÇÃO (DDL — CREATE INDEX CONCURRENTLY)
Risco de regressão: nenhum
Esforço: P
```

---

### SB-0007

```
ID: SB-0007
Seção: A.3
Severidade: MÉDIO
Tipo: SEGURANÇA
Objeto: policies rls_restrictive_* com USING (true) em tabelas sensíveis
  ai_usage_quotas, art_file_attachments, kit_collaborators,
  notification_preferences, push_subscriptions, recently_viewed_products,
  system_kill_switches, product_ai_content, product_fiscal, product_seo, product_supply
Evidência:
  SELECT policyname, tablename, qual FROM pg_policies
  WHERE policyname LIKE 'rls_restrictive%' AND qual = '(true)';
  → 11 tabelas com policy ALL cmd com USING (true) sem filtro por tenant/usuário
Impacto no negócio: A policy "rls_restrictive_*" com USING (true) num comando ALL
  age como permissão irrestrita dentro daquela camada da stack RLS. Se não há
  outra policy mais restritiva, usuários autenticados de diferentes empresas podem
  ver dados uns dos outros nessas tabelas.
Correção proposta:
  Auditar cada tabela: verificar se existe outra policy de isolamento por org/tenant.
  Se não existir → adicionar filtro de isolamento na rls_restrictive_* ou criar policy
  dedicada com USING (user_id = (SELECT auth.uid())) ou (org_id = get_current_org()).
Classe de escrita: APROVAÇÃO (ALTER/CREATE POLICY)
Risco de regressão: alto — pode bloquear acesso legítimo se filtro for muito restritivo
Esforço: G
```

---

### SB-0008

```
ID: SB-0008
Seção: A.3
Severidade: MÉDIO
Tipo: SEGURANÇA
Objeto: companies.companies_select_authenticated
Evidência:
  SELECT policyname, qual FROM pg_policies
  WHERE tablename = 'companies' AND cmd = 'SELECT';
  → companies_select_authenticated: USING (true) para role authenticated
Impacto no negócio: Qualquer usuário autenticado vê TODAS as empresas cadastradas,
  incluindo nome, CNPJ, dados de contato de clientes concorrentes.
  Em plataforma B2B multiempresa, isso é vazamento de dados entre tenants.
Correção proposta:
  Verificar se a tabela tem coluna de isolamento (ex: id, created_by, org_id).
  Se for intencionalmente pública para usuários autenticados → documentar.
  Caso contrário → filtrar por empresa do usuário:
    USING (id = get_current_company_id() OR EXISTS (
      SELECT 1 FROM company_members WHERE user_id = (SELECT auth.uid()) AND company_id = companies.id
    ))
Classe de escrita: APROVAÇÃO
Risco de regressão: alto — pode quebrar seleção de empresa no onboarding
Esforço: M
```

---

### SB-0009

```
ID: SB-0009
Seção: A.4
Severidade: BAIXO
Tipo: INTEGRIDADE
Objeto: public._backup_stock_daily_summary_20260618
Evidência: tabela presente no schema com prefixo _backup_, tamanho ~42MB
  Criada em 2026-06-18, não referenciada por nenhuma migration ativa.
Impacto no negócio: 42MB de dado histórico de backup ocupando espaço em prod.
  Não há risco de segurança imediato, mas a tabela não deveria existir permanentemente.
Correção proposta:
  DROP TABLE public._backup_stock_daily_summary_20260618;
  (fazer backup local antes se necessário)
Classe de escrita: APROVAÇÃO (DDL — DROP TABLE com dado de negócio)
Risco de regressão: nenhum (tabela órfã)
Esforço: P
```

---

### SB-0010

```
ID: SB-0010
Seção: A.6
Severidade: INFO
Tipo: LACUNA
Objeto: 7 cron jobs inativos
  process-webhook-outbox, pipeline-classify-categories, dispatcher-log-sync,
  monitor-connections, image-dimensions-backfill,
  refresh-analytics-mv-product-intelligence, refresh-analytics-mv-stock-velocity
Evidência: cron.job WHERE active = false → 7 registros
Impacto no negócio: process-webhook-outbox e pipeline-classify-categories eram
  funções de pipeline altamente frequentes. Se foram desativados por migração de
  responsabilidade, os equivalentes ativos devem ser verificados.
  Se foram desativados por bug, podem causar acúmulo silencioso em filas.
Correção proposta: Verificar se existe fila de webhooks pendente sem processamento.
  Se `fn_process_webhook_outbox_batch` ainda é chamada por algum mecanismo ativo → OK.
  Se não → avaliar reativação ou remoção do job e da função.
Classe de escrita: APROVAÇÃO (cron.alter_job é DDL)
Risco de regressão: médio se reativado sem verificar volume de backlog
Esforço: P
```

---

### SB-0011

```
ID: SB-0011
Seção: A.10
Severidade: MÉDIO
Tipo: SEGURANÇA
Objeto: auth_logs — "403: invalid claim: missing sub claim" (625 hits/24h)
Evidência:
  query_logs (24h) → auth_logs: 625 × "403: invalid claim: missing sub claim"
Impacto no negócio: Alto volume de requests chegando ao GoTrue sem campo `sub`
  no JWT. Provavelmente tráfego legítimo de service_role interno, mas volume
  elevado pode indicar que alguma edge function ou cron está fazendo requests
  desnecessários ao auth service, gerando carga.
  122 × "refresh token length is not valid" sugere tentativas de token manipulation.
Correção proposta: Investigar origem dos requests com missing sub:
  1. Correlacionar com logs de edge functions no mesmo horário
  2. Se forem crons/edges com service_role → normal, não requer ação
  3. Se forem requests externos → ativar rate limiting de auth no dashboard
Classe de escrita: AUTÔNOMA (investigação, sem DDL)
Risco de regressão: nenhum
Esforço: P
```

---

## Seções NÃO VERIFICADO

| Seção | Motivo |
|---|---|
| A.2 — Drift types.ts | generate_typescript_types não executado (requer ambiente local); migrations verificadas parcialmente |
| A.5 — EXPLAIN top 10 | Queries de `pg_stat_statements` com timeout; NÃO VERIFICADO |
| A.7 — DB functions individual | 1.334 funções; análise individual por limite de sessão; SECURITY DEFINER verificado em lote (570 com search_path OK) |
| A.8 — Edge code review | Code review das 36 funções verify_jwt=false; NÃO VERIFICADO por limite de sessão |
| A.11 — RLS testes por role | Testes SET LOCAL ROLE não executados |
| A.12 — Lacunas operacionais | PITR/backup, alertas, staging: NÃO VERIFICADO |

---

## Fase B — PRs aguardando aprovação

As correções abaixo exigem DDL em produção ou deploy de edge. Todas são classe **APROVAÇÃO**.

Ao responder com `APROVADO <IDs>` ou `APROVADO todos`, executo na ordem de severidade:

| ID | O que muda | Risco | Esforço |
|---|---|---|---|
| SB-0001 | Remove auth.users da publication realtime | baixo | P |
| SB-0003 | REPLICA IDENTITY FULL nas 3 tabelas realtime | baixo | P |
| SB-0006 | CREATE INDEX CONCURRENTLY nos 2 FKs de kit_* | nenhum | P |
| SB-0005 | Substitui auth.uid() por (SELECT auth.uid()) em 8 policies | baixo | P |
| SB-0008 | Avalia policy companies_select_authenticated | alto | M |
| SB-0007 | Audita e corrige 11 tabelas com rls_restrictive USING (true) | alto | G |
| SB-0002 | Code review + ajuste das 36 edges verify_jwt=false | médio | G |
| SB-0004 | DROP dos 499 índices não usados (script gerado) | médio | M |
| SB-0009 | DROP TABLE _backup_stock_daily_summary_20260618 | nenhum | P |

**SB-0010 e SB-0011** são informativos/investigativos, não requerem aprovação para análise.

---

## Arquivos de inventário gerados

- `auditoria-supabase/inventario/baseline_antes.json`
- `auditoria-supabase/inventario/01_tabelas.md`
- `auditoria-supabase/inventario/02_crons.md`
- `auditoria-supabase/inventario/03_edges.md`
- `auditoria-supabase/inventario/04_realtime.md`
- `auditoria-supabase/inventario/05_auth_logs.md`
- `auditoria-supabase/progresso.json`
