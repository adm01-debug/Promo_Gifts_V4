-- Rollback de 20261022203935_update_company_fields_security_fix.sql
-- Esta migration ADICIONA o guard auth.uid() em public.update_company_fields (E18). Voltar à
-- definição da 20261022195616 reabriria a escrita em empresas de outros usuários, então este
-- arquivo falha de propósito. Para desfazer, usar migration nova revisada pelo PO.
DO $rollback$
BEGIN
  RAISE EXCEPTION 'rollback bloqueado: 20261022203935 é correção de segurança (guard auth.uid()); reverter exige migration nova aprovada';
END
$rollback$;
