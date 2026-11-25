-- Rollback: 20261125074200_revoke_anon_apply_classification_suggestions.sql
-- Restaura o estado anterior: EXECUTE concedido a PUBLIC (grant default de fabrica da funcao).
--
-- ATENCAO: reabre a escrita irrestrita em product_category_assignments por qualquer portador da
-- chave anon. Use so para reverter a migration caso o service_role precise do estado original.

GRANT EXECUTE ON FUNCTION classification_audit.apply_high_confidence_suggestions(boolean, integer) TO PUBLIC;
REVOKE EXECUTE ON FUNCTION classification_audit.apply_high_confidence_suggestions(boolean, integer) FROM service_role;