# public.enriched_contacts

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
| usada por views | public.v_enrichment_stats, public.v_needs_enrichment |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `linkedin_url` | `text` | sim |  |  |  |
| 3 | `linkedin_profile_id` | `text` | sim |  |  |  |
| 4 | `first_name` | `text` | não |  |  |  |
| 5 | `last_name` | `text` | não |  |  |  |
| 6 | `full_name` | `text` | sim | `((first_name \|\| ' '::text) \|\| last_name)` | s |  |
| 7 | `headline` | `text` | sim |  |  |  |
| 8 | `current_title` | `text` | sim |  |  |  |
| 9 | `current_company` | `text` | sim |  |  |  |
| 10 | `company_domain` | `text` | sim |  |  |  |
| 11 | `location` | `text` | sim |  |  |  |
| 12 | `profile_picture_url` | `text` | sim |  |  |  |
| 13 | `work_email` | `text` | sim |  |  |  |
| 14 | `work_email_confidence` | `smallint` | sim |  |  |  |
| 15 | `work_email_verified_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `work_email_source` | `text` | sim |  |  |  |
| 17 | `personal_email` | `text` | sim |  |  |  |
| 18 | `personal_email_confidence` | `smallint` | sim |  |  |  |
| 19 | `personal_email_source` | `text` | sim |  |  |  |
| 20 | `phone_mobile` | `text` | sim |  |  |  |
| 21 | `phone_mobile_confidence` | `smallint` | sim |  |  |  |
| 22 | `phone_mobile_source` | `text` | sim |  |  |  |
| 23 | `phone_work` | `text` | sim |  |  |  |
| 24 | `phone_work_confidence` | `smallint` | sim |  |  |  |
| 25 | `phone_work_source` | `text` | sim |  |  |  |
| 26 | `whatsapp_number` | `text` | sim |  |  |  |
| 27 | `company_size` | `text` | sim |  |  |  |
| 28 | `company_industry` | `text` | sim |  |  |  |
| 29 | `company_linkedin_url` | `text` | sim |  |  |  |
| 30 | `company_website` | `text` | sim |  |  |  |
| 31 | `enrichment_status` | `text` | sim | `'pending'::text` |  |  |
| 32 | `enrichment_attempts` | `integer` | sim | `0` |  |  |
| 33 | `last_enriched_at` | `timestamp with time zone` | sim |  |  |  |
| 34 | `bitrix24_contact_id` | `integer` | sim |  |  |  |
| 35 | `bitrix24_synced_at` | `timestamp with time zone` | sim |  |  |  |
| 36 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 37 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 38 | `created_by` | `text` | sim | `'system'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| enriched_contacts_enrichment_status_check | CHECK | `CHECK (enrichment_status = ANY (ARRAY['pending'::text, 'enriching'::text, 'complete'::text, 'partial'::text, 'failed'::text]))` |  |  | sim |
| enriched_contacts_linkedin_url_key | UNIQUE | `UNIQUE (linkedin_url)` |  |  | sim |
| enriched_contacts_personal_email_confidence_check | CHECK | `CHECK (personal_email_confidence >= 0 AND personal_email_confidence <= 100)` |  |  | sim |
| enriched_contacts_phone_mobile_confidence_check | CHECK | `CHECK (phone_mobile_confidence >= 0 AND phone_mobile_confidence <= 100)` |  |  | sim |
| enriched_contacts_phone_work_confidence_check | CHECK | `CHECK (phone_work_confidence >= 0 AND phone_work_confidence <= 100)` |  |  | sim |
| enriched_contacts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| enriched_contacts_work_email_confidence_check | CHECK | `CHECK (work_email_confidence >= 0 AND work_email_confidence <= 100)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.enrichment_log | enrichment_log_contact_id_fkey | contact_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| enriched_contacts_linkedin_url_key | btree | linkedin_url | sim | sim |  | `CREATE UNIQUE INDEX enriched_contacts_linkedin_url_key ON public.enriched_contacts USING btree (linkedin_url)` |
| enriched_contacts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX enriched_contacts_pkey ON public.enriched_contacts USING btree (id)` |


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
| trg_ec_updated_at | BEFORE | UPDATE | ROW | enabled | public.li_update_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
