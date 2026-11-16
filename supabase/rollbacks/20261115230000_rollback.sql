-- Rollback: 20261115230000_ai_function_routing_mockup_assistant.sql
-- Remove a linha de roteamento de IA da edge `mockup-assistant`.
--
-- CUIDADO, e o ponto que torna este rollback seguro: a migration usa
-- ON CONFLICT (function_name) DO NOTHING. Se a funcao JA tinha rota antes dela,
-- nada foi inserido, e apagar por `function_name` destruiria a rota preexistente,
-- que nao e nossa. Por isso o DELETE e identificado pelo texto de `notes` que a
-- propria migration grava: so a linha que ELA criou casa com essa condicao.
--
-- Efeito no negocio: depois deste rollback o assistente do gerador de mockups
-- volta a devolver 502 em todo pedido, porque o roteador exige uma linha ativa e
-- nao tem modelo padrao quando ela falta. Reverta o front/edge junto, ou o
-- vendedor ve "assistente indisponivel" ao abrir o chat.

DELETE FROM public.ai_function_routing
 WHERE function_name = 'mockup-assistant'
   AND notes = 'Assistente do gerador de mockups. SOMENTE DeepSeek Flash, nunca Pro: fallback vazio de proposito (PR #3666).';
