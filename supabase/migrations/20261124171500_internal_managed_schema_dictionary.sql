-- 20261124171500_internal_managed_schema_dictionary.sql
--
-- Canonicaliza um objeto que passou a existir em producao (doufsxqlfjyuvxuezpln)
-- sem migration: `internal.managed_schema_dictionary`.
--
-- Evidencia de quando apareceu: o Gate E40 estava verde na `main` (`53f9c048`, run
-- 45437509004, 2026-11-24 16:28Z) e ficou vermelho na PR #4047 (run 45442049128,
-- 16:56Z) acusando exatamente este objeto como "criado direto em producao sem
-- migration" (artifact schema-reconciliation-evidence). Nenhum arquivo, branch ou
-- PR do repo referencia o nome (grep em `main` + todas as refs remotas, 2026-11-24),
-- entao a DDL veio de fora do repo — mesmo padrao da reconciliacao de 2026-11-23
-- documentada em `supabase/MIGRATIONS_SYNC_LOG.md`.
--
-- Este arquivo reproduz o estado vivo: mesmas colunas e ordem, mesmo default,
-- mesma PK (schema_name, object_type, object_name), mesmo CHECK
-- (object_type in ('schema','table')) e RLS ligada sem policy (deny-all; o diff do
-- schema nao registra nenhum GRANT no objeto, entao anon/authenticated nao tem
-- privilegio algum — a entrada correspondente esta em
-- `.security/rls-no-policy-allowlist.json`).
--
-- Idempotente por desenho: em producao o objeto ja existe e todo statement aqui e
-- no-op (nada e recriado, nenhum dado e tocado); em ambiente novo a tabela passa a
-- nascer do repo. Sem COMMENT ON TABLE de proposito: o objeto vivo nao tem
-- comentario e adicionar um viraria drift novo.
--
-- Rollback: `supabase/rollbacks/20261124171500_rollback.sql` (DROP TABLE). Em
-- producao o objeto e ANTERIOR a esta migration: dropar so com confirmacao de que
-- nenhum consumidor passou a usa-lo.

CREATE SCHEMA IF NOT EXISTS internal;

CREATE TABLE IF NOT EXISTS internal.managed_schema_dictionary (
  schema_name text NOT NULL,
  object_type text NOT NULL,
  object_name text NOT NULL,
  service_name text NOT NULL,
  description text NOT NULL,
  partition_of text,
  reviewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE internal.managed_schema_dictionary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'internal.managed_schema_dictionary'::regclass
       AND conname = 'managed_schema_dictionary_pkey'
  ) THEN
    ALTER TABLE internal.managed_schema_dictionary
      ADD CONSTRAINT managed_schema_dictionary_pkey
      PRIMARY KEY (schema_name, object_type, object_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'internal.managed_schema_dictionary'::regclass
       AND conname = 'managed_schema_dictionary_object_type_check'
  ) THEN
    ALTER TABLE internal.managed_schema_dictionary
      ADD CONSTRAINT managed_schema_dictionary_object_type_check
      CHECK (object_type IN ('schema', 'table'));
  END IF;
END $$;
