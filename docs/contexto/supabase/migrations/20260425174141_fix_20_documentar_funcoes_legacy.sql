COMMENT ON FUNCTION fn_simular_combo_gravacao_v8_legacy(jsonb) IS 
'LEGACY: versao 8 da funcao de cotacao. Substituida pela v10/v11. Mantida para rollback de emergencia. Drop programado: 2026-10-25 (180 dias).';

COMMENT ON FUNCTION fn_simular_combo_gravacao_v9_legacy_2026_04(jsonb) IS 
'LEGACY: versao 9 (so cobria 3 grupos tecnicos: SERIGRAFIA, TRANSFER_DIGITAL, SUBLIMACAO). Renomeada em 2026-04-25 quando fn_simular_combo_gravacao foi promovida para wrapper da v10. Mantida para rollback de emergencia. Drop programado: 2026-10-25 (180 dias).';

COMMENT ON FUNCTION fn_audit_gravacao_changes() IS
'Trigger function que popula audit_log_gravacao a cada INSERT/UPDATE/DELETE em tabela_preco_gravacao_oficial e suas faixas. Captura usuario, timestamp e snapshot antes/depois.';
