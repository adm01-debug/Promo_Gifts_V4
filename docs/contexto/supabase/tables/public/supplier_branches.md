# public.supplier_branches

> Filiais de fornecedores. Cada fornecedor pode faturar de UFs diferentes (ex: Spot MG/SP, Asia SC/SP). A UF da filial impacta diretamente o calculo de ICMS e CFOP.

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
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `branch_name` | `character varying(100)` | não |  |  |  |
| 4 | `branch_code` | `character varying(20)` | sim |  |  |  |
| 5 | `cnpj` | `character varying(18)` | sim |  |  |  |
| 6 | `inscricao_estadual` | `character varying(20)` | sim |  |  |  |
| 7 | `state_uf` | `character varying(2)` | não |  |  |  |
| 8 | `city` | `character varying(100)` | sim |  |  |  |
| 9 | `address` | `text` | sim |  |  |  |
| 10 | `tax_regime` | `character varying(30)` | sim | `'lucro_presumido'::character varying` |  |  |
| 11 | `icms_internal_rate` | `numeric(5,2)` | sim |  |  |  |
| 12 | `icms_interstate_rate` | `numeric(5,2)` | sim |  |  |  |
| 13 | `default_cfop_internal` | `character varying(4)` | sim |  |  |  |
| 14 | `default_cfop_interstate` | `character varying(4)` | sim |  |  |  |
| 15 | `is_default` | `boolean` | sim | `false` |  |  |
| 16 | `is_active` | `boolean` | sim | `true` |  |  |
| 17 | `notes` | `text` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 20 | `default_cst` | `character varying(3)` | sim |  |  | CST padrão dessa filial. Ex: 100 (importado), 500 (nacional), 060 (ST). Herdado por novos produtos vinculados. |
| 21 | `default_pis_rate` | `numeric(5,4)` | sim |  |  | Alíquota PIS padrão. Herdado por novos produtos vinculados. |
| 22 | `default_cofins_rate` | `numeric(5,4)` | sim |  |  | Alíquota COFINS padrão. Herdado por novos produtos vinculados. |
| 23 | `default_csosn` | `character varying(4)` | sim |  |  |  |
| 24 | `default_cest` | `character varying(7)` | sim |  |  |  |
| 25 | `default_operation_nature` | `character varying(100)` | sim |  |  | Natureza da operação padrão. Ex: Venda de Produção, Revenda de Terceiros, etc. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_branches_cnpj_digits_only_chk | CHECK | `CHECK (cnpj IS NULL OR cnpj::text ~ '^[0-9]+$'::text)` |  |  | sim |
| supplier_branches_cnpj_length_chk | CHECK | `CHECK (cnpj IS NULL OR length(cnpj::text) = 14)` |  |  | sim |
| supplier_branches_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_branches_supplier_id_branch_code_key | UNIQUE | `UNIQUE (supplier_id, branch_code)` |  |  | sim |
| supplier_branches_supplier_id_cnpj_key | UNIQUE | `UNIQUE (supplier_id, cnpj)` |  |  | sim |
| supplier_branches_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.stock_daily_summary | stock_daily_summary_supplier_branch_id_fkey | supplier_branch_id | NO ACTION |
| public.stock_snapshots | stock_snapshots_supplier_branch_id_fkey | supplier_branch_id | NO ACTION |
| public.variant_supplier_sources | variant_supplier_sources_supplier_branch_id_fkey | supplier_branch_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_branches_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_branches_pkey ON public.supplier_branches USING btree (id)` |
| supplier_branches_supplier_id_branch_code_key | btree | supplier_id, branch_code | sim | sim |  | `CREATE UNIQUE INDEX supplier_branches_supplier_id_branch_code_key ON public.supplier_branches USING btree (supplier_id, branch_code)` |
| supplier_branches_supplier_id_cnpj_key | btree | supplier_id, cnpj | sim | sim |  | `CREATE UNIQUE INDEX supplier_branches_supplier_id_cnpj_key ON public.supplier_branches USING btree (supplier_id, cnpj)` |


## Policies (RLS)

### `auth_read_supplier_branches`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `supplier_branches_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK |  |

### `supplier_branches_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `supplier_branches_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM suppliers p   WHERE ((p.id = supplier_branches.supplier_id) AND is_org_owner_or_admin(p.organization_id))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
