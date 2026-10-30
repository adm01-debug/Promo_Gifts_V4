# Graphify — mapas separados e benchmark de versão

**Data:** 2026-10-29  
**Versão homologada:** `graphifyy 0.9.91`  
**Estado:** mapa principal não direcionado; SQL analisado em mapa separado.

## Decisões

1. O relatório chama os nós com grau zero ou um de **nós de baixa conectividade**. É uma medida de vizinhança estrutural, não evidência de causalidade ou de defeito no código.
2. Dependências, saídas geradas, configurações e nós sem origem de código são removidos da população e das relações usadas nessa métrica. Relações estruturais de código, inclusive `contains` entre arquivo e declaração, permanecem para não inflar artificialmente o número de nós de baixa conectividade.
3. Todos os arquivos `*.sql` ficam fora do mapa principal. `npm run graphify:sql` extrai migrations e testes SQL em uma saída isolada e ignorada pelo Git, em `graphify-out/sql/`.
4. `npm run graphify:enrich-types` usa a TypeScript Compiler API para registrar referências entre arquivos para declarações de tipos, interfaces, classes e enums. As arestas `references_type` são extraídas do código e indicam referência estática; o mapa continua sendo não direcionado para as análises de comunidade.

## Benchmark isolado: 0.9.68 versus 0.9.91

O teste da versão `0.9.68` foi executado em ambiente isolado; não alterou a instalação global nem o mapa homologado. Na mesma fotografia do repositório, a extração registrou:

| Versão | Nós extraídos | Arestas extraídas | Modo direcionado |
|---|---:|---:|---|
| `0.9.68` | 23.190 | 48.997 | habilitado para avaliação |
| `0.9.91` | 43.127 | 71.301 | habilitado para avaliação |

No modo direcionado, o total aumentou em apenas 28 arcos em relação ao mapa não direcionado nas duas versões avaliadas, e o maior componente fortemente conectado continha 13 nós. Esse resultado não trouxe ganho suficiente para as consultas estruturais e de comunidade usadas pelo projeto. A versão `0.9.91` também extraiu substancialmente mais nós e relações no corpus avaliado.

**Decisão:** manter `0.9.91` e o mapa principal não direcionado. Não atualizar nem substituir a versão homologada com `0.9.68`. A divergência entre o skill instalado no ambiente (0.9.94) e o executável do projeto (0.9.91) é aviso de ferramenta; não autoriza atualização global implícita.

Os totais do benchmark são da extração comparativa e não devem ser comparados diretamente com o grafo final: o mapa final exclui SQL, passa por enriquecimento de referências TypeScript e por clustering.

## Estado dos mapas em 2026-10-29

- Mapa principal: 35.440 nós, 63.580 relações, 1.896 comunidades; `directed: false`.
- Enriquecimento TypeScript: 1.745 arestas `references_type`; 10.453 referências a declarações externas ignoradas; 2 declarações internas sem nó mapeável na extração atual.
- Mapa SQL separado (última execução validada): 3.188 arquivos, 20.285 nós e 21.533 relações; saída em `graphify-out/sql/graphify-out/graph.json`, não versionada.
- Nós de baixa conectividade no mapa principal são recalculados no pós-processamento a cada atualização; o número vigente aparece na seção `Knowledge Gaps` do `graphify-out/GRAPH_REPORT.md`.

## Atualização reproduzível

```sh
npm run graphify:refresh
npm run graphify:sql
npm test -- --run tests/scripts/graphify-metrics.test.mjs tests/scripts/graphify-typescript-references.test.mjs
```

`graphify:refresh` reextrai o mapa principal, adiciona referências TypeScript, reclusteriza e sincroniza métricas e totais do relatório. `graphify:sql` reconstrói somente o mapa SQL. As saídas JSON são locais; os scripts, testes, configuração de exclusão, relatório e este registro são versionáveis.
