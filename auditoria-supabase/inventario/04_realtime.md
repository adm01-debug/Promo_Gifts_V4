# Inventário — Realtime / Replicação

**Projeto:** doufsxqlfjyuvxuezpln | **Data:** 2026-11-01

## Publication supabase_realtime

| Schema | Tabela | Problema |
|---|---|---|
| `auth` | `users` | **CRÍTICO** — PII exposta a todos subscribers |
| `public` | `login_attempts` | REPLICA IDENTITY DEFAULT |
| `public` | `workspace_notifications` | REPLICA IDENTITY DEFAULT |
| `public` | `device_login_notifications` | REPLICA IDENTITY DEFAULT |

## SB-0001 — auth.users na publication

`auth.users` está incluída na publication `supabase_realtime`. Qualquer subscriber autenticado (ou anônimo, se o canal não tiver RLS) recebe eventos de INSERT/UPDATE/DELETE de `auth.users`, expondo e-mail, phone, `raw_user_meta_data`, `encrypted_password` e `recovery_token`.

Evidência:
```sql
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
-- resultado: [{pubname:"supabase_realtime","schemaname":"auth","tablename":"users"}]
```

**Correção:** `ALTER PUBLICATION supabase_realtime DROP TABLE auth.users;`
**Classe:** APROVAÇÃO (DDL)

## SB-0003 — REPLICA IDENTITY DEFAULT

Para UPDATE e DELETE em realtime, Postgres emite apenas a PK no evento `old` quando REPLICA IDENTITY = DEFAULT. Com FULL, emite a linha inteira — necessário para que subscribers saibam quais campos mudaram.

| Tabela | Problema |
|---|---|
| `login_attempts` | UPDATE/DELETE sem dados do estado anterior |
| `workspace_notifications` | UPDATE/DELETE sem dados do estado anterior |
| `device_login_notifications` | UPDATE/DELETE sem dados do estado anterior |

**Correção:** `ALTER TABLE public.<tabela> REPLICA IDENTITY FULL;` para cada uma.
**Classe:** APROVAÇÃO (DDL)
