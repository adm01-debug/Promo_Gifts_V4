# public.supplier_replenishment_events

> Append-only ledger de eventos de reposição de estoque. Cada linha representa uma promessa de chegada (promised_date + promised_quantity) capturada de variant_supplier_sources (slots 1-6), e opcionalmente casada com um delta positivo real em stock_snapshots. resolution: pending → fulfilled/expired/superseded. Criado: 2026-06-22. Arquitetura: Gold layer (read-only para app).

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
| usada por views | public.mv_supplier_reliability |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | PK UUID gerado. Imutável após criação. |
| 2 | `source_id` | `uuid` | não |  |  | FK lógica para variant_supplier_sources.id (sem FK física para evitar cascade delete). Identifica a linha de estoque que gerou a promessa. |
| 3 | `supplier_id` | `uuid` | não |  |  | Desnormalizado de variant_supplier_sources.supplier_id para queries sem JOIN. |
| 4 | `variant_id` | `uuid` | não |  |  | Desnormalizado de variant_supplier_sources.variant_id para queries sem JOIN. |
| 5 | `slot` | `smallint` | não |  |  | Posição 1-6 correspondente a next_date_N/next_quantity_N em variant_supplier_sources. |
| 6 | `promised_date` | `date` | não |  |  | Data de chegada prometida pelo fornecedor (variant_supplier_sources.next_date_N). |
| 7 | `promised_quantity` | `integer` | não |  |  | Quantidade prometida (variant_supplier_sources.next_quantity_N). Sempre > 0. |
| 8 | `observed_at` | `timestamp with time zone` | não |  |  | Timestamp em que a promessa foi capturada (= variant_supplier_sources.updated_at no momento da captura). |
| 9 | `resolution` | `text` | não | `'pending'::text` |  | Estado do ciclo de vida: pending = aguardando confirmação; fulfilled = chegada confirmada via delta positivo em stock_snapshots; expired = data passou + 15 dias sem confirmação (fn_expire_pending_promises); superseded = promessa substituída por nova promessa no mesmo slot antes de vencer. |
| 10 | `actual_date` | `date` | sim |  |  | Data em que o estoque real chegou (capturada de stock_snapshots.captured_at::date). |
| 11 | `actual_quantity` | `integer` | sim |  |  | Delta de estoque observado (stock_main_delta + stock_other_delta) no snapshot casado. |
| 12 | `delay_days` | `integer` | sim | ` CASE     WHEN (actual_date IS NULL) THEN NULL::integer     ELSE (actual_date - promised_date) END` | s | GENERATED: actual_date - promised_date. Negativo = chegou antes. NULL se não fulfilled. |
| 13 | `fulfillment_ratio` | `numeric(5,4)` | sim | ` CASE     WHEN ((actual_quantity IS NULL) OR (promised_quantity = 0)) THEN NULL::numeric     ELSE LEAST(1.0, ((actual_quantity)::numeric / (promised_quantity)::numeric)) END` | s | GENERATED: LEAST(1.0, actual_quantity / promised_quantity). NULL se não fulfilled. Capped em 1.0 para evitar superscore em recebimentos maiores que o prometido. |
| 14 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `arrival_snapshot_id` | `bigint` | sim |  |  | ID (bigint) do stock_snapshots que confirmou o fulfillment. NOTA: stock_snapshots.id é bigint, não UUID. FK lógica sem constraint física porque stock_snapshots é purgado a cada 14 dias. |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_replenishment_events_actual_quantity_check | CHECK | `CHECK (actual_quantity IS NULL OR actual_quantity >= 0)` |  |  | sim |
| supplier_replenishment_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_replenishment_events_promised_quantity_check | CHECK | `CHECK (promised_quantity > 0)` |  |  | sim |
| supplier_replenishment_events_resolution_check | CHECK | `CHECK (resolution = ANY (ARRAY['pending'::text, 'fulfilled'::text, 'expired'::text, 'superseded'::text]))` |  |  | sim |
| supplier_replenishment_events_slot_check | CHECK | `CHECK (slot >= 1 AND slot <= 6)` |  |  | sim |
| uq_sre_promise | UNIQUE | `UNIQUE (source_id, slot, promised_date, promised_quantity, observed_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sre_arrival_snapshot | btree | arrival_snapshot_id | não | sim | `(arrival_snapshot_id IS NOT NULL)` | `CREATE INDEX idx_sre_arrival_snapshot ON public.supplier_replenishment_events USING btree (arrival_snapshot_id) WHERE (arrival_snapshot_id IS NOT NULL)` |
| idx_sre_fulfilled_at | btree | resolved_at | não | sim | `(resolution = 'fulfilled'::text)` | `CREATE INDEX idx_sre_fulfilled_at ON public.supplier_replenishment_events USING btree (resolved_at DESC) WHERE (resolution = 'fulfilled'::text)` |
| idx_sre_pending | btree | resolution | não | sim | `(resolution = 'pending'::text)` | `CREATE INDEX idx_sre_pending ON public.supplier_replenishment_events USING btree (resolution) WHERE (resolution = 'pending'::text)` |
| idx_sre_source_pending | btree | source_id, promised_date | não | sim | `(resolution = 'pending'::text)` | `CREATE INDEX idx_sre_source_pending ON public.supplier_replenishment_events USING btree (source_id, promised_date) WHERE (resolution = 'pending'::text)` |
| idx_sre_supplier_date | btree | supplier_id, promised_date | não | sim |  | `CREATE INDEX idx_sre_supplier_date ON public.supplier_replenishment_events USING btree (supplier_id, promised_date DESC)` |
| idx_sre_variant_date | btree | variant_id, promised_date | não | sim |  | `CREATE INDEX idx_sre_variant_date ON public.supplier_replenishment_events USING btree (variant_id, promised_date DESC)` |
| supplier_replenishment_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_replenishment_events_pkey ON public.supplier_replenishment_events USING btree (id)` |
| uq_sre_promise | btree | source_id, slot, promised_date, promised_quantity, observed_at | sim | sim |  | `CREATE UNIQUE INDEX uq_sre_promise ON public.supplier_replenishment_events USING btree (source_id, slot, promised_date, promised_quantity, observed_at)` |


## Policies (RLS)

### `auth read events`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sre_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_sre_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
