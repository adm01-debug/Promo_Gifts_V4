CREATE OR REPLACE FUNCTION public.assign_cart_item_sort_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.sort_order IS NULL)
     OR (TG_OP = 'UPDATE' AND NEW.cart_id <> OLD.cart_id) THEN
    -- Serializa a atribuicao de sort_order POR CARRINHO: evita que dois INSERTs
    -- concorrentes (READ COMMITTED) leiam o mesmo MAX e gerem sort_order duplicado.
    -- Advisory lock por transacao (liberado no commit); chave namespeada (415263)
    -- + hash do cart_id => so serializa inserts/moves no MESMO carrinho.
    PERFORM pg_advisory_xact_lock(415263, hashtext(NEW.cart_id::text));
    SELECT COALESCE(MAX(sort_order), -1) + 1
      INTO NEW.sort_order
      FROM public.seller_cart_items
     WHERE cart_id = NEW.cart_id
       AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$function$
