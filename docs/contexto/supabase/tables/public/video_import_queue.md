# public.video_import_queue

> Fila de importacao de videos YouTube -> Cloudflare Stream.
Consumida pelo VPS /workspace/xbz_video_import.js em background.

---- ESTADOS (coluna status) ----
  pending          -> aguardando processamento
  downloading      -> yt-dlp baixando o MP4 (FOR UPDATE SKIP LOCKED -- safe para parallel)
  error_download   -> falha no download (retry automatico ate max_retries=3)
  error_upload     -> falha no upload CF (retry automatico ate max_retries=3)
  done             -> upload CF concluido (aguardando link ao produto)
  linked           -> fn_xbz_link_video executada com sucesso (estado final)

---- FORNECEDORES ----
  'SPOT' (padrao): 139 videos na conta (historico, pipeline anterior)
  'xbz':          155 videos enfileirados em 2026-06-07 (129 pendentes, 22 linked, 3 error)

---- PROCESSADORES ----
  fn_video_queue_next(supplier)  -> pega proximo item (SECURITY DEFINER, FOR UPDATE SKIP LOCKED)
  fn_video_queue_update(...)     -> atualiza status/campos CF
  fn_video_link_to_products(id)  -> vincula SPOT ao produto (INSERT em product_videos)
  fn_xbz_link_video(...)         -> vincula XBZ ao produto (UPDATE em product_videos existente)

---- VPS SCRIPT ----
  /workspace/xbz_video_import.js (v3, Node.js, DELAY_MS=8000)
  Monitorar: cat /workspace/xbz_video_stats.json
  Resetar itens stuck: UPDATE video_import_queue SET status='pending', started_at=NULL
    WHERE source_supplier='xbz' AND status='downloading'

---- CLOUDFLARE STREAM ----
  Account ID:      cd0f4eee542191c4957567814e1f8ca1
  Account Hash:    ksi0mrlcw6rwzezz   (subdomain correto, != accountId)
  Token:           ver vault/integration_credentials -- NAO colocar token em COMMENT ON (incidente 2026-10-13: token cfat_* ficou exposto em texto claro aqui por ~4 meses; ROTACAO PENDENTE -- decisao do PO, nao executada por sessao automatizada).
  Storage:         ~208min usados / 1.000min no plano (em 2026-06-07, revisar)
  Throttle:        code 971 = rate limit de uploads (~7/min). Aguardar 30s extras.

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
| usada por views | public.vw_spot_cf_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `youtube_id` | `text` | não |  |  |  |
| 3 | `youtube_url` | `text` | não |  |  |  |
| 4 | `source_supplier` | `text` | não | `'SPOT'::text` |  |  |
| 5 | `product_references` | `text[]` | não | `'{}'::text[]` |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `local_file_path` | `text` | sim |  |  |  |
| 8 | `file_size_bytes` | `bigint` | sim |  |  |  |
| 9 | `cloudflare_video_id` | `text` | sim |  |  |  |
| 10 | `cloudflare_thumbnail` | `text` | sim |  |  |  |
| 11 | `cloudflare_hls` | `text` | sim |  |  |  |
| 12 | `cloudflare_embed` | `text` | sim |  |  |  |
| 13 | `cloudflare_duration_seconds` | `integer` | sim |  |  |  |
| 14 | `retry_count` | `integer` | sim | `0` |  |  |
| 15 | `max_retries` | `integer` | sim | `3` |  |  |
| 16 | `last_error` | `text` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 19 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 20 | `completed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| uq_video_queue_ytid_supplier | UNIQUE | `UNIQUE (youtube_id, source_supplier)` |  |  | sim |
| video_import_queue_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_viq_youtube_id | btree | youtube_id | não | sim |  | `CREATE INDEX idx_viq_youtube_id ON public.video_import_queue USING btree (youtube_id)` |
| uq_video_queue_ytid_supplier | btree | youtube_id, source_supplier | sim | sim |  | `CREATE UNIQUE INDEX uq_video_queue_ytid_supplier ON public.video_import_queue USING btree (youtube_id, source_supplier)` |
| video_import_queue_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX video_import_queue_pkey ON public.video_import_queue USING btree (id)` |


## Policies (RLS)

### `auth_read_video_import_queue`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_video_import_queue | BEFORE | UPDATE | ROW | enabled | public.trg_video_queue_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
