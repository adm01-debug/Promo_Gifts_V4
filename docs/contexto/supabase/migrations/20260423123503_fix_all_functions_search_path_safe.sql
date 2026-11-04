DO $$
DECLARE
  rec RECORD;
  sql_cmd TEXT;
  skip_functions TEXT[] := ARRAY['unaccent', 'armor', 'dearmor', 'crypt', 'gen_random_bytes', 'gen_random_uuid', 'gen_salt', 'pgp_sym_encrypt', 'pgp_sym_decrypt', 'pgp_pub_encrypt', 'pgp_pub_decrypt', 'pgp_key_id', 'digest', 'hmac', 'encrypt', 'decrypt', 'encrypt_iv', 'decrypt_iv'];
BEGIN
  FOR rec IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (p.proconfig IS NULL OR NOT (array_to_string(p.proconfig, ',') LIKE '%search_path%'))
      AND p.proname != ALL(skip_functions)
  LOOP
    BEGIN
      sql_cmd := format('ALTER FUNCTION %I.%I(%s) SET search_path = public', rec.nspname, rec.proname, rec.args);
      EXECUTE sql_cmd;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped: % (not owner)', rec.proname;
    END;
  END LOOP;
END;
$$;
