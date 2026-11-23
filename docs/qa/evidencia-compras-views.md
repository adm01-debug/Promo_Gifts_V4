# Evidencia ? Etapa 001 ? Consumidores das views v_compras_*

> Coletado em 2026-11-23 ? commit base 042c2122 ? branch: claude/chore-qa-etapa-001-compras-261123-1100

## Resumo executivo

As tres views v_compras_catalogo, v_compras_precos_faixa e v_compras_precos_variante tem exatamente
um consumidor identificado: o repositorio adm01-debug/Promo_Supply_V2, via edge function external-db-bridge.
Nenhum arquivo em src/ nem em supabase/functions/ do repositorio atual as referencia.

## Arquitetura do consumo

  Promo Supply V2 (browser)
    src/hooks/useCatalogoPim.ts
      supabase.functions.invoke('external-db-bridge', body)
        supabase/functions/external-db-bridge/index.ts (Supply V2)
          createClient(EXTERNAL_DB_URL, EXTERNAL_DB_KEY)
            externalClient.from('v_compras_catalogo').select(*)
            externalClient.from('v_compras_precos_faixa').select(*)

EXTERNAL_DB_URL = URL do projeto Promo Gifts V4.
EXTERNAL_DB_KEY = chave no secret do Supply V2. Dado que as views respondem ao anon,
provavelmente usa a anon key do Gifts V4.

## Colunas sensiveis consumidas

v_compras_catalogo: cost_price, supplier_id, supplier_code, supplier_name, supplier_reference
v_compras_precos_faixa: unit_cost
v_compras_precos_variante: NAO referenciada em useCatalogoPim.ts (ja retorna 401 ao anon)

## Impacto das etapas 002-003 no Supply V2

Etapa 002: cost_price e supplier_* ficam null no catalogo.
Etapa 003: unit_cost fica null/zero nas faixas.
Recomendacao: aplicar fora do horario de pico e avisar o time do Supply V2 para trocar
EXTERNAL_DB_KEY por credencial authenticated se quiserem continuar vendo o custo.

## Consultas tentadas

supabase link -> 403 sem privilegio (Supabase CLI).
GitHub API (Promo Supply V2 src/hooks/useCatalogoPim.ts) -> leitura direta bem-sucedida.
grep v_compras em src/ e supabase/functions/ do Gifts V4 -> zero resultados (confirmado).
