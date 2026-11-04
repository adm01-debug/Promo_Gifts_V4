# public.ai_enrichment_queue

> Fila de enriquecimento IA (DeepSeek V3) — sistema ATIVO de geração de conteúdo para produtos.
603 produtos enriquecidos em 15/jun/2026 | 2.084 total desde jun/2026 | rodando diariamente.

━━━━ ARQUITETURA DUAL — BATCH + ON-DEMAND ━━━━

  Existem DOIS sistemas de IA para produtos. São complementares, não concorrentes:

  ┌─ SISTEMA 1: BATCH (esta tabela) ──────────────────────────────────────────┐
  │  Disparo:   pg_cron job 96 — todo dia 04:00                               │
  │  Worker:    n8n workflow rSUmKdWlPU8BOLdI (DeepSeek V3)                  │
  │  Volume:    ~600 produtos/dia em background                                │
  │  Alvo:      TODOS os produtos sem conteúdo AI (varredura sistemática)      │
  │  Salva via: fn_save_ai_enrichment_results() → products + product_ai_history│
  └───────────────────────────────────────────────────────────────────────────┘

  ┌─ SISTEMA 2: ON-DEMAND (word-magic edge function) ─────────────────────────┐
  │  Disparo:   Usuário clica ✨ no frontend (ProductCard / ProductDetailHero) │
  │  Worker:    Edge function 'word-magic' (DeepSeek V3, max_tokens=2048)    │
  │  Volume:    1 produto por vez, resposta imediata                           │
  │  Alvo:      Produto específico escolhido pelo usuário                      │
  │  Salva via: UPDATE direto em products (sem passar pela fila)               │
  └───────────────────────────────────────────────────────────────────────────┘

  ANTI-COLISÃO entre os dois sistemas:
    fn_save_ai_enrichment_results() NÃO sobrescreve ai_title/ai_description se:
      - O campo está em products.locked_fields  E  products.ai_version > 0
    Isso garante que uma edição feita pelo usuário via word-magic não seja
    sobrescrita pelo batch noturno. O batch respeita o trabalho on-demand.

  EM RESUMO: batch = enriquece todos em segundo plano | on-demand = imediato para 1 produto.

━━━━ PROPÓSITO ━━━━

  Enfileira produtos que precisam de ai_title, ai_description, ai_summary e/ou schema_json
  gerados por IA. Consumida pelo n8n (workflow rSUmKdWlPU8BOLdI) via fn_dequeue_ai_enrichment().
  Resultados salvos em products via fn_save_ai_enrichment_results().

━━━━ STATUS (enum CHECK) ━━━━

  pending    → aguardando processamento pelo worker
  processing → worker reclamou o item (locked_at/locked_by preenchidos)
  done       → enriquecimento concluído com sucesso (completed_at preenchido)
  error      → falhou após esgotar max_attempts (last_error preenchido)
  skipped    → ignorado intencionalmente (produto inelegível)

━━━━ ENRICHMENT_TYPE (enum CHECK) ━━━━

  ai_title    → apenas título IA
  ai_summary  → apenas resumo IA
  schema_json → apenas schema JSON estruturado
  all         → todos os campos AI (padrão do pg_cron diário)

━━━━ FUNÇÕES DO ECOSSISTEMA ━━━━

  fn_enqueue_ai_enrichment(type, supplier_id, limit, priority, force_v0)
    → insere produtos elegíveis na fila. ON CONFLICT: reseta status=error → pending.
  fn_dequeue_ai_enrichment(batch_size, locked_by, type)
    → worker claims itens via FOR UPDATE SKIP LOCKED. Retorna 24 campos por produto.
    → SECURITY DEFINER. batch_size respeita exatamente o que o caller passa (default=100).
  fn_save_ai_enrichment_results(queue_id, product_id, ...)
    → salva resultados em products, registra em product_ai_history, marca done/error.
    → Respeita locked_fields: não sobrescreve campos editados manualmente.
  fn_cleanup_ai_queue_on_product_deactivate()  [TRIGGER]
    → AFTER UPDATE em products: remove pending/processing/error ao desativar produto.

━━━━ PG_CRON (job 96) ━━━━

  Horário: 0 4 * * * (diariamente às 04:00)
  Comando: fn_enqueue_ai_enrichment(all, NULL, 5000, priority=5, force_v0=true)
  Resultado: re-enfileira produtos sem ai_title/description/summary/schema e ai_version=0.

━━━━ ÍNDICES ━━━━

  idx_ai_queue_pending      → (priority, created_at) WHERE status=pending    ← worker query
  idx_ai_queue_status       → (status, updated_at)                           ← monitoramento
  idx_ai_queue_product_id   → (product_id)                                   ← FK lookups
  idx_ai_queue_locked_at    → (locked_at) WHERE status=processing            ← recovery queries
  uq_product_enrichment_type → UNIQUE(product_id, enrichment_type)           ← sem duplicatas

━━━━ RECOVERY DE ITENS STUCK ━━━━

  -- Reseta stuck > 2h com tentativas restantes → pending:
  UPDATE ai_enrichment_queue
  SET status='pending', locked_at=NULL, locked_by=NULL,
      last_error='reset: stuck > 2h', updated_at=now()
  WHERE status='processing' AND locked_at < now()-interval '2 hours'
    AND attempts < max_attempts;

  -- Esgotados → error:
  UPDATE ai_enrichment_queue
  SET status='error', locked_at=NULL, locked_by=NULL, updated_at=now()
  WHERE status='processing' AND locked_at < now()-interval '2 hours'
    AND attempts >= max_attempts;

━━━━ HISTÓRICO DE CORREÇÕES (2026-06-15) ━━━━

  BUG CORRIGIDO: fn_dequeue tinha GREATEST(p_batch_size, 100) que forçava
  mínimo 100 claims mesmo quando o worker processava menos, causando stuck em massa.
  Corrigido para LIMIT p_batch_size (respeita o caller).

  RLS CORRIGIDA: policy SELECT tinha org_id hardcoded. Substituída por
  is_admin_or_above() OR organization_id IN (user_organizations).

━━━━ RLS ━━━━

  SELECT → authenticated: is_admin_or_above() OU org do usuário (dinâmico).
  INSERT/UPDATE/DELETE: sem policy → apenas service_role (workers n8n).

━━━━ COBERTURA (jun/2026) ━━━━

  1.440 produtos com ai_title+ai_description+ai_summary = 20.2% do catálogo ativo.
  ~5.965 pendentes | ~600/dia | ~10 dias para drenar a fila atual.
  VIEW de monitoramento: vw_ai_enrichment_status

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_products_ai_coverage, public.v_system_alerts, public.v_system_health_dashboard, public.vw_ai_enrichment_status |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `enrichment_type` | `text` | não |  |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `priority` | `integer` | sim | `5` |  |  |
| 6 | `attempts` | `integer` | sim | `0` |  |  |
| 7 | `max_attempts` | `integer` | sim | `3` |  |  |
| 8 | `last_error` | `text` | sim |  |  |  |
| 9 | `last_attempt_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `locked_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `locked_by` | `text` | sim |  |  |  |
| 15 | `organization_id` | `uuid` | sim | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_enrichment_queue_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ai_enrichment_queue_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| chk_enrichment_type | CHECK | `CHECK (enrichment_type = ANY (ARRAY['ai_title'::text, 'ai_summary'::text, 'schema_json'::text, 'all'::text]))` |  |  | sim |
| chk_status | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'error'::text, 'skipped'::text]))` |  |  | sim |
| uq_product_enrichment_type | UNIQUE | `UNIQUE (product_id, enrichment_type)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_enrichment_queue_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_enrichment_queue_pkey ON public.ai_enrichment_queue USING btree (id)` |
| idx_ai_queue_locked_at | btree | locked_at | não | sim | `(status = 'processing'::text)` | `CREATE INDEX idx_ai_queue_locked_at ON public.ai_enrichment_queue USING btree (locked_at) WHERE (status = 'processing'::text)` |
| idx_ai_queue_pending | btree | priority, created_at | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_ai_queue_pending ON public.ai_enrichment_queue USING btree (priority, created_at) WHERE (status = 'pending'::text)` |
| idx_ai_queue_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_ai_queue_product_id ON public.ai_enrichment_queue USING btree (product_id)` |
| idx_ai_queue_status | btree | status, updated_at | não | sim |  | `CREATE INDEX idx_ai_queue_status ON public.ai_enrichment_queue USING btree (status, updated_at)` |
| uq_product_enrichment_type | btree | product_id, enrichment_type | sim | sim |  | `CREATE UNIQUE INDEX uq_product_enrichment_type ON public.ai_enrichment_queue USING btree (product_id, enrichment_type)` |


## Policies (RLS)

### `ai_queue_select_dynamic`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (organization_id IN ( SELECT user_organizations.organization_id    FROM user_organizations   WHERE (user_organizations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
