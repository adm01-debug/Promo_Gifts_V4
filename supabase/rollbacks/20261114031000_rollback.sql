-- Rollback de 20261114031000: remove a coluna is_trusted (perde as marcações "dispositivo confiável").
ALTER TABLE public.user_known_devices DROP COLUMN IF EXISTS is_trusted;
