-- A1-1a (sub-passo 1/2): Adiciona valores 'coordenador' e 'vendedor' ao enum app_role.
-- Hierarquia 4 níveis: dev > admin > coordenador > vendedor.
-- 'dev' e 'admin' já existem (confirmado em pré-flight). 'supervisor', 'manager', 'agente'
-- continuam disponíveis até A1-1d (Postgres não permite remover enum value).
-- IF NOT EXISTS torna idempotente (re-run safe).

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';
