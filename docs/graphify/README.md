# Mapas Graphify do Promo Gifts V4

O grafo principal serve para navegar código e documentação. Migrations, snapshots e testes SQL ficam em um mapa separado para não misturar relações de schema e fixtures com as dependências da aplicação.

## Regerar o mapa SQL

Use a versão homologada do Graphify, com dependências npm já instaladas, e execute na raiz do repositório:

```sh
graphify --version
graphify update . --force --no-cluster
node scripts/graphify/enrich_typescript_references.mjs
graphify cluster-only . --graph graphify-out/graph.json --no-viz --no-label
node scripts/graphify/postprocess_report.mjs
python3 scripts/graphify/build_sql_map.py
```

O script exige Graphify `0.9.97`, copia apenas arquivos `*.sql` versionados para um diretório temporário, extrai e agrupa o grafo, e grava os artefatos locais em `graphify-out/sql/graphify-out/`. O corpus temporário é removido ao final. Os arquivos gerados são ignorados pelo Git; o script cria `build-metadata.json` com o commit de origem, versão do Graphify e contagens para identificar a procedência do mapa.

Consulte o mapa SQL sem incluir migrations no grafo principal:

```sh
graphify query "Quais tabelas e funções são criadas nas migrations do Kit Maker?" \
  --graph graphify-out/sql/graphify-out/graph.json --budget 1800
```

O mapa foi validado em 2026-10-29 com 3.188 arquivos, 17.839 nós, 32.709 links serializados e 2.633 comunidades; o Graphify reportou 31.900 arestas após deduplicação para o clustering. A extração estrutural encontra referências SQL nos arquivos, mas não valida que uma migration execute corretamente nem que corresponda ao schema vivo.

## Tipos TypeScript

O passo `enrich_typescript_references.mjs` usa a TypeScript Compiler API instalada pelo projeto para ligar símbolos donos às declarações locais de interfaces, aliases, classes e enums. No checkout `c344508` validado em 2026-10-29, ele produziu 8.061 arestas `references_type` a partir de 4.212 arquivos TypeScript. Exemplo validado: `CatalogContent.tsx` → `CatalogContentProps` → `ActiveColorFilter`. O teste unitário confirma resolução de alias importado e deduplicação; uma execução repetida preservou o SHA-256 do grafo antes do clustering.

## Avaliação do modo direcionado

Graphify `0.9.68` foi executado isoladamente com `uvx` contra o mesmo grafo do commit `a172c252` usado por `0.9.97`:

| Medida | 0.9.97 homologado | 0.9.68 isolado |
|---|---:|---:|
| Nós / arestas do corpus | 40.519 / 68.810 | 40.519 / 68.810 |
| Custo médio estimado por consulta | ~1.623 tokens | ~218.295 tokens |
| Redução média contra corpus sem grafo | 1.664× | 12,4× |
| Caminho de `api_health_requestidfrom` para `api_health_handler` em modo direcionado | Encontrado em 2 saltos | Não encontrado |
| Busca não direcionada do mesmo par | Encontrado em 1 salto | Encontrado em 1 salto |

O resultado não aprova a substituição da versão homologada. Qualquer versão candidata deve manter a cobertura das consultas direcionadas e atingir benchmark comparável antes de substituir `0.9.97`.

## Métrica de conectividade

O pós-processador de relatório substitui “isolated nodes” por “nós de baixa conectividade” e calcula nós com grau ≤1, excluindo manifests/lockfiles de dependências, configurações, referências externas sem arquivo, nós que representam o arquivo e nós estruturais ligados apenas por `contains`. O teste automatizado cobre esses filtros e confirma que comunidades finas continuam no relatório. Não interpretar o total global de nós com grau ≤1 como dívida de código.
