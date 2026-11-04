CREATE OR REPLACE FUNCTION public.update_parent_children_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    -- Nova subcategoria: incrementar contador do parent
    UPDATE categories
    SET children_count = children_count + 1
    WHERE id = NEW.parent_id;
    
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    -- Categoria deletada: decrementar contador do parent
    UPDATE categories
    SET children_count = GREATEST(0, children_count - 1)
    WHERE id = OLD.parent_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    -- Parent mudou: atualizar ambos
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE categories 
      SET children_count = GREATEST(0, children_count - 1) 
      WHERE id = OLD.parent_id;
    END IF;
    
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE categories 
      SET children_count = children_count + 1 
      WHERE id = NEW.parent_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
