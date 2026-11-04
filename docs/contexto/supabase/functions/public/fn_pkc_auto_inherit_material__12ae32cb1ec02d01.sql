CREATE OR REPLACE FUNCTION public.fn_pkc_auto_inherit_material()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_material UUID;
  v_new_secondary UUID;
  v_old_default_material UUID;
BEGIN
  IF NEW.component_type_code IS NOT NULL THEN
    -- Buscar material padrão do NOVO tipo
    SELECT default_material_type_id, secondary_material_type_id
      INTO v_new_material, v_new_secondary
      FROM kit_component_types
     WHERE code = NEW.component_type_code;

    -- Caso 1: INSERT ou material ainda NULL → herdar do tipo
    IF NEW.material_type_id IS NULL THEN
      NEW.material_type_id := v_new_material;
      IF NEW.secondary_material_type_id IS NULL THEN
        NEW.secondary_material_type_id := v_new_secondary;
      END IF;

    -- Caso 2: UPDATE com mudança de type_code E material atual = default do tipo ANTIGO
    -- (material não foi customizado manualmente → deve acompanhar o novo tipo)
    ELSIF TG_OP = 'UPDATE'
      AND OLD.component_type_code IS DISTINCT FROM NEW.component_type_code
    THEN
      -- Verificar se o material atual era o default do tipo antigo
      SELECT default_material_type_id INTO v_old_default_material
        FROM kit_component_types WHERE code = OLD.component_type_code;

      -- Se o material atual era o padrão do tipo antigo → atualiza
      IF NEW.material_type_id = v_old_default_material THEN
        NEW.material_type_id := v_new_material;
        -- Atualiza secondary só se também era o padrão do tipo antigo
        IF NEW.secondary_material_type_id IS NULL OR NEW.secondary_material_type_id = v_old_default_material THEN
          NEW.secondary_material_type_id := v_new_secondary;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
