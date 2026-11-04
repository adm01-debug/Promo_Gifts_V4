# public._qa_pct_results

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
| 1 | `id` | `integer` | não | `nextval('_qa_pct_results_id_seq'::regclass)` |  |  |
| 2 | `family` | `text` | sim |  |  |  |
| 3 | `p1` | `numeric` | sim |  |  |  |
| 4 | `p2` | `numeric` | sim |  |  |  |
| 5 | `p3` | `numeric` | sim |  |  |  |
| 6 | `detail` | `text` | sim |  |  |  |
| 7 | `expected_block` | `boolean` | sim |  |  |  |
| 8 | `got_block` | `boolean` | sim |  |  |  |
| 9 | `pass` | `boolean` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| _qa_pct_results_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| _qa_pct_results_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX _qa_pct_results_pkey ON public._qa_pct_results USING btree (id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
