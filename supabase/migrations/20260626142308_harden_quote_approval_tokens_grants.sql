-- quote_approval_tokens guarda tokens de aprovação/e-assinatura de orçamento (campos legais:
-- signer_document, signature_hash, signed_at). As 4 policies cobrem apenas authenticated (seller/
-- admin via can_view_all_sales/seller_id). O cliente anônimo interage SOMENTE via RPCs SECURITY
-- DEFINER (get_quote_token_by_value, submit_quote_response), que ignoram grants de tabela. Não há
-- acesso direto de anon (RLS já nega; app não faz from('quote_approval_tokens')). Removemos grants
-- desnecessários de anon e os DDL-grants de authenticated.
REVOKE ALL ON public.quote_approval_tokens FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quote_approval_tokens FROM authenticated;;
