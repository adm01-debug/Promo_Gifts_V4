# public.audit_log_gravacao

> Audit log de mudanças em tabela_preco_gravacao_oficial e _faixa. RLS ativada em 2026-05-09 (Etapa 1 plano unificação). Triggers SECDEF bypassam RLS p/ INSERT.

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
| 1 | `id` | `bigint` | não | `nextval('audit_log_gravacao_id_seq'::regclass)` |  |  |
| 2 | `tabela_origem` | `text` | não |  |  |  |
| 3 | `operacao` | `text` | não |  |  |  |
| 4 | `registro_id` | `uuid` | não |  |  |  |
| 5 | `codigo_tabela` | `text` | sim |  |  |  |
| 6 | `campos_alterados` | `jsonb` | sim |  |  |  |
| 7 | `valor_antes` | `jsonb` | sim |  |  |  |
| 8 | `valor_depois` | `jsonb` | sim |  |  |  |
| 9 | `usuario` | `text` | sim | `CURRENT_USER` |  |  |
| 10 | `ts` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_log_gravacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_log_gravacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_log_gravacao_pkey ON public.audit_log_gravacao USING btree (id)` |
| idx_audit_log_ts | btree | ts | não | sim |  | `CREATE INDEX idx_audit_log_ts ON public.audit_log_gravacao USING btree (ts DESC)` |


## Policies (RLS)

### `audit_log_gravacao_insert_service`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |

### `audit_log_gravacao_select_supervisor_or_above`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | INSERT, REFERENCES, TRIGGER |
| authenticated | INSERT, REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
