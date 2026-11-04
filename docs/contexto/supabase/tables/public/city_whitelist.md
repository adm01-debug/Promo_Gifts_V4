# public.city_whitelist

> Lista de cidades autorizadas para acesso ao sistema.
Consumida por fn_check_login_allowed() quando
access_security_settings.city_whitelist_enabled = true.

DEPENDENCIA: requer resolucao de IP -> cidade antes de
chamar fn_check_login_allowed (p_city). Sem servico de
geolocalizacao (ex: ip-api.com), este controle fica inativo
mesmo com city_whitelist_enabled = true.

REGRA: tabela vazia + flag ativo = FAIL OPEN (nao bloqueia).
Comparacao case-insensitive: upper(city_name) = upper(p_city).

UNIQUE em (city_name, state, country_code) — ja existia.
Indice parcial: idx_city_whitelist_active_city.

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `city_name` | `text` | não |  |  | Nome da cidade autorizada. Comparacao case-insensitive via upper() no indice e na fn_check_login_allowed. Ex: "Sao Paulo", "Campinas", "Rio de Janeiro". |
| 3 | `state` | `text` | sim |  |  | UF do estado (opcional). Ex: SP, RJ, MG. Usado apenas para identificacao — a comparacao em fn_check_login_allowed usa so city_name. |
| 4 | `country_code` | `text` | não | `'BR'::text` |  | Codigo ISO 3166-1 alpha-2. Default: BR. Permite futuro suporte multi-pais sem schema change. |
| 5 | `is_active` | `boolean` | não | `true` |  | Flag de ativacao. false = cidade ignorada pelo enforcement. |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  | Atualizado automaticamente pelo trigger trg_city_whitelist_updated_at. Adicionado em 2026-06-15 (Peca 5 do enforcement de seguranca). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| city_whitelist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| city_whitelist_unique | UNIQUE | `UNIQUE (city_name, state, country_code)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| city_whitelist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX city_whitelist_pkey ON public.city_whitelist USING btree (id)` |
| city_whitelist_unique | btree | city_name, state, country_code | sim | sim |  | `CREATE UNIQUE INDEX city_whitelist_unique ON public.city_whitelist USING btree (city_name, state, country_code)` |


## Policies (RLS)

### `city_whitelist_admin_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_city_whitelist_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
