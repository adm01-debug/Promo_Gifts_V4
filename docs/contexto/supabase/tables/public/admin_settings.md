# public.admin_settings

> Key-value store de configurações globais do painel admin.
Padrão: 1 linha por configuração, chave única, valor em JSONB livre.
Criada em 20260514 (migration t39_create_missing_tables_part3).

PROPÓSITO:
  Persistir preferências e parâmetros configuráveis pelo admin
  que precisam ser compartilhados entre máquinas sem necessidade
  de deploy. Todos os admins leem/escrevem o mesmo valor.

CONSUMIDORES (frontend — src/hooks/admin/):
  useRetestCooldownSetting.ts
    chave: retest_cooldown | valor: { ms: number }
    uso  : cooldown em ms do botão Testar novamente nos cards de
           conexão de fornecedores. Default: 3000. Presets: [3000,10000,30000,60000].

  useIntelligenceBadgeSettings.ts
    chave: intelligence_badges
    valor: { hotItem:{enabled:bool}, bestSeller:{enabled:bool, minAvgDailyDepletion7d:number} }
    uso  : liga/desliga badges Hot Item e Best-seller no ProductCard.
           Default: hotItem enabled=true, bestSeller enabled=true threshold=15.

PADRÃO DE ACESSO (ambos os hooks):
  Leitura : supabase.from(admin_settings).select(value).eq(key,KEY).maybeSingle()
  Gravação: supabase.from(admin_settings).upsert({key,value},{onConflict:key})
  Cache module-level + broadcast pattern — fetch único por sessão por chave.

RLS:
  SELECT/INSERT/UPDATE → authenticated com has_role(uid, admin)
  DELETE               → sem policy (bloqueado implicitamente pelo RLS)
  anon                 → sem GRANT

INFRAESTRUTURA:
  Trigger: update_admin_settings_updated_at → BEFORE UPDATE → update_updated_at_column()
  FK em updated_by: pendente (melhoria #3)
  Nenhuma função Postgres acessa esta tabela — só frontend.
  Nenhuma view depende desta tabela.

ESTADO: 0 linhas (2026-06-15) — admins usando defaults do frontend.
NÃO ARQUIVAR / NÃO DROPAR — tabela ativa com consumidores no frontend.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | PK UUID. Gerado automaticamente (gen_random_uuid()). Chave técnica — não exposta no frontend. |
| 2 | `key` | `text` | não |  |  | Chave identificadora única da configuração (NOT NULL UNIQUE). Convenção: snake_case, descritivo do domínio. Chaves registradas (2026-06-15):   retest_cooldown    → useRetestCooldownSetting.ts   intelligence_badges → useIntelligenceBadgeSettings.ts Ao criar nova chave: documentar aqui e no hook correspondente. |
| 3 | `value` | `jsonb` | não | `'{}'::jsonb` |  | Payload JSONB da configuração (NOT NULL, default {}). Schema livre — cada chave define o próprio shape. Shapes conhecidos:   retest_cooldown    → { ms: number }   intelligence_badges → { hotItem:{enabled:bool}, bestSeller:{enabled:bool, minAvgDailyDepletion7d:number} } Sempre sanitizar/validar no frontend antes de usar (hooks têm função sanitize()). |
| 4 | `updated_by` | `uuid` | sim |  |  | UUID do admin que realizou a última alteração. Nullable. NULL quando criado pelo sistema ou quando o frontend não envia o campo. Sem FK formal para auth.users — a adicionar em melhoria #3. Hooks atuais (useRetestCooldownSetting, useIntelligenceBadgeSettings) não setam este campo. |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  | Timestamp de criação da linha. Auto-preenchido (DEFAULT now()). Imutável após INSERT. |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  | Timestamp da última atualização. Auto-atualizado pelo trigger update_admin_settings_updated_at (BEFORE UPDATE → update_updated_at_column()). Igual a created_at enquanto a linha não for alterada após INSERT. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| admin_settings_key_key | UNIQUE | `UNIQUE (key)` |  |  | sim |
| admin_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| chk_admin_settings_key_not_empty | CHECK | `CHECK (TRIM(BOTH FROM key) <> ''::text)` |  |  | sim |
| fk_admin_settings_updated_by | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admin_settings_key_key | btree | key | sim | sim |  | `CREATE UNIQUE INDEX admin_settings_key_key ON public.admin_settings USING btree (key)` |
| admin_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX admin_settings_pkey ON public.admin_settings USING btree (id)` |
| idx_admin_settings_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_admin_settings_updated_by ON public.admin_settings USING btree (updated_by)` |


## Policies (RLS)

### `Admins can insert admin_settings`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |

### `Admins can update admin_settings`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| WITH CHECK | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |

### `Admins can view admin_settings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_admin_settings_set_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
