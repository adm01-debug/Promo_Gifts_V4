# public.company_email_patterns

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
| usada por views | public.v_top_patterns |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `company_domain` | `text` | não |  |  |  |
| 3 | `company_name` | `text` | sim |  |  |  |
| 4 | `pattern_format` | `text` | não |  |  |  |
| 5 | `pattern_confidence` | `smallint` | sim |  |  |  |
| 6 | `mx_server` | `text` | sim |  |  |  |
| 7 | `email_provider` | `text` | sim |  |  |  |
| 8 | `is_catch_all` | `boolean` | sim | `false` |  |  |
| 9 | `verified_count` | `integer` | sim | `0` |  |  |
| 10 | `last_verified_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| company_email_patterns_company_domain_pattern_format_key | UNIQUE | `UNIQUE (company_domain, pattern_format)` |  |  | sim |
| company_email_patterns_pattern_confidence_check | CHECK | `CHECK (pattern_confidence >= 0 AND pattern_confidence <= 100)` |  |  | sim |
| company_email_patterns_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| company_email_patterns_company_domain_pattern_format_key | btree | company_domain, pattern_format | sim | sim |  | `CREATE UNIQUE INDEX company_email_patterns_company_domain_pattern_format_key ON public.company_email_patterns USING btree (company_domain, pattern_format)` |
| company_email_patterns_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX company_email_patterns_pkey ON public.company_email_patterns USING btree (id)` |


## Policies (RLS)

### `li_deny_anon`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `false` |
| WITH CHECK | `false` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_cep_updated_at | BEFORE | UPDATE | ROW | enabled | public.li_update_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
