# public.category_copywriting_config

> Configuração de copywriting por categoria para geração de descrições com IA

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
| usada por views | public.vw_category_completeness |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `category_id` | `uuid` | não |  |  |  |
| 3 | `personas` | `text[]` | sim | `ARRAY['Marketing'::text, 'RH'::text, 'Compras'::text, 'Eventos'::text]` |  | Personas alvo: Marketing, RH, Compras, Eventos, TI, Sustentabilidade |
| 4 | `ocasioes` | `text[]` | sim | `ARRAY[]::text[]` |  | Ocasiões de uso: convenções, onboarding, SIPAT, campanhas ESG |
| 5 | `keywords_seo` | `text[]` | sim | `ARRAY[]::text[]` |  | Palavras-chave SEO long-tail: squeeze personalizada com logo |
| 6 | `tom_voz` | `character varying(30)` | sim | `'profissional'::character varying` |  | Tom de voz: premium, economico, sustentavel, inovador, profissional, casual |
| 7 | `ctas` | `text[]` | sim | `ARRAY['Solicite um orçamento!'::text]` |  | Call-to-actions: Solicite amostra!, Peça orçamento! |
| 8 | `storytelling_template` | `text` | sim |  |  | Template: Imagine sua equipe em {ocasiao}... |
| 9 | `diferenciais` | `text[]` | sim | `ARRAY[]::text[]` |  | Diferenciais: durabilidade, sustentabilidade, tecnologia |
| 10 | `beneficios_emocionais` | `text[]` | sim | `ARRAY[]::text[]` |  | Benefícios: valorização, reconhecimento, pertencimento |
| 11 | `objecoes_comuns` | `text[]` | sim | `ARRAY[]::text[]` |  | Objeções a antecipar: prazo, quantidade mínima, certificações |
| 12 | `unidade_peso` | `character varying(5)` | sim | `'g'::character varying` |  |  |
| 13 | `unidade_capacidade` | `character varying(5)` | sim | `'ml'::character varying` |  |  |
| 14 | `unidade_dimensao` | `character varying(5)` | sim | `'mm'::character varying` |  |  |
| 15 | `config_extra` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 16 | `is_active` | `boolean` | sim | `true` |  |  |
| 17 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 19 | `created_by` | `uuid` | sim |  |  |  |
| 20 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_copywriting_config_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_copywriting_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| category_copywriting_config_tom_voz_check | CHECK | `CHECK (tom_voz::text = ANY (ARRAY['premium'::character varying, 'economico'::character varying, 'sustentavel'::character varying, 'inovador'::character varying, 'profissional'::character varying, 'casual'::character varying]::text[]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_copywriting_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_copywriting_config_pkey ON public.category_copywriting_config USING btree (id)` |
| idx_category_copywriting_unique | btree | category_id | sim | sim |  | `CREATE UNIQUE INDEX idx_category_copywriting_unique ON public.category_copywriting_config USING btree (category_id)` |


## Policies (RLS)

### `auth_read_category_copywriting_config`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `cat_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cat_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cat_dev_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_category_copywriting_updated | BEFORE | UPDATE | ROW | enabled | public.fn_category_copywriting_updated |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
