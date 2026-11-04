# public.personalization_techniques

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_personalization_techniques_public |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `code` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `prompt_suffix` | `text` | não |  |  |  |
| 6 | `requires_color_count` | `boolean` | sim | `false` |  |  |
| 7 | `base_cost_multiplier` | `numeric(4,2)` | sim | `1.0` |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| personalization_techniques_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| personalization_techniques_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.generated_mockups | generated_mockups_technique_id_fkey | technique_id | SET NULL |
| public.included_packaging_techniques | included_packaging_techniques_technique_id_fkey | technique_id | NO ACTION |
| public.mockup_generation_jobs | mockup_generation_jobs_technique_id_fkey | technique_id | SET NULL |
| public.mockup_templates | mockup_templates_default_technique_id_fkey | default_technique_id | SET NULL |
| public.personalization_technique_mappings | personalization_technique_mappings_personalization_tech_id_fkey | personalization_tech_id | CASCADE |
| public.product_component_location_techniques | product_component_location_techniques_technique_id_fkey | technique_id | RESTRICT |
| public.product_group_location_techniques | product_group_location_techniques_technique_id_fkey | technique_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| personalization_techniques_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX personalization_techniques_code_key ON public.personalization_techniques USING btree (code)` |
| personalization_techniques_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX personalization_techniques_pkey ON public.personalization_techniques USING btree (id)` |


## Policies (RLS)

### `personalization_techniques_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `pt_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `pt_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `pt_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `pt_select_active_or_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((is_active = true) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pt_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
