-- Migration: registra a credencial da ElevenLabs no catalogo de integracoes
-- Date: 2026-11-17
-- Purpose: hoje a chave existe APENAS como secret de edge function (o log da edge
--          mostra credential_resolved source=env), invisivel na UI: trocar exige o
--          painel do Supabase. Como `resolveCredential` le a tabela ANTES do env
--          (supabase/functions/_shared/credentials.ts:437-467), criar o nome aqui
--          torna /admin/conexoes o lugar de rotacionar a chave, com precedencia
--          sobre o secret antigo.
--          Motivo da rotacao: a ElevenLabs recusa a chave atual com 401
--          ("ElevenLabs scribe credential request failed: { status: 401 }"), que a
--          funcao devolve como 500 ao navegador.
--          Cria APENAS o nome, com valor vazio -> inerte ate ser preenchido
--          (secret_value vazio e falsy, segue caindo no env). Segredo nunca entra
--          em migration.

-- `provider` e NOT NULL SEM default e `credential_type` e NOT NULL com default
-- 'api_key' (conferido em information_schema): a versao anterior omitia `provider`
-- e o INSERT falhava com 23502, o que derrubava o Supabase Preview da PR.
INSERT INTO integration_credentials (
  provider, secret_name, credential_type, secret_value, description, created_at, updated_at
)
VALUES (
  'elevenlabs',
  'ELEVENLABS_API_KEY',
  'api_key',
  '', -- valor preenchido em /admin/conexoes; nunca versionado
  'Chave da API ElevenLabs usada pela transcricao por voz (elevenlabs-scribe-token) e pela leitura em voz alta (elevenlabs-tts)',
  NOW(),
  NOW()
)
ON CONFLICT (secret_name) DO UPDATE SET
  provider = EXCLUDED.provider,
  credential_type = EXCLUDED.credential_type,
  description = EXCLUDED.description,
  updated_at = NOW();
