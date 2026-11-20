CREATE OR REPLACE FUNCTION public.guard_shipping_boxes_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Caixa criada por usuário logado (a tela do admin): identificador e datas
    -- são do banco, não do cliente. Sem usuário (migration, service_role), vale
    -- o que foi enviado — é o que deixa o INSERT ... SELECT do backup devolver
    -- as caixas com o id e as datas originais.
    IF auth.uid() IS NOT NULL THEN
      NEW.id := gen_random_uuid();
      NEW.created_at := now();
      NEW.updated_at := now();
    END IF;
    RETURN NEW;
  END IF;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$function$
