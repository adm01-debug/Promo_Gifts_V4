-- Rollback de 20260629142224 (trigger anti-fraude de quote_items.unit_price).
-- Remove a defesa em profundidade; a RLS de quote_items continua ativa.
DROP TRIGGER IF EXISTS trg_prevent_non_admin_quote_item_price_change ON public.quote_items;
DROP FUNCTION IF EXISTS public.prevent_non_admin_quote_item_price_change();
