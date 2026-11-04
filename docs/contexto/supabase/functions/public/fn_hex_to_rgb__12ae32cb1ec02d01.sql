CREATE OR REPLACE FUNCTION public.fn_hex_to_rgb()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.hex_color IS NOT NULL AND NEW.hex_color ~ '^#[0-9A-Fa-f]{6}$' THEN
        -- Converter HEX para RGB
        NEW.rgb_r := ('x' || substring(NEW.hex_color from 2 for 2))::bit(8)::int;
        NEW.rgb_g := ('x' || substring(NEW.hex_color from 4 for 2))::bit(8)::int;
        NEW.rgb_b := ('x' || substring(NEW.hex_color from 6 for 2))::bit(8)::int;
    END IF;
    RETURN NEW;
END;
$function$
