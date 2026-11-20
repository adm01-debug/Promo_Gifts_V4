# public.freight_settings

> Parâmetros globais do cálculo de frete (linha única). Lidos pelo motor em src/lib/freight; alterados só por admin em /admin/frete.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `boolean` | não | `true` |  | Sempre TRUE. A PK booleana com CHECK garante que a tabela tem no máximo uma linha. |
| 2 | `origin_cep` | `text` | não | `'03377-000'::text` |  | CEP de origem das remessas, formato 00000-000. Padrão: 03377-000 (Av. Renata, 249 – Vila Formosa, São Paulo/SP). |
| 3 | `cubic_divisor_correios` | `integer` | não | `6000` |  | Divisor de cubagem dos Correios em cm³/kg. Padrão 6000. |
| 4 | `cubic_divisor_rodoviario` | `integer` | não | `3333` |  | Divisor de cubagem do transporte rodoviário em cm³/kg. Padrão 3333. |
| 5 | `default_fill_factor` | `numeric(3,2)` | não | `0.90` |  | Fator de aproveitamento SUGERIDO ao cadastrar uma caixa nova (0,50 a 1,00). Padrão 0,90. Não entra no cálculo: o motor usa o fill_factor gravado em cada caixa. |
| 6 | `internal_buffer_days` | `integer` | não | `0` |  | Folga interna em dias úteis somada ao prazo de produção. Padrão 0. |
| 7 | `multi_personalization_rule` | `text` | não | `'max'::text` |  | Como combinar os prazos de várias personalizações no mesmo item: max (a mais demorada) ou sum (soma). Padrão max. |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  | Última alteração, mantida pelo trigger set_freight_settings_updated_at. |
| 9 | `updated_by` | `uuid` | sim |  |  | Usuário que fez a última alteração. Preenchido pelo banco (trigger guard_freight_settings_row) com auth.uid(); o valor enviado pelo cliente é ignorado. Fica NULL quando esse usuário é apagado (ON DELETE SET NULL). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| freight_settings_cubic_divisor_correios_check | CHECK | `CHECK (cubic_divisor_correios > 0)` |  |  | sim |
| freight_settings_cubic_divisor_correios_range | CHECK | `CHECK (cubic_divisor_correios >= 1000 AND cubic_divisor_correios <= 10000)` |  |  | sim |
| freight_settings_cubic_divisor_rodoviario_check | CHECK | `CHECK (cubic_divisor_rodoviario > 0)` |  |  | sim |
| freight_settings_cubic_divisor_rodoviario_range | CHECK | `CHECK (cubic_divisor_rodoviario >= 1000 AND cubic_divisor_rodoviario <= 10000)` |  |  | sim |
| freight_settings_default_fill_factor_check | CHECK | `CHECK (default_fill_factor >= 0.50 AND default_fill_factor <= 1.00)` |  |  | sim |
| freight_settings_id_check | CHECK | `CHECK (id)` |  |  | sim |
| freight_settings_internal_buffer_days_ceiling | CHECK | `CHECK (internal_buffer_days <= 60)` |  |  | sim |
| freight_settings_internal_buffer_days_check | CHECK | `CHECK (internal_buffer_days >= 0)` |  |  | sim |
| freight_settings_multi_personalization_rule_check | CHECK | `CHECK (multi_personalization_rule = ANY (ARRAY['max'::text, 'sum'::text]))` |  |  | sim |
| freight_settings_origin_cep_check | CHECK | `CHECK (origin_cep ~ '^[0-9]{5}-[0-9]{3}$'::text)` |  |  | sim |
| freight_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| freight_settings_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| freight_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX freight_settings_pkey ON public.freight_settings USING btree (id)` |


## Policies (RLS)

### `freight_settings_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `freight_settings_update_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin()` |
| WITH CHECK | `is_admin()` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| guard_freight_settings_row | BEFORE | UPDATE | ROW | enabled | public.guard_freight_settings_row |
| set_freight_settings_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
