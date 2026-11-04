REVOKE EXECUTE ON FUNCTION public.check_login_rate_limit(text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.fn_check_login_allowed(...) -- city bypass P1 fix + GRANTs P2

REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text,text,text,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_check_login_allowed(text,text,text,text) TO anon;

GRANT EXECUTE ON FUNCTION public.fn_check_login_allowed(text,text,text,text) TO authenticated;
