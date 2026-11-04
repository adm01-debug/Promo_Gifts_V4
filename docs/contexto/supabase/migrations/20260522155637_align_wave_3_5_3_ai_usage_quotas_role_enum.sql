-- Wave 3.5.3: Converter ai_usage_quotas.role de text → app_role (alinhar com Lovable)
-- Pré-validado: todos os valores existentes (admin,agente,dev,manager,supervisor) estão no enum

ALTER TABLE public.ai_usage_quotas 
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role;
