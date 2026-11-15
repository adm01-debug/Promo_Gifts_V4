-- Rollback: supabase/rollbacks/20261114031000_rollback.sql
-- Bug: o front grava e lê `user_known_devices.is_trusted`, mas a coluna não existe em produção.
--   src/hooks/admin/useDeviceDetection.ts:177 → .update({ is_trusted: true })  (PostgREST 400: coluna inexistente)
--   src/components/auth/KnownDevicesManager.tsx:31,152,176 → selo "confiável" e botão "Confiar" sempre como não confiável
-- Produção (information_schema.columns, 2026-11-14, read-only): id, user_id, fingerprint, device_name,
-- last_seen_at, created_at — sem is_trusted. O contrato previsto em 20251231121324 nunca chegou à tabela
-- viva (CREATE TABLE IF NOT EXISTS não altera tabela existente).
-- RLS já cobre o UPDATE: policy "Users can manage their own devices" (ALL, auth.uid() = user_id).
-- ADD COLUMN com default constante é só metadado no PG ≥ 11 (sem reescrita da tabela).
ALTER TABLE public.user_known_devices
  ADD COLUMN IF NOT EXISTS is_trusted boolean NOT NULL DEFAULT false;
