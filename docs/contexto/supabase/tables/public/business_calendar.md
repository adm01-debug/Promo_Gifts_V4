# public.business_calendar

> Feriados em que não se conta dia útil no prazo de produção (src/lib/lead-time). Uma linha por data. Sábado e domingo não entram: a biblioteca já os pula.

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `day` | `date` | não |  |  | Data do feriado (AAAA-MM-DD). Chave primária: uma linha por dia. |
| 2 | `description` | `text` | não |  |  | Nome do feriado em português, até 120 caracteres. |
| 3 | `created_at` | `timestamp with time zone` | não | `now()` |  | Criação do registro. |
| 4 | `created_by` | `uuid` | sim | `auth.uid()` |  | Usuário que cadastrou. Nulo no seed e quando o usuário é removido. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| business_calendar_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| business_calendar_description_check | CHECK | `CHECK (description ~ '\S'::text AND length(description) <= 120)` |  |  | sim |
| business_calendar_pkey | PRIMARY KEY | `PRIMARY KEY (day)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| business_calendar_pkey | btree | day | sim | sim |  | `CREATE UNIQUE INDEX business_calendar_pkey ON public.business_calendar USING btree (day)` |


## Policies (RLS)

### `business_calendar_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin()` |
| WITH CHECK |  |

### `business_calendar_insert_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin()` |

### `business_calendar_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `business_calendar_update_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin()` |
| WITH CHECK | `is_admin()` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
