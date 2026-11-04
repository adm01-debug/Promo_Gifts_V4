# public.ip_whitelist

> Lista de IPs autorizados para acesso ao sistema.
Consumida por fn_check_login_allowed() quando
access_security_settings.ip_whitelist_enabled = true.

REGRA: se esta tabela estiver VAZIA e o flag estiver ativo,
fn_check_login_allowed aplica FAIL OPEN (nao bloqueia ninguem)
para evitar lockout acidental de todos os usuarios.

Populate com os IPs fixos dos usuarios admin/dev antes
de ativar ip_whitelist_enabled = true na tabela
access_security_settings.

Indice parcial: idx_ip_whitelist_active_ip (is_active=true).
UNIQUE constraint em ip_address (ja existia).

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
| 2 | `ip_address` | `text` | não |  |  | Endereco IP autorizado. Texto livre — suporta IPv4 e IPv6. UNIQUE (um IP por linha). Exemplos: 189.28.10.5, 2001:db8::1. Nao suporta notacao CIDR nativamente — um registro por IP. |
| 3 | `label` | `text` | sim |  |  | Descricao legivel do IP. Ex: "Escritorio SP", "VPN Corporativa". Ajuda o admin a identificar o IP no painel sem decorar numeros. |
| 4 | `is_active` | `boolean` | não | `true` |  | Flag de ativacao. false = IP ignorado pelo enforcement (sem precisar remover o registro). Default: true. |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  | Atualizado automaticamente pelo trigger trg_ip_whitelist_updated_at. Adicionado em 2026-06-15 (Peca 5 do enforcement de seguranca). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ip_whitelist_ip_address_key | UNIQUE | `UNIQUE (ip_address)` |  |  | sim |
| ip_whitelist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ip_whitelist_ip_address_key | btree | ip_address | sim | sim |  | `CREATE UNIQUE INDEX ip_whitelist_ip_address_key ON public.ip_whitelist USING btree (ip_address)` |
| ip_whitelist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ip_whitelist_pkey ON public.ip_whitelist USING btree (id)` |


## Policies (RLS)

### `ip_whitelist_admin_all`

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
| trg_ip_whitelist_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
