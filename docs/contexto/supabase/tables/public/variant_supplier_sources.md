# public.variant_supplier_sources

> Fonte dados por variante x fornecedor. BACKLOG: cost_price_1..5+min_qty_1..5 → supplier_price_tiers; next_quantity/date_1..6 → variant_restock_schedule. Bloqueado por 24+ refs frontend.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | full |
| vem de extensão | não |
| usada por views | analytics.mv_stock_velocity, public.mv_stock_rupture_alert, public.v_kit_max_quantity, public.v_system_alerts, public.v_system_health_dashboard, public.v_variant_sale_prices_public, public.vw_rupture_gap_purchase, public.vw_rupture_live_divergence, public.vw_stock_quantity_outliers, public.vw_variant_sale_prices |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `variant_id` | `uuid` | não |  |  |  |
| 4 | `supplier_id` | `uuid` | não |  |  |  |
| 5 | `quantity` | `integer` | sim | `0` |  | Quantidade em estoque deste fornecedor para esta variante. Trigger sincroniza cache em products.stock_quantity. |
| 6 | `source` | `character varying(50)` | sim | `'manual'::character varying` |  |  |
| 7 | `last_synced_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `sync_status` | `character varying(50)` | sim | `'synced'::character varying` |  |  |
| 9 | `sync_error` | `text` | sim |  |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `next_quantity_1` | `integer` | sim |  |  |  |
| 13 | `next_date_1` | `date` | sim |  |  |  |
| 14 | `next_quantity_2` | `integer` | sim |  |  |  |
| 15 | `next_date_2` | `date` | sim |  |  |  |
| 16 | `next_quantity_3` | `integer` | sim |  |  |  |
| 17 | `next_date_3` | `date` | sim |  |  |  |
| 18 | `supplier_sku` | `character varying(100)` | sim |  |  | SKU/código desta variante no sistema do fornecedor. Ex: XBZ usa "01320-AZ", SPOT usa "22900-105" |
| 19 | `supplier_color_code` | `character varying(50)` | sim |  |  | Código da cor no sistema do fornecedor. Ex: SPOT usa "104" para Azul, XBZ usa "AZ" |
| 20 | `supplier_color_name` | `character varying(100)` | sim |  |  | Nome da cor como o fornecedor chama. Ex: "Azul Royal", "Azul Marinho", "Navy Blue" |
| 21 | `cost_price` | `numeric(10,4)` | sim |  |  | Custo unitário atual de compra (menor faixa ou preço base) |
| 22 | `list_price` | `numeric(10,4)` | sim |  |  | Preço de tabela/lista do fornecedor (antes de descontos por quantidade) |
| 23 | `cost_price_1` | `numeric(10,4)` | sim |  |  | Preço de custo faixa 1 (menor quantidade). cost_price_2/3/4/5 para faixas maiores. |
| 24 | `min_qty_1` | `integer` | sim |  |  | Quantidade mínima para faixa 1 |
| 25 | `cost_price_2` | `numeric(10,4)` | sim |  |  | Custo unitário faixa 2 |
| 26 | `min_qty_2` | `integer` | sim |  |  | Quantidade mínima para faixa 2 |
| 27 | `cost_price_3` | `numeric(10,4)` | sim |  |  | Custo unitário faixa 3 |
| 28 | `min_qty_3` | `integer` | sim |  |  | Quantidade mínima para faixa 3 |
| 29 | `cost_price_4` | `numeric(10,4)` | sim |  |  | Custo unitário faixa 4 |
| 30 | `min_qty_4` | `integer` | sim |  |  | Quantidade mínima para faixa 4 |
| 31 | `cost_price_5` | `numeric(10,4)` | sim |  |  | Custo unitário faixa 5 (maior quantidade = melhor preço) |
| 32 | `min_qty_5` | `integer` | sim |  |  | Quantidade mínima para faixa 5 |
| 33 | `lead_time_days` | `integer` | sim |  |  | Prazo de entrega em dias úteis para este fornecedor |
| 34 | `min_order_qty` | `integer` | sim | `1` |  | Quantidade mínima para fazer pedido neste fornecedor |
| 35 | `pack_quantity` | `integer` | sim | `1` |  | Quantidade de unidades por embalagem/pack |
| 36 | `sale_multiplier` | `integer` | sim | `1` |  | Deve comprar em múltiplos de X unidades |
| 37 | `is_preferred` | `boolean` | sim | `false` |  | Marca este VSS como preferencial para a variante. 100% das variantes têm exatamente 1 preferred. |
| 38 | `priority` | `integer` | sim | `99` |  | Prioridade para seleção automática (1 = maior prioridade). Usado quando há empate em outros critérios |
| 39 | `is_active` | `boolean` | sim | `true` |  | Se este fornecedor está ativo para venda desta variante |
| 40 | `supplier_images` | `jsonb` | sim | `'[]'::jsonb` |  | Array de URLs de imagens enviadas pelo fornecedor. Formato: ["https://...", "https://..."] |
| 41 | `supplier_videos` | `jsonb` | sim | `'[]'::jsonb` |  | Array de URLs de vídeos enviados pelo fornecedor. Formato: ["https://...", "https://..."] |
| 42 | `supplier_thumbnail` | `character varying(500)` | sim |  |  | URL da imagem principal/thumbnail deste fornecedor |
| 43 | `removed_from_api` | `boolean` | sim | `false` |  | TRUE se o item não aparece mais na API do fornecedor. Mantemos o registro para histórico, mas não oferecemos para venda |
| 44 | `removed_at` | `timestamp with time zone` | sim |  |  | Data/hora em que foi detectada a remoção da API |
| 45 | `raw_data` | `jsonb` | sim |  |  | Backup dos dados brutos recebidos da API do fornecedor. Útil para debug e reprocessamento |
| 46 | `stock_main_warehouse` | `integer` | não | `0` |  | Estoque no depósito principal do fornecedor (pronta entrega). XBZ: QuantidadeDisponivelEstoquePrincipal |
| 47 | `stock_other_warehouses` | `integer` | não | `0` |  | Estoque em depósitos secundários/trânsito (prazo de transferência). XBZ: QuantidadeDisponivel - EstoquePrincipal |
| 48 | `supplier_availability_status` | `character varying(20)` | sim |  |  | Status de disponibilidade do fornecedor (SIM, CONSULTE, INDISPONÍVEL). Fonte: API /ruiz/consultaEstoque campo Disponivel |
| 49 | `supplier_ipi_rate` | `numeric(5,2)` | sim |  |  | Alíquota de IPI informada pelo fornecedor para este SKU. Fonte XBZ: campo IpiTaxa da API /ruiz/consultaEstoque. NULL = fornecedor não informou. |
| 50 | `supplier_branch_id` | `uuid` | sim |  |  | Filial do fornecedor que fatura este item. Define UF de origem para calculo de ICMS. |
| 51 | `icms_rate` | `numeric(5,2)` | sim |  |  | Aliquota ICMS desta operacao. Depende da UF da filial (supplier_branch) x UF destino. |
| 52 | `pis_rate` | `numeric(5,4)` | sim |  |  |  |
| 53 | `cofins_rate` | `numeric(5,4)` | sim |  |  |  |
| 54 | `cfop` | `character varying(4)` | sim |  |  | CFOP da operacao. Ex: 5102 (venda interna), 6102 (venda interestadual). |
| 55 | `csosn` | `character varying(4)` | sim |  |  | CSOSN fiscal. Hoje 0 registros. 7 refs frontend. DROP requer sprint fiscal dedicada. |
| 56 | `cest` | `character varying(7)` | sim |  |  |  |
| 57 | `cst` | `character varying(3)` | sim |  |  | Código de Situação Tributária. Ex: 100 (importado tributado), 060 (nacional ST), 500 (nacional produção) |
| 58 | `operation_nature` | `character varying(100)` | sim |  |  | Natureza da operação fiscal. Ex: Venda de Merc. Adquirida de Terceiros, Venda de Produção, Venda com ST |
| 59 | `price_updated_at` | `timestamp with time zone` | sim |  |  |  |
| 60 | `next_quantity_4` | `integer` | sim |  |  | Restock slot 4. Hoje 0 registros. API Spot não retorna 4+ slots. DROP requer refatoração coordenada (5 funções + frontend). |
| 61 | `next_quantity_5` | `integer` | sim |  |  | Restock slot 5. Hoje 0 registros. DROP requer refatoração coordenada. |
| 62 | `next_quantity_6` | `integer` | sim |  |  | Restock slot 6. Hoje 0 registros. DROP requer refatoração coordenada. |
| 63 | `next_date_4` | `date` | sim |  |  | Data restock slot 4. Hoje 0 registros. DROP requer refatoração coordenada. |
| 64 | `next_date_5` | `date` | sim |  |  | Data restock slot 5. Hoje 0 registros. |
| 65 | `next_date_6` | `date` | sim |  |  | Data restock slot 6. Hoje 0 registros. |
| 66 | `your_price` | `numeric` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_vss_cost_price_not_zero | CHECK | `CHECK (cost_price IS NULL OR cost_price > 0::numeric)` |  |  | sim |
| chk_vss_priority_positive | CHECK | `CHECK (priority IS NULL OR priority > 0)` |  |  | sim |
| chk_vss_quantity_positive | CHECK | `CHECK (quantity IS NULL OR quantity >= 0)` |  |  | sim |
| variant_stocks_organization_id_variant_id_supplier_id_key | UNIQUE | `UNIQUE (organization_id, variant_id, supplier_id)` |  |  | sim |
| variant_stocks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| variant_stocks_quantity_check | CHECK | `CHECK (quantity >= 0)` |  |  | sim |
| variant_stocks_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| variant_stocks_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| variant_supplier_sources_supplier_branch_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_branch_id) REFERENCES supplier_branches(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.stock_daily_summary | stock_daily_summary_variant_supplier_source_id_fkey | variant_supplier_source_id | CASCADE |
| public.stock_snapshots | stock_snapshots_variant_supplier_source_id_fkey | variant_supplier_source_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_variant_supplier_sources_supplier_branch_id | btree | supplier_branch_id | não | sim |  | `CREATE INDEX idx_variant_supplier_sources_supplier_branch_id ON public.variant_supplier_sources USING btree (supplier_branch_id)` |
| idx_variant_supplier_sources_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_variant_supplier_sources_supplier_id ON public.variant_supplier_sources USING btree (supplier_id)` |
| idx_vss_cost | btree | variant_id, cost_price | não | sim | `(is_active = true)` | `CREATE INDEX idx_vss_cost ON public.variant_supplier_sources USING btree (variant_id, cost_price) WHERE (is_active = true)` |
| idx_vss_org_supplier | btree | organization_id, supplier_id | não | sim |  | `CREATE INDEX idx_vss_org_supplier ON public.variant_supplier_sources USING btree (organization_id, supplier_id)` |
| idx_vss_preferred | btree | variant_id | não | sim | `(is_preferred = true)` | `CREATE INDEX idx_vss_preferred ON public.variant_supplier_sources USING btree (variant_id) WHERE (is_preferred = true)` |
| idx_vss_supplier_sku_xbz | btree | supplier_sku, supplier_id | não | sim | `(supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid)` | `CREATE INDEX idx_vss_supplier_sku_xbz ON public.variant_supplier_sources USING btree (supplier_sku, supplier_id) WHERE (supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid)` |
| idx_vss_variant_supplier_unique | btree | variant_id, supplier_id | sim | sim |  | `CREATE UNIQUE INDEX idx_vss_variant_supplier_unique ON public.variant_supplier_sources USING btree (variant_id, supplier_id)` |
| variant_stocks_organization_id_variant_id_supplier_id_key | btree | organization_id, variant_id, supplier_id | sim | sim |  | `CREATE UNIQUE INDEX variant_stocks_organization_id_variant_id_supplier_id_key ON public.variant_supplier_sources USING btree (organization_id, variant_id, supplier_id)` |
| variant_stocks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX variant_stocks_pkey ON public.variant_supplier_sources USING btree (id)` |


## Policies (RLS)

### `variant_stocks_select_org`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE (uo.user_id = ( SELECT auth.uid() AS uid))))` |
| WITH CHECK |  |

### `variant_supplier_sources_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| WITH CHECK |  |

### `variant_supplier_sources_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |

### `variant_supplier_sources_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| WITH CHECK | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_capture_stock_snapshot | AFTER | UPDATE | ROW | enabled | public.fn_capture_stock_snapshot |
| trg_csp_insert | AFTER | INSERT | ROW | enabled | public.fn_capture_supplier_promise |
| trg_csp_update | AFTER | UPDATE | ROW | enabled | public.fn_capture_supplier_promise |
| trg_supplier_source_price | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_trigger_supplier_source_price |
| trg_sync_stock_from_vss | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_sync_product_stock_cache |
| trg_track_price_updated_vss | BEFORE | UPDATE | ROW | enabled | public.fn_trigger_track_price_updated_vss |
| trg_update_preferred_supplier | AFTER | INSERT OR UPDATE | ROW | enabled | public.trg_fn_update_preferred_on_stock_change |
| trg_vss_sync_warehouse_from_qty | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_vss_sync_warehouse_from_qty |
| trg_vss_updated_at | BEFORE | UPDATE | ROW | enabled | public.trg_fn_set_updated_at |
| trg_zz_sanitize_restock_dates | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_fn_sanitize_restock_dates |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
