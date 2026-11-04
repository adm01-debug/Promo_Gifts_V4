CREATE OR REPLACE FUNCTION public.fn_sync_product_category_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Categoria removida: limpa o nome cacheado
  IF NEW.category_id IS NULL THEN
    NEW.category_name := NULL;
    RETURN NEW;
  END IF;

  -- Só recalcula se o id realmente mudou (evita lookup desnecessário em UPDATE)
  IF TG_OP = 'INSERT' OR (NEW.category_id IS DISTINCT FROM OLD.category_id) THEN
    SELECT name INTO NEW.category_name
    FROM public.categories
    WHERE id = NEW.category_id;
    -- Se a categoria não existir (FK órfã) SELECT retorna 0 linhas →
    -- INTO deixa category_name = NULL. Não lança exceção.
  END IF;

  RETURN NEW;
END;
$function$
