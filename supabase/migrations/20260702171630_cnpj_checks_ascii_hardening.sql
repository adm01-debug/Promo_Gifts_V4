-- Gap descoberto em simulação (1.056 cenários): '\d' do Postgres classifica
-- dígitos Unicode (fullwidth/arábico/devanágari) como [[:digit:]], aceitando
-- CNPJ não-ASCII via API direta. Fix: classe explícita [0-9].
-- Nomes preservados => contrato do mapCnpjError() intacto (validado 330/330).

ALTER TABLE public.suppliers
  DROP CONSTRAINT suppliers_cnpj_digits_only_chk;
ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_cnpj_digits_only_chk
  CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]+$');

ALTER TABLE public.supplier_branches
  DROP CONSTRAINT supplier_branches_cnpj_digits_only_chk;
ALTER TABLE public.supplier_branches
  ADD CONSTRAINT supplier_branches_cnpj_digits_only_chk
  CHECK (cnpj IS NULL OR cnpj::text ~ '^[0-9]+$');;
