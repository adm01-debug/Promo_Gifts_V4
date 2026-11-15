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

- Mapa principal (relatório versionado): 40.829 nós, 69.366 relações, 2.207 comunidades; `directed: false`; regenerado com a versão homologada `graphifyy 0.9.91` sobre o SHA `7eea1696`.
- A métrica filtrada registra 14.730 nós de baixa conectividade em uma população de 17.972 nós de código elegíveis. Foram excluídos nós estruturais de arquivo (4.104), configuração (5.444), não código (13.187) e dependências (122).
- Enriquecimento TypeScript: 1.714 pares de referências analisados; 0 arestas novas porque as relações já estavam presentes; 10.343 referências externas ignoradas; 46 arquivos de origem e 2 declarações sem nó interno mapeável na extração atual.
- Mapa SQL separado (última execução validada): 3.189 arquivos, 20.306 nós e 21.533 relações; saída em `graphify-out/sql/graphify-out/graph.json`, não versionada.
- Nós de baixa conectividade no mapa principal são recalculados no pós-processamento a cada atualização; o número vigente aparece na seção `Knowledge Gaps` do `graphify-out/GRAPH_REPORT.md`.

### Refresh após sincronização com `main` — 2026-10-29

Após incorporar a árvore de código da `main` no commit `8021e0d58`, a versão fixada `graphifyy 0.9.91` gerou o relatório atual com 41.230 nós, 69.904 relações após o enriquecimento TypeScript e 2.163 comunidades. A métrica recalculada encontrou 14.852 nós de baixa conectividade entre 18.109 nós de código elegíveis; foram excluídos 4.134 nós estruturais, 5.445 de configuração, 13.420 não código e 122 dependências. O benchmark em `7eea1696` acima permanece como fotografia comparativa anterior, não como contagem do relatório atual.

O parser Graphify ainda registra erro parcial em `src/integrations/supabase/types.ts:42514`; o typecheck e o build independentes passam. A extração é completada com aviso e não altera o código-fonte.

## Atualização reproduzível

```sh
npm run graphify:refresh
npm run graphify:sql
npm test -- --run tests/scripts/graphify-metrics.test.mjs tests/scripts/graphify-typescript-references.test.mjs
```

`graphify:refresh` reextrai o mapa principal, adiciona referências TypeScript, reclusteriza e sincroniza métricas e totais do relatório. `graphify:sql` reconstrói somente o mapa SQL. As saídas JSON são locais; os scripts, testes, configuração de exclusão, relatório e este registro são versionáveis.
