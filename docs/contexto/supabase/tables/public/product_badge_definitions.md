# public.product_badge_definitions

> Registro canonico de governanca das badges de PRODUTOS (nome, cores, icones, onde/como usar, regra de negocio, prioridade, config). Aditivo: nao altera o calculo/render existente. fix_version=pbd_v1_20260627. ANTI-REGRESSAO: nao remover RLS; manter SET search_path nas fns fn_pbd_*; badge_key e imutavel; badges is_system nao sao deletaveis.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `badge_key` | `text` | não |  |  | Slug estavel e imutavel (identidade). Casa com o tipo do badge no frontend. |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `short_label` | `text` | sim |  |  |  |
| 5 | `description` | `text` | não | `''::text` |  |  |
| 6 | `business_rule` | `text` | não | `''::text` |  |  |
| 7 | `category` | `text` | não |  |  | Agrupamento conceitual: status_estoque\|novidade\|curadoria\|comercial\|inteligencia\|atributo\|acao\|sistema. |
| 8 | `source_kind` | `text` | não |  |  | Como e dirigido: computed\|manual\|pipeline\|intelligence\|ui_only\|hybrid. |
| 9 | `data_source` | `text` | não | `''::text` |  |  |
| 10 | `placements` | `text[]` | não | `'{}'::text[]` |  | ONDE aparece no card: card_header_left\|card_header_right\|card_body\|card_footer\|corner_bl\|corner_br\|intelligence_panel\|product_detail\|catalog. |
| 11 | `surfaces` | `text[]` | não | `'{}'::text[]` |  | EM QUE telas aparece: catalog\|super_filter\|product_detail\|novelties\|comparison\|quote_builder\|inventory. |
| 12 | `icon_lucide` | `text` | sim |  |  |  |
| 13 | `icon_emoji` | `text` | sim |  |  |  |
| 14 | `color_token` | `text` | não | `'neutral'::text` |  |  |
| 15 | `class_bg` | `text` | sim |  |  |  |
| 16 | `class_text` | `text` | sim |  |  |  |
| 17 | `class_border` | `text` | sim |  |  |  |
| 18 | `priority` | `integer` | não | `100` |  | Peso de prioridade/proeminencia (maior = mais proeminente). |
| 19 | `sort_order` | `integer` | não | `0` |  |  |
| 20 | `config` | `jsonb` | não | `'{}'::jsonb` |  | Parametros especificos do badge (limiares, colunas de expiracao, etc). |
| 21 | `supports_expiration` | `boolean` | não | `false` |  |  |
| 22 | `is_enabled` | `boolean` | não | `true` |  | Liga/desliga global (governanca). Para hot_item/best_seller projeta em admin_settings.intelligence_badges. |
| 23 | `is_system` | `boolean` | não | `true` |  | Badge de sistema (semeada). Nao deletavel; apenas configuravel/desabilitavel. |
| 24 | `notes` | `text` | não | `''::text` |  |  |
| 25 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 26 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 27 | `created_by` | `uuid` | sim | `auth.uid()` |  |  |
| 28 | `updated_by` | `uuid` | sim | `auth.uid()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pbd_badge_key_format | CHECK | `CHECK (badge_key ~ '^[a-z][a-z0-9_]*$'::text)` |  |  | sim |
| pbd_badge_key_unique | UNIQUE | `UNIQUE (badge_key)` |  |  | sim |
| pbd_category_valid | CHECK | `CHECK (category = ANY (ARRAY['status_estoque'::text, 'novidade'::text, 'curadoria'::text, 'comercial'::text, 'inteligencia'::text, 'atributo'::text, 'acao'::text, 'sistema'::text]))` |  |  | sim |
| pbd_color_token_valid | CHECK | `CHECK (color_token = ANY (ARRAY['neutral'::text, 'red'::text, 'orange'::text, 'amber'::text, 'yellow'::text, 'green'::text, 'teal'::text, 'cyan'::text, 'blue'::text, 'indigo'::text, 'violet'::text, 'purple'::text, 'pink'::text, 'stone'::text, 'brand'::text]))` |  |  | sim |
| pbd_placements_valid | CHECK | `CHECK (placements <@ ARRAY['card_header_left'::text, 'card_header_right'::text, 'card_body'::text, 'card_footer'::text, 'corner_bl'::text, 'corner_br'::text, 'intelligence_panel'::text, 'product_detail'::text, 'catalog'::text])` |  |  | sim |
| pbd_priority_range | CHECK | `CHECK (priority >= 0 AND priority <= 1000)` |  |  | sim |
| pbd_source_kind_valid | CHECK | `CHECK (source_kind = ANY (ARRAY['computed'::text, 'manual'::text, 'pipeline'::text, 'intelligence'::text, 'ui_only'::text, 'hybrid'::text]))` |  |  | sim |
| pbd_surfaces_valid | CHECK | `CHECK (surfaces <@ ARRAY['catalog'::text, 'super_filter'::text, 'product_detail'::text, 'novelties'::text, 'comparison'::text, 'quote_builder'::text, 'inventory'::text])` |  |  | sim |
| product_badge_definitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pbd_category | btree | category | não | sim |  | `CREATE INDEX idx_pbd_category ON public.product_badge_definitions USING btree (category)` |
| idx_pbd_enabled | btree | is_enabled | não | sim |  | `CREATE INDEX idx_pbd_enabled ON public.product_badge_definitions USING btree (is_enabled)` |
| idx_pbd_sort | btree | sort_order, priority | não | sim |  | `CREATE INDEX idx_pbd_sort ON public.product_badge_definitions USING btree (sort_order, priority DESC)` |
| idx_pbd_source_kind | btree | source_kind | não | sim |  | `CREATE INDEX idx_pbd_source_kind ON public.product_badge_definitions USING btree (source_kind)` |
| pbd_badge_key_unique | btree | badge_key | sim | sim |  | `CREATE UNIQUE INDEX pbd_badge_key_unique ON public.product_badge_definitions USING btree (badge_key)` |
| product_badge_definitions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_badge_definitions_pkey ON public.product_badge_definitions USING btree (id)` |


## Policies (RLS)

### `pbd_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_system = false))` |
| WITH CHECK |  |

### `pbd_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `pbd_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `pbd_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pbd_before_write | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_pbd_before_write |
| trg_pbd_block_system_delete | BEFORE | DELETE | ROW | enabled | public.fn_pbd_block_system_delete |
| trg_pbd_project_intelligence | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_pbd_project_intelligence_settings |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, SELECT, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
