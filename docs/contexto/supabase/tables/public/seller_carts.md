# public.seller_carts

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
| 2 | `seller_id` | `uuid` | não |  |  |  |
| 3 | `company_id` | `text` | não |  |  |  |
| 4 | `company_name` | `text` | não |  |  |  |
| 5 | `company_location` | `text` | sim |  |  |  |
| 6 | `company_logo_url` | `text` | sim |  |  |  |
| 7 | `notes` | `text` | sim |  |  |  |
| 8 | `status` | `text` | não | `'em_separacao'::text` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `shipping_deadline` | `date` | sim |  |  | Prazo p/ envio: data limite (DATE) para enviar o pedido ao cliente. Null quando não definido. |
| 12 | `version` | `integer` | não | `1` |  | Optimistic locking: incrementado por trg_seller_carts_version a cada UPDATE com mudança real. Cliente concorrente deve enviar WHERE version = <esperado> e tratar 0 linhas afetadas como conflito. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_sc_status | CHECK | `CHECK (status = ANY (ARRAY['em_separacao'::text, 'pronto_orcamento'::text]))` |  |  | sim |
| seller_carts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| seller_carts_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.seller_cart_items | seller_cart_items_cart_id_fkey | cart_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_seller_carts_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_seller_carts_seller_id ON public.seller_carts USING btree (seller_id)` |
| seller_carts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seller_carts_pkey ON public.seller_carts USING btree (id)` |


## Policies (RLS)

### `Users can manage own carts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| enforce_seller_cart_limit | BEFORE | INSERT | ROW | enabled | public.enforce_seller_cart_limit |
| trg_audit_seller_carts | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_row_change |
| trg_owner__seller_carts__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |
| trg_seller_carts_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_seller_carts_version | BEFORE | UPDATE | ROW | enabled | public.increment_seller_cart_version |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
