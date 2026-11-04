# public.video_sim_results

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
| 1 | `sup` | `text` | não |  |  |  |
| 2 | `yid` | `text` | não |  |  |  |
| 3 | `queue_status` | `text` | sim |  |  |  |
| 4 | `cur_w` | `integer` | sim |  |  |  |
| 5 | `cur_h` | `integer` | sim |  |  |  |
| 6 | `max_w` | `integer` | sim |  |  |  |
| 7 | `max_h` | `integer` | sim |  |  |  |
| 8 | `err` | `text` | sim |  |  |  |
| 9 | `checked_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| video_sim_results_pkey | PRIMARY KEY | `PRIMARY KEY (sup, yid)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| video_sim_results_pkey | btree | sup, yid | sim | sim |  | `CREATE UNIQUE INDEX video_sim_results_pkey ON public.video_sim_results USING btree (sup, yid)` |


## Policies (RLS)

### `sim_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
