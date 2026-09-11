-- Hardening least-privilege em seller_discount_limits (define a alçada de desconto do vendedor —
-- superfície de escalonamento de privilégio). A RLS já gateia escritas a admin (is_admin_or_above);
-- aqui removemos grants de defesa-em-profundidade desnecessários:
--  - anon: nenhum acesso (não há policy de anon; RLS já negava, mas o grant era um risco latente)
--  - authenticated: mantém SELECT/INSERT/UPDATE/DELETE (admins via RLS), perde REFERENCES/TRIGGER
--  - trigger fn fn_ensure_seller_discount_limit: EXECUTE desnecessário (triggers disparam sem EXECUTE)
REVOKE ALL ON public.seller_discount_limits FROM anon;
REVOKE REFERENCES, TRIGGER ON public.seller_discount_limits FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_ensure_seller_discount_limit() FROM authenticated;;
