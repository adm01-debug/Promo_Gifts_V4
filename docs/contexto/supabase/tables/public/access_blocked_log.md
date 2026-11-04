# public.access_blocked_log

> Log de acessos bloqueados pelo sistema de segurança (geo/IP blocking).

STATUS: Tabela pronta e estruturada — aguarda implementação do escritor (edge function).
⚠️ NENHUMA função ou trigger escreve aqui ainda. 0 registros em jun/2026.

PROPÓSITO:
  Registrar toda tentativa de acesso bloqueada pelas regras de segurança:
  bloqueio por IP, geolocalização, país não permitido, cidade bloqueada, etc.
  Serve como auditoria forense e base para alertas de segurança.

ESCRITOR PENDENTE (a implementar):
  Edge function 'geo-access-control' deve inserir aqui ao bloquear um acesso.

  🔑 OBRIGATÓRIO: a edge function DEVE usar a chave service_role (não anon).
     A policy de INSERT exige authenticated + is_admin_or_above().
     Requisições bloqueadas são anônimas — só service_role bypassa a RLS.
     Se usar anon key, o INSERT falha silenciosamente e o log fica vazio.

  Exemplo de chamada via supabaseAdmin (service_role):
    const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
    await supabaseAdmin.from('access_blocked_log').insert({
      ip_address: req.ip,
      block_reason: 'country_not_allowed',
      email: user?.email ?? null,
      city, state, country,
      user_agent: req.headers['user-agent']
    });

  Razões válidas para block_reason:
    - 'ip_blocked'          → IP na lista negra (ip_access_control)
    - 'country_not_allowed'  → país fora de geo_allowed_countries
    - 'city_blocked'         → cidade na blacklist (city_whitelist)
    - 'rate_limit'           → muitas tentativas em curto período
    - 'suspicious_pattern'   → comportamento anômalo detectado

RLS POLICIES (2 ativas):
  - INSERT: authenticated + is_admin_or_above() → inserção manual por admin
  - SELECT: authenticated + is_admin_or_above() → leitura de auditoria por admin
  - UPDATE: sem policy → log imutável (append-only por design)
  - DELETE: sem policy → auditoria preservada permanentemente
  ⚠️ Edge function não usa estas policies — usa service_role que bypassa RLS.

ÍNDICES (criados em 2026-06-15):
  - idx_access_blocked_log_created_at (created_at DESC) → queries de auditoria por período
  - idx_access_blocked_log_ip (ip_address) → busca de IP específico bloqueado

TABELAS DO MESMO ECOSSISTEMA DE SEGURANÇA:
  - ip_access_control      → define IPs bloqueados/permitidos (1 regra ativa)
  - login_attempts         → log de tentativas de login (1.240 registros ativos)
  - ip_whitelist           → IPs sempre permitidos (vazia — a preencher)
  - city_whitelist         → cidades permitidas/bloqueadas (vazia — a preencher)
  - geo_allowed_countries  → países permitidos (vazia — a preencher)
  - user_allowed_ips       → IPs liberados por usuário (vazia — a preencher)

CAMPOS:
  - id           → uuid gerado automaticamente
  - email        → conta que tentou acessar (nullable — pode ser anônimo)
  - ip_address   → IP de origem (obrigatório, NOT NULL)
  - city/state/country → geolocalização do IP (via serviço externo)
  - block_reason → motivo do bloqueio (obrigatório, NOT NULL)
  - user_agent   → browser/dispositivo de origem
  - created_at   → timestamp automático (now())

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `email` | `text` | sim |  |  |  |
| 3 | `ip_address` | `text` | não |  |  |  |
| 4 | `city` | `text` | sim |  |  |  |
| 5 | `state` | `text` | sim |  |  |  |
| 6 | `country` | `text` | sim |  |  |  |
| 7 | `block_reason` | `text` | não |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| access_blocked_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| access_blocked_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX access_blocked_log_pkey ON public.access_blocked_log USING btree (id)` |


## Policies (RLS)

### `access_blocked_log_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `access_blocked_log_admin_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
