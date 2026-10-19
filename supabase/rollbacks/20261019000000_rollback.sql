-- Rollback para 20261019000000_mirror_oob_frontend_telemetry_v_system_health_dashboard
-- Desfaz: constraint frontend_telemetry_size_caps_check + view v_system_health_dashboard
-- Nota: estes objetos foram aplicados out-of-band (OOB); este rollback os remove

ALTER TABLE "public"."frontend_telemetry" DROP CONSTRAINT IF EXISTS "frontend_telemetry_size_caps_check";
DROP VIEW IF EXISTS "public"."v_system_health_dashboard";
