CREATE OR REPLACE FUNCTION public.fn_display_product_name(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $function$
DECLARE
  s text;
  seg text;
  parts text[];
  i int;
  pairs text[][] := ARRAY[
    ARRAY['(\d)l\M','\1L'], ARRAY['(\d)d\M','\1D'], ARRAY['(\d)t\M','\1T'],
    ARRAY['(\d)w\M','\1W'], ARRAY['(\d)v\M','\1V'], ARRAY['(\d)gb\M','\1GB'],
    ARRAY['(\d)mah\M','\1mAh'],
    ARRAY['\ma([3-6])\M','A\1'], ARRAY['\mb([5-6])\M','B\1'],
    ARRAY['\musb\M','USB'], ARRAY['\mled\M','LED'], ARRAY['\mabs\M','ABS'],
    ARRAY['\mpvc\M','PVC'], ARRAY['\mpu\M','PU'],   ARRAY['\mpp\M','PP'],
    ARRAY['\mrpet\M','RPET'], ARRAY['\mpet\M','PET'], ARRAY['\meva\M','EVA'],
    ARRAY['\mmdf\M','MDF'], ARRAY['\mtnt\M','TNT'], ARRAY['\muv\M','UV'],
    ARRAY['\mgps\M','GPS'], ARRAY['\mnfc\M','NFC'], ARRAY['\mlcd\M','LCD'],
    ARRAY['\mrgb\M','RGB'], ARRAY['\mcob\M','COB'], ARRAY['\mtv\M','TV'],
    ARRAY['\mfm\M','FM'], ARRAY['\mgg\M','GG'], ARRAY['\mxg\M','XG']
  ];
  pr text[];
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;
  s := btrim(regexp_replace(
         translate(
           replace(replace(replace(replace(p_name, chr(8203),''), chr(8204),''), chr(8205),''), chr(65279),''),
           chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288),
           repeat(' ', 18)),
         '\s+', ' ', 'g'));
  IF s = '' THEN RETURN NULL; END IF;
  s := lower(s);
  -- sentence-case por segmento: capitaliza início e após '. '
  parts := string_to_array(s, '. ');
  FOR i IN 1..COALESCE(array_length(parts,1),0) LOOP
    seg := parts[i];
    IF seg <> '' THEN
      parts[i] := upper(left(seg,1)) || substr(seg,2);
    END IF;
  END LOOP;
  s := array_to_string(parts, '. ');
  FOREACH pr SLICE 1 IN ARRAY pairs LOOP
    s := regexp_replace(s, pr[1], pr[2], 'gi');
  END LOOP;
  s := upper(left(s,1)) || substr(s,2);
  RETURN s;
END;
$function$
