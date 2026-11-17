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

INSERT INTO integration_credentials (secret_name, secret_value, description, created_at, updated_at)
VALUES (
  'ELEVENLABS_API_KEY',
  '', -- valor preenchido em /admin/conexoes; nunca versionado
  'Chave da API ElevenLabs usada pela transcricao por voz (elevenlabs-scribe-token) e pela leitura em voz alta (elevenlabs-tts)',
  NOW(),
  NOW()
)
ON CONFLICT (secret_name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();
