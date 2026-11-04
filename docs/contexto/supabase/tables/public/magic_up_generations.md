# public.magic_up_generations

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `product_name` | `text` | sim |  |  |  |
| 4 | `scene_title` | `text` | sim |  |  |  |
| 5 | `scene_category` | `text` | sim |  |  |  |
| 6 | `client_name` | `text` | sim |  |  |  |
| 7 | `generated_image_url` | `text` | sim |  |  |  |
| 8 | `is_favorite` | `boolean` | sim | `false` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `campaign_id` | `uuid` | sim |  |  |  |
| 11 | `product_id` | `text` | sim |  |  |  |
| 12 | `product_sku` | `text` | sim |  |  |  |
| 13 | `prompt_text` | `text` | sim |  |  |  |
| 14 | `model` | `text` | sim |  |  |  |
| 15 | `channel` | `text` | sim |  |  |  |
| 16 | `aspect_ratio` | `text` | sim |  |  |  |
| 17 | `quality_score` | `integer` | sim |  |  |  |
| 18 | `status` | `text` | não | `'draft'::text` |  |  |
| 19 | `tags` | `text[]` | não | `'{}'::text[]` |  |  |
| 20 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 21 | `copy_pack` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 22 | `export_presets` | `jsonb` | não | `'[]'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magic_up_generations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magic_up_generations_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_magic_up_generations_user_id ON public.magic_up_generations USING btree (user_id)` |
| magic_up_generations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magic_up_generations_pkey ON public.magic_up_generations USING btree (id)` |


## Policies (RLS)

### `Users can manage own generations`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
