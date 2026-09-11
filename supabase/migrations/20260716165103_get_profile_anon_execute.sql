-- Grant EXECUTE on get_profile_and_roles(uuid) to anon
-- Gate 5 CI smoke test uses anon key; function internal guard rejects anon callers with 42501
GRANT EXECUTE ON FUNCTION public.get_profile_and_roles(uuid) TO anon;;
