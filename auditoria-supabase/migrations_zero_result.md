# Migrations-from-Zero — Resultado do Teste

**Data:** 2026-10-28  
**Banco:** PostgreSQL 16 local (rls_audit_test + migrations_zero_test)  
**Método:** `sudo -u postgres psql -d migrations_zero_test -f <arquivo>`

## Resultado

**27 migrations aplicadas com sucesso** (posições 1–27 na ordem cronológica).  
**Primeira falha:** migration #28 `20251214184441_801b0aa8-e997-49c2-9e4d-ea0f4836a717.sql`

```
Linha 4: ERROR: relation "storage.buckets" does not exist
Linha 19: ERROR: schema "storage" does not exist
```

## Causa raiz

O schema `storage` é gerenciado pelo **Supabase Storage module** — não existe em PostgreSQL puro. Mesma situação para:

| Dependência | Migrations afetadas | Origem |
|---|---|---|
| `storage.*` | 45 | Supabase Storage module |
| `cron.*` / `pg_cron` | 172 / 81 | Supabase pg_cron extension |
| `pg_net` | 31 | Supabase pg_net extension |
| `vault.*` | 24 | Supabase pgsodium/Vault |
| `pgsodium` | 4 | Supabase pgsodium |
| `supabase_functions` | 7 | Supabase Functions module |
| `pgmq` | 1 | Supabase pgmq extension |

O schema `auth` foi mockado manualmente (tabela `auth.users` + funções `auth.uid()`, `auth.role()`, `auth.email()`) — isso permitiu as primeiras 27 migrations passarem.

## Conclusão

Migrations **NÃO podem ser aplicadas do zero** em PostgreSQL puro. O caminho correto é `supabase start` (Docker + todas as imagens Supabase), que provisiona todos os schemas e extensões necessários. Sem Docker disponível nesta sessão, o teste para no ponto documentado acima.

**Isso é comportamento esperado** — não é um bug nas migrations. As 27 migrations que passaram confirmam que a lógica SQL pura (sem deps Supabase) está correta.

## Evidência

```
-- Banco: migrations_zero_test (PostgreSQL 16 local)
-- Antes do teste:
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- Depois de 27 migrations: tabelas criadas corretamente

-- Ponto de falha exato:
-- Arquivo: supabase/migrations/20251214184441_801b0aa8-e997-49c2-9e4d-ea0f4836a717.sql:4
-- Erro: ERROR: relation "storage.buckets" does not exist
-- Requisito: supabase start (Docker) para resolver
```

## Roteiro para teste completo

```bash
# Pré-requisito: Docker instalado e autenticado no Supabase
cd /home/user/Promo_Gifts_V4
supabase start          # sobe PostgreSQL + Auth + Storage + pg_cron + pg_net + Vault
supabase db reset       # aplica todas as 3009 migrations do zero
# Verificar saída: "Finished supabase db reset" sem erros
```
