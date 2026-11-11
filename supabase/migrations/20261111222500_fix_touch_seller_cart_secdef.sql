-- Fix: auth.admin.deleteUser falha ("Database error deleting user") para
-- usuários com itens em seller_cart_items.
--
-- Causa: DELETE em auth.users (papel supabase_auth_admin) cascateia para
-- seller_carts -> seller_cart_items; o trigger AFTER DELETE
-- trg_touch_seller_cart_on_item_change roda como SECURITY INVOKER e faz
-- UPDATE em public.seller_carts, onde supabase_auth_admin não tem privilégio.
-- Reproduzido em 2026-11-11: usuário sem carrinho/ só carrinho -> 200;
-- carrinho + item -> 500. Consequência: o teste restore-seller-cart-rpc
-- deixava usuários e2e-restore-* órfãos.
--
-- Correção: mesma lógica, executada como dono (SECURITY DEFINER) com
-- search_path fixo. Função de trigger não é invocável via RPC; REVOKE por
-- hardening.

CREATE OR REPLACE FUNCTION public.touch_seller_cart_on_item_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.seller_carts SET updated_at = now() WHERE id = OLD.cart_id;
    RETURN OLD;
  END IF;
  UPDATE public.seller_carts SET updated_at = now() WHERE id = NEW.cart_id;
  IF TG_OP = 'UPDATE' AND NEW.cart_id <> OLD.cart_id THEN
    UPDATE public.seller_carts SET updated_at = now() WHERE id = OLD.cart_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.touch_seller_cart_on_item_change() FROM PUBLIC, anon, authenticated;
