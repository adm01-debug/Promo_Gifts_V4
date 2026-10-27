# A.9 — Auth, Storage, Realtime
_Auditoria read-only · 2026-10-27_

---

## Auth

| Métrica | Valor |
|---|---|
| Total usuários | 39 |
| Email não confirmado | 0 |
| Usuários banidos | 0 |
| Usuários deletados (soft) | 0 |
| **Sessões ativas** | **28.997** ⚠️ |

### Achado CRÍTICO: Sessões 28.997 para 39 usuários
Razão de ~743 sessões por usuário. Causas prováveis:
- Sessões de serviço/automação nunca expiradas (N8N, edge functions, scripts)
- `auth.sessions` não sendo rotacionada por `SUPABASE_AUTH_SESSION_EXPIRY_WEEKS`
- Vazamento de sessões em loops de automação

**Evidência:**
```sql
SELECT COUNT(*) FROM auth.sessions;
-- 28997
SELECT COUNT(*) FROM auth.users;
-- 39
```

### Trigger on_auth_user_created
✅ Trigger `on_auth_user_created` → função `handle_new_user()` existe e está ativo.

### FK de public para auth.users
⚠️ Nenhuma FK formal de tabelas `public.*` para `auth.users`. Múltiplas colunas `user_id uuid` sem FK (ver `integridade_extra.md`). Risco: usuário deletado em `auth.users` deixa órfãos em todas as tabelas.

---

## Storage — Buckets (11 total)

| Bucket | Público | Limite | Tipos |
|---|---|---|---|
| avatars | ✅ SIM | 5 MB | images/* |
| mockup-assets | ✅ SIM | 10 MB | images/* |
| art-files | ❌ não | 20 MB | * |
| component-media | ❌ não | 5 MB | * |
| mockup-art-files | ❌ não | 25 MB | * |
| personalization-images | ❌ não | 5 MB | * |
| product-videos | ❌ não | 100 MB | video/* |
| quarantine | ❌ não | 5 MB | * |
| recibos-entrega | ❌ não | 10 MB | * |
| scripts | ❌ não | 1 MB | application/* |
| supplier-logos | ❌ não | 2 MB | images/* |

### Objetos existentes (não vazios)
- `art-files`: 3 objetos
- `mockup-assets`: 2 objetos
- `scripts`: 1 objeto (bucket de scripts shell — **risco**) com dono `NULL`

---

## Storage — Políticas: Achados de Segurança

### S1 — art-files sem isolamento por proprietário (ALTO)
```
art_files_auth_delete: DELETE para {authenticated} sem filtro de owner
art_files_auth_update: UPDATE para {authenticated} sem filtro de owner
art_files_auth_insert: INSERT para {authenticated} sem filtro de owner
```
Qualquer usuário autenticado pode deletar/atualizar/inserir qualquer arquivo em `art-files`.
Ao contrário, `mockup-art-files` tem isolamento por `storage.foldername(name)[1] = auth.uid()`.

### S2 — avatars sem isolamento por proprietário (MÉDIO)
```
avatars_auth_delete: DELETE para {authenticated} - qualquer autenticado pode deletar qualquer avatar
avatars_auth_update: UPDATE para {authenticated} - sem filtro de owner
```
Usuário A pode deletar avatar de usuário B.

### S3 — recibos_authenticated_update sem WITH CHECK (MÉDIO)
```
recibos_authenticated_update: UPDATE sem with_check
```
A UPDATE policy não tem `WITH CHECK` — permite alterar qualquer campo de um recibo após o update começar.

### S4 — personalization-images: políticas duplicadas (BAIXO)
Existem 3 policies distintas para INSERT em `personalization-images` com condições ligeiramente diferentes:
- `Acesso de inserção para usuários autenticados em personaliza` — sem isolamento de owner
- `Authenticated users can upload personalization images` — sem isolamento de owner
- `Users can upload own personalization images` — com `split_part(name, '/', 1) = auth.uid()`

As duas primeiras são mais permissivas e sobrepõem a terceira (PERMISSIVE = OR logic).

### S5 — mockup-assets com política de INSERT para {public} (BAIXO)
```
"Users can upload their own mockup assets": roles={public}, with_check inclui auth.uid()
```
Rolename `public` inclui usuários anônimos. `auth.uid()` retorna NULL para anon → a comparação `auth.uid()::text = foldername[1]` falha (NULL ≠ qualquer string), mas é uma ambiguidade que pode criar problemas com path `null/filename`.

### S6 — signatures bucket sem policies de escrita listadas
Bucket `signatures` não está listado nos resultados de `pg_policies WHERE schemaname='storage'` para escrita. Apenas leitura por autenticados. Deve ser verificado se INSERT/DELETE estão bloqueados intencionalmente.

---

## Realtime

### Publications

| Publication | puballtables | INSERT | UPDATE | DELETE | TRUNCATE |
|---|---|---|---|---|---|
| supabase_realtime | false | ✅ | ✅ | ✅ | ✅ |
| supabase_realtime_messages_publication | false | ✅ | ✅ | ✅ | ✅ |

### Tabelas em supabase_realtime

| Tabela | RLS | Replica Identity | Risco |
|---|---|---|---|
| device_login_notifications | ✅ | d (default/PK) | OK |
| discount_approval_requests | ✅ | f (FULL) | OK |
| login_attempts | ✅ | d (default/PK) | OK |
| notifications | ✅ | f (FULL) | OK |
| order_items | ✅ | f (FULL) | OK |
| orders | ✅ | f (FULL) | OK |
| quote_items | ✅ | f (FULL) | OK |
| quotes | ✅ | f (FULL) | OK |
| workspace_notifications | ✅ | d (default/PK) | OK |
| **auth.users** | ✅ | d (default/PK) | ⚠️ RISCO |

### R1 — auth.users na publicação realtime (ALTO)
`auth.users` está na `supabase_realtime` publication. Mesmo com RLS ativo, toda alteração em `auth.users` gera evento realtime. Se qualquer cliente tiver subscrição ao canal `auth.users`, pode receber dados sensíveis (email, metadata, etc.). A prática recomendada é remover `auth.users` da publicação realtime e usar `public.profiles` em seu lugar.

### R2 — Tabelas com replica_identity FULL em realtime (BAIXO)
`orders`, `order_items`, `quotes`, `quote_items`, `notifications`, `discount_approval_requests` têm `REPLICA IDENTITY FULL`. Isso garante que eventos UPDATE/DELETE incluam a linha antiga completa — útil mas aumenta o volume de WAL. Aceitável para essas tabelas de negócio.

### Partições de mensagens realtime
7 partições de `realtime.messages` presentes (2026-10-24 a 2026-10-30). **Sem RLS** — esperado para partições internas do realtime gerenciadas pelo Supabase. Não representam risco.
