
-- =============================================================
-- MIGRATION: fix_discount_approval_audit_actor_id_fk
-- BUG: discount_approval_audit.actor_id tinha FK ausente, causando
--      400 Bad Request quando PostgREST tentava resolver o join
--      embedded actor:actor_id(full_name,email) no frontend.
-- ROOT CAUSE: actor_id armazena auth.users.id (= profiles.user_id),
--      mas a constraint FK nunca foi declarada → PostgREST não
--      conseguia inferir o relacionamento → HTTP 400.
-- FIX: Adicionar FK actor_id → profiles(user_id) + índice de suporte.
-- ANTI-REGRESSION: Lovable bot must not remove this FK or index.
-- fix_version: dar_audit_actor_fk_v1
-- =============================================================

-- 1. FK principal: resolve o join PostgREST actor:actor_id(full_name,email)
ALTER TABLE public.discount_approval_audit
  ADD CONSTRAINT discount_approval_audit_actor_id_fkey
  FOREIGN KEY (actor_id)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- 2. Índice suporte: evita seq scan em profiles em cascatas de UPDATE/DELETE
CREATE INDEX IF NOT EXISTS idx_discount_approval_audit_actor_id
  ON public.discount_approval_audit(actor_id)
  WHERE actor_id IS NOT NULL;

-- 3. Reload schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
;
