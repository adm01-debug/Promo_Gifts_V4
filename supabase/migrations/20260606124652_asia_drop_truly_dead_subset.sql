-- só objetos sem QUALQUER dependente (nem função, nem view)
DROP FUNCTION IF EXISTS public.fn_bronze_to_silver_all(integer);
DROP FUNCTION IF EXISTS public.fn_asia_batch_to_silver(integer);
DROP FUNCTION IF EXISTS public.fn_asia_to_silver(uuid);
DROP FUNCTION IF EXISTS public.parse_asia_dimensions(jsonb);;
