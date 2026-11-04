# public.product_deactivation_tokens

> Tokens de autorização one-shot para desativação de produtos.

PROPÓSITO: Mecanismo de segurança que garante a regra de negócio central:
"Nenhum produto é desativado sem aprovação explícita de admin+".

FLUXO COMPLETO:
  1. Admin aprova via fn_approve_product_deactivation()
     → cria token { product_id, request_id, authorized_by, used=false, expires_at }
  2. A função executa UPDATE products SET is_active=false
  3. Trigger fn_block_unauthorized_product_deactivation() intercepta o UPDATE
     → verifica se existe token válido (used=false AND expires_at > now())
     → SIM: permite desativação + marca used=true
     → NÃO: reverte is_active e bloqueia silenciosamente
  4. Token é deletado imediatamente após uso (auditoria fica nos registros used=true)

FUNÇÕES DEPENDENTES:
  - fn_approve_product_deactivation()             → cria token + dispara UPDATE
  - fn_block_unauthorized_product_deactivation()  → trigger BEFORE UPDATE/INSERT em products
  - soft_delete_product()                         → path de soft delete, também cria token one-shot

CONSTRAINT DE INTEGRIDADE:
  - FK fk_auth_product_cascade: product_id → products.id (CASCADE)
    → token só pode ser criado para produtos existentes
    → se o produto for deletado, o token é removido em cascata

CAMPOS:
  - product_id    → produto a ser desativado (FK → products.id)
  - request_id    → FK product_deactivation_requests (rastreabilidade)
  - authorized_by → UUID do admin que aprovou
  - authorized_at → criação do token
  - expires_at    → TTL curto (token não reutilizável após expirar)
  - used          → true após consumo (linha mantida como auditoria)

HISTÓRICO: 397 registros de Jun/2026 = desativações aprovadas e executadas (todos used=true).
RENOMEADA em 2026-06-15: era _deactivation_auth (prefixo _ era enganoso — tabela é ativa e crítica).

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
