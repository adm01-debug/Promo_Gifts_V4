CREATE OR REPLACE FUNCTION public.fn_image_types_check_constraint_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check_values text[] := ARRAY[
    'main','product','set','gallery','ambient','detail','logo',
    'component','location','area','box','pouch','bag','mockup',
    'thumbnail','vitrine_ambiente','vitrine_pessoa','other'
  ];
BEGIN
  IF NOT (NEW.code = ANY(v_check_values)) THEN
    RAISE WARNING
      E'image_types: tipo "%" adicionado mas AUSENTE no CHECK CONSTRAINT de product_images.image_type. '
      'Atualize o CHECK CONSTRAINT e a view vw_image_type_coherence para incluir o novo tipo "%".',
      NEW.code, NEW.code;
  END IF;
  RETURN NEW;
END;
$function$
