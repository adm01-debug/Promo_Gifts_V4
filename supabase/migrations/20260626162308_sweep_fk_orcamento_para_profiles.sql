-- Sweep cirúrgico: 6 colunas do domínio Orçamento/Desconto repontadas auth.users -> profiles(user_id)
-- Cada coluna fica com EXATAMENTE 1 FK -> embed alias:coluna(...) sem ambiguidade.
-- ON DELETE preservado (e set_by melhorado p/ SET NULL).

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_seller_id_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_created_by_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_assigned_to_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.discount_approval_requests DROP CONSTRAINT IF EXISTS discount_approval_requests_admin_id_fkey;
ALTER TABLE public.discount_approval_requests ADD CONSTRAINT discount_approval_requests_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.seller_discount_limits DROP CONSTRAINT IF EXISTS seller_discount_limits_user_id_fkey;
ALTER TABLE public.seller_discount_limits ADD CONSTRAINT seller_discount_limits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.seller_discount_limits DROP CONSTRAINT IF EXISTS seller_discount_limits_set_by_fkey;
ALTER TABLE public.seller_discount_limits ADD CONSTRAINT seller_discount_limits_set_by_fkey
  FOREIGN KEY (set_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';;
