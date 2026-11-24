# public.product_deactivation_tokens

> Tokens de autorização one-shot para desativação de produtos. Protege a regra: nenhum produto é desativado sem aprovação explícita de admin+.

FLUXO: fn_approve_product_deactivation() cria token curto para product_id/request_id/authorized_by; o trigger fn_block_unauthorized_product_deactivation() valida token não usado e não expirado durante a desativação e o consome. Sem token válido, a desativação é revertida/bloqueada. soft_delete_product() também usa este mecanismo.

INTEGRIDADE: product_id referencia products.id com cascade; request_id referencia a solicitação de aprovação. Campos de autorização e validade formam a trilha técnica do consumo.

Histórico documentado em 2026-06: tokens consumidos de desativações aprovadas. Renomeada em 2026-06-15 de _deactivation_auth para deixar claro que é tabela ativa e crítica. Não remover nem contornar o trigger de proteção.

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
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `request_id` | `uuid` | sim |  |  |  |
| 4 | `authorized_by` | `uuid` | sim |  |  |  |
| 5 | `authorized_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `expires_at` | `timestamp with time zone` | sim | `(now() + '00:00:05'::interval)` |  |  |
| 7 | `used` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| _deactivation_auth_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| _deactivation_auth_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (request_id) REFERENCES product_deactivation_requests(id)` | NO ACTION | NO ACTION | sim |
| fk_auth_product_cascade | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| _deactivation_auth_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX _deactivation_auth_pkey ON public.product_deactivation_tokens USING btree (id)` |
| idx_product_deactivation_tokens_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_product_deactivation_tokens_product_id ON public.product_deactivation_tokens USING btree (product_id)` |
| idx_product_deactivation_tokens_request_id | btree | request_id | não | sim |  | `CREATE INDEX idx_product_deactivation_tokens_request_id ON public.product_deactivation_tokens USING btree (request_id)` |


## Policies (RLS)

### `_deactivation_auth_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
