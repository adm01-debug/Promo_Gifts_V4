-- ============================================================
-- FIX promo-gifts-v4 / Admin Usuários + Descontos
-- Causa-raiz: 9/13 profiles com user_id NULL (porém profiles.id JÁ = auth.users.id).
-- Quebrava: embed profiles<->user_roles (PGRST200), embed seller em
-- discount_approval_requests (400) e INSERT em seller_discount_limits (23502).
-- Invariante provado: profiles.id = profiles.user_id = auth.users.id (toda a tabela).
-- ============================================================

-- STEP 1 — Religar identidade: backfill profiles.user_id a partir de profiles.id
UPDATE public.profiles
   SET user_id = id, updated_at = now()
 WHERE user_id IS NULL
   AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = public.profiles.id);

-- STEP 2 — FK para o PostgREST conseguir embedar profiles -> user_roles(role)
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_profiles_fkey;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- STEP 3 — Repontar seller_id de discount_approval_requests para profiles
-- (resolve embed seller:seller_id(full_name,email) sem ambiguidade;
--  integridade com auth preservada via profiles.user_id -> auth.users)
ALTER TABLE public.discount_approval_requests
  DROP CONSTRAINT IF EXISTS discount_approval_requests_seller_id_fkey;
ALTER TABLE public.discount_approval_requests
  ADD CONSTRAINT discount_approval_requests_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.profiles(user_id);

-- STEP 4 — Recarregar cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';;
