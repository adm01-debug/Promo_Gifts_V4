# public.device_login_notifications

> Notificações de login em novo dispositivo/IP. Escrita: edge detect-new-device (service_role). Leitura: dono via RLS. Consumida em realtime por usePushNotifications.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID do registro de notificação de login. |
| 2 | `user_id` | `uuid` | não |  |  | Usuário associado ao evento de login em novo dispositivo ou endereço IP. |
| 3 | `device_id` | `text` | sim |  |  | Identificador do dispositivo, quando informado. |
| 4 | `ip_address` | `text` | sim |  |  | Endereço IP associado ao login, quando informado. |
| 5 | `user_agent` | `text` | sim |  |  | User-Agent do cliente associado ao login, quando informado. |
| 6 | `location` | `text` | sim |  |  | Localização associada ao login, quando informada. |
| 7 | `email_sent` | `boolean` | não | `false` |  | Indica se foi enviado um e-mail referente à notificação. |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  | Data e hora de criação da notificação. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| device_login_notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| device_login_notifications_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| device_login_notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX device_login_notifications_pkey ON public.device_login_notifications USING btree (id)` |
| idx_device_login_notifications_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_device_login_notifications_user_id ON public.device_login_notifications USING btree (user_id)` |


## Policies (RLS)

### `Users can read own device login notifications`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
