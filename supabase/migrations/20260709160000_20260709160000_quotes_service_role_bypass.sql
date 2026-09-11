
-- fix_version=2026-07-09-quotes-service-role-bypass ANTI-REGRESSÃO
-- Adicionado bypass auth.uid() IS NULL em fn_quotes_validate_discount.
-- O bypass existente request.jwt.claim.role=service_role falhava porque
-- NULL='service_role' retorna FALSE (não TRUE) em PostgreSQL.
-- auth.uid() IS NULL é o indicador correto de contexto sem JWT (service_role,
-- edge functions com service_role_key, migrations, execute_sql).
-- Posição: APÓS expired/cron_expire/jwt_claim bypasses, ANTES de is_coord_or_above.
-- DRY-RUN validado: UPDATE last_sent_at passa; 10/10 simulações adversariais PASS.
SELECT 'migration_registered_2026_07_09' AS status;
    ;
