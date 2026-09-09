# Magazine — execução incremental do plano de 50 etapas

Data: 09/09/2026. Rodadas: `codex/magazine-integrity-20260909`,
`codex/magazine-wave2-live-20260909` e `codex/magazine-hardening-20260909`.
Base da rodada de hardening: `80cf74ecc8daff4b7da54d6306dc4a9d19bf3abe`
(`origin/main`, merge do PR #1852).

## Veredito

**A implementação local da rodada de hardening foi concluída e validada, mas a
publicação desta rodada ainda não está concluída.** As cinco rodadas anteriores e
o PR #1852 já estão na `main`; a sexta rodada fecha os callers RPC-first, CAS entre
usuários, importação local atômica, estados imutáveis, sitemap/ready fail-closed,
CSP e gates. Os objetos `20260909200000`, `20260909201000` e `20260909210000`
ainda não estavam no Supabase canônico na última leitura oficial. Por isso, o novo
cliente não deve entrar em produção antes dessas migrations expansivas.

O checklist de homologação integral continua aberto. Não há base para declarar
10/10 ou fidelidade pixel a pixel às cinco imagens: os assets foram autorizados
como aproximação e o ciclo autenticado na produção depende do rollout abaixo.

A instrução explícita do PO autorizou páginas estruturadas (`capa`, `institucional`, `seção`, `produtos`, `contato`), reutilização dos assets atuais e, em seguida, a aplicação das RPCs atômicas. O Supabase canônico recebeu somente seis funções e dez registros de migration forward-only, sem alteração ou remoção de tabela/coluna.

## Rodada de hardening — estado verificável antes da publicação

| Camada | Estado | Evidência |
|---|---|---|
| Código | Validado local | 44 arquivos e 785 testes Magazine aprovados; cobertura crítica aprovada; TypeScript, build, SSOT, `actionlint`, sintaxe shell e `git diff --check` verdes. |
| Browser | Validado local | 11 cenários Chromium aprovados, incluindo 390 px, estados publicado/arquivado somente leitura, A4, retry e páginas estruturadas; nenhum `console.error` inesperado. |
| PostgreSQL 17 | Validado descartável | Migration expansiva, importação transacional, rollback, replay, remapeamento e contrato restritivo compilaram e passaram em banco efêmero. |
| Edge Function | Validado local | `deno lint`, `deno check` e 3 testes da importação local aprovados; uma RPC por revista, sem confirmação falsa em resposta parcial. |
| GitHub | Pendente desta rodada | A branch/PR de hardening deve ser publicada e passar pelos gates antes de merge. |
| Supabase canônico | Pendente desta rodada | `magazines.edit_version`, `magazine_import_local_v2`, `magazine_create_v2` e `get_sitemap_public` não existiam na leitura live anterior ao rollout. |
| Produção Vercel | Baseline saudável, hardening pendente | O baseline `80cf74e` respondia 200 em `/api/health`, `/api/ready`, `/magazine` e `/sitemap.xml`; isso não valida o código desta rodada. |

A migration restritiva foi deliberadamente separada em
`qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql`. Ela só pode ser
promovida/aplicada depois de o novo frontend estar `READY` na Vercel e o smoke
autenticado comprovar os novos callers. Essa separação evita revogar o caminho
legado enquanto o cliente anterior ainda atende produção.

## Evidências executadas

- Instalação isolada pelo lockfile: `npm ci --ignore-scripts --no-audit --no-fund`. Scripts de instalação não foram executados; gates de código foram chamados separadamente. Manifesto/lockfile não alterados.
- Antes da correção: três contratos novos do hook falharam — snapshot completo, retorno nulo e publicação antes do debounce. Os 16 contratos anteriores dessa suite passaram.
- Após a segunda rodada: **768 testes aprovados, 0 falhas**, em 41 arquivos coletados, sem retries. Inclui 193 combinações de publicação, o contrato antes ignorado do trigger e lifecycle in-memory que espelha o trigger.
- Após a terceira rodada: **787 testes do escopo Magazine aprovados, 0 falhas**, em 43 arquivos, sem retries. Inclui paginação estruturada, UI editorial, reordenação e contratos das migrations.
- Após a revisão final: **797 testes aprovados, 40 ignorados e 0 falhas**, em 48 arquivos coletados. Os dez novos contratos cobrem reflow ao trocar template, páginas vazias, texto final, replay seguro, validação null-safe e remapeamento da duplicação.
- Após a revisão pós-publicação: **810 testes aprovados, 40 ignorados e 0 falhas**, em 49 arquivos coletados. A rodada adiciona publicação atômica, rollback quando o token não é emitido, imagens de variantes nas páginas editoriais, teto de 200 páginas, paginação acima de 1.000 itens, duplicação com IDs remapeados e retry real de mutação.
- TypeScript `npm run typecheck`: passou no baseline local. O processo de lint usa o mesmo baseline TypeScript; isso não equivale a todos os gates do GitHub.
- Browser: 13 cenários de auditoria e 10 de controles concluídos sem erros de harness na rodada corrigida; contêm tanto confirmações quanto lacunas conhecidas, não 23 PASS de funcionalidades.
- **7 contratos assertivos no Chromium correspondente ao Playwright instalado passaram**, sem erros de página/React: galeria fria A4, criação com template, CTA público/menu, Fit completo, Ctrl+S, páginas estruturadas e ausência de falso salvo. O harness agora reprova também `console.error` não relacionado ao bloqueio deliberado de rede.
- Larguras 390, 820, 1433 e 1672 px: nenhum overflow horizontal nas telas Identidade/Produtos do harness.
- Gate SSOT `node scripts/validate-supabase-config.mjs`: passou. Diff vazio em estilos/tokens globais, paleta do Magazine, `client.ts`, tipo Product, manifesto e lockfile.
- As dez migrations compilaram em sequência em PostgreSQL 17.6 descartável. Cenários SQL reais passaram para add/reorder/remove, payload SQL nulo, CAS stale, patch allowlisted, versão v2 numérica, cópia com IDs remapeados, publicação atômica, ownership negado e ausência de `EXECUTE` para `anon`. O primeiro dry-run histórico detectou o identificador reservado `offset`; ele foi corrigido e toda a base descartável foi recriada antes da execução verde.
- Auditoria live pelo MCP oficial somente leitura: confirmadas as tabelas, constraints, índices, RLS e o trigger `tg_magazines_on_publish`; ele gera/revoga `public_token` no banco. Após autorização posterior, o run [34393079315](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34393079315) aplicou as cinco RPCs em transação única. O postflight independente confirmou cinco funções e cinco migrations, PostgreSQL 17.6, owner `postgres`, `SECURITY DEFINER`, `search_path` fixo, `anon` sem execução e grants para `authenticated`/`service_role`. A leitura do código da Edge Function live segue bloqueada por escopo insuficiente, portanto a paridade do deploy dessa função não foi certificada.
- O run corretivo [34395700558](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34395700558) aplicou as versões `20260909190000` e `20260909190100` em transação única. O MCP oficial confirmou remapeamento de IDs na duplicação, validação null-safe, duas versões registradas, `anon=false` e grants somente para `authenticated`/`service_role`. A constraint de posição live é diferível e inicialmente adiada; o alerta de colisão na troca era falso positivo comprovado.
- O run final [34397795301](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34397795301) aplicou `20260909190200` e `20260909190300` em transação única. O preflight encontrou `add=1`, `publish=0` e zero versões; o postflight confirmou duas funções, duas versões e zero grants para `anon`. O MCP oficial confirmou as nove versões, seis RPCs, guarda explícita para payload SQL nulo e publicação com lock/validação do token na mesma transação. Os tipos oficiais gerados contêm a mesma assinatura versionada no cliente.
- O run [34399151305](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34399151305) aplicou `20260909190400`: preflight `functions=1/migrations=0`, postflight `1/1/anon=0`. O MCP oficial confirmou dez versões, discriminador v2 obrigatoriamente numérico e predicado null-safe na definição live.

Ambiente de browser: componentes reais, shell mínimo, CRM/autenticação/catálogo/persistência simulados, requisições externas bloqueadas e service workers desabilitados. O client canônico pode emitir aviso de configuração ausente ao carregar módulos; a rede externa permanece bloqueada e os métodos de persistência são substituídos. Isso não é integração real com Supabase. Não foram usados secrets nem dados de clientes reais.

## Mudanças principais e limites

1. Autosave passou a enviar somente campos alterados; o serviço não faz DELETE/INSERT de itens ao receber snapshots legados. Os IDs permanecem estáveis. O contrato de `update` é de metadados; itens usam operações próprias.
2. Fila de gravação por sessão, preservação de edição mais nova, retorno reconciliado, dirty/error e retry inclusive para mutações de itens. Uma mutação já confirmada não é repetida quando somente o drain final falha. **Não é lock transacional entre usuários.**
3. Rascunho/Ctrl+S/publicação/impressão aguardam gravação; links principais do editor também. Fechar abruptamente/offline continua exigindo recuperação mais completa; flush no unmount é best effort.
4. Renderer alinhado, CSS/escopo compartilhados e Fit em largura e altura. Não foram instaladas novas fontes nem substituídos assets editoriais.
5. Criação na galeria mantém template; cards da grade ganharam ações/metadados; links públicos usam a rota existente; busca inclui subtítulo.
6. CRM grava identidade e não pesquisa CNPJ com string vazia; hex acompanha presets; seleção de produtos sobrevive a filtros e erros; estimativa conta páginas reais; imagem escolhida no resumo acompanha a variante.
7. Erros de leitura não viram listas vazias silenciosamente; impressão trata falha de carga. Reordenação local aguarda o snapshot confirmado antes de atualizar `page_order`; as mutações de itens continuam no caminho legado até o rollout das RPCs já disponíveis.
8. Publicação usa a RPC atômica: o navegador não gera token, e status/token só são confirmados juntos; falha do trigger reverte a transação. Textos de abertura/fechamento são editáveis e respeitam 800 caracteres. A lista de produtos deixa de alegar relevância inexistente e ordena preço localmente pelo valor efetivo (`sale_price ?? price`).
9. `page_order` recebeu envelope versionado v2 e retrocompatível. Revistas com `null` ou array legado continuam na paginação automática; a conversão ocorre somente por ação explícita. O editor permite criar, duplicar, editar e reordenar páginas intermediárias sem modificar a paleta.
10. Foram aplicadas e validadas seis RPCs com ownership/admin, `search_path` fixo e privilégio mínimo: adicionar/remover/reordenar itens, duplicar revista, atualizar metadados e publicar. Os callers de publicação e duplicação estão ativos; os quatro restantes permanecem deliberadamente desligados para rollout RPC-first separado e observável.
11. Páginas estruturadas acima da capacidade do template são repartidas no renderer; páginas de produtos vazias são omitidas e o contato usa o texto final atual. A duplicação remapeia os IDs persistidos, o banco rejeita página v2 sem `kind` e a UI bloqueia envelopes acima de 200 páginas.

## Acompanhamento individual

“Implementado/testado” significa verificação local do núcleo da correção, **não homologação em produção**. “Parcial” nunca deve ser convertido automaticamente em checkbox concluído.

| Etapa | Situação                          | Evidência ou trabalho restante                                                                                                                                                                                                            |
| ----- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001   | Parcial                           | SHA local/remoto igual; PRs abertos pesquisados por Magazine: nenhum. Baseline arquivado; capturas antigas ainda em /tmp.                                                                                                                 |
| 002   | Validado local                    | npm ci isolado: Vitest 4.1.11; Chromium 1217 instalado. Sem mudança de lockfile.                                                                                                                                                          |
| 003   | Parcial                           | Contratos de perda/IDs preservados no teste de integração e novas falhas de autosave reproduzidas antes da correção.                                                                                                                      |
| 004   | Decidido/implementado local       | PO escolheu páginas estruturadas e autorizou assets atuais como aproximação; modelo v2 implementado sem alterar a paleta.                                                                                                                 |
| 005   | Validado somente leitura          | MCP oficial confirmou `magazines`, `magazine_items`, templates, constraints/índices/RLS e `tg_magazines_on_publish`. Paridade da Edge Function live permanece bloqueada por escopo insuficiente.                                          |
| 006   | Implementado/testado              | Patches só de campos editados; serviço update não apaga/reinsere itens de snapshots legados.                                                                                                                                              |
| 007   | Implementado/testado              | IDs preservados no autosave; retorno e updatedAt reconciliados; testes reais do serviço com DB em memória.                                                                                                                                |
| 008   | Parcial                           | Fila por sessão e proteção contra resposta antiga. Não há CAS/lock entre abas ou usuários.                                                                                                                                                |
| 009   | Implementado/testado              | Dirty/saving/error; null não confirma sucesso; retry de metadados e mutações, rascunho e Ctrl+S ligados ao flush; mutação confirmada não é repetida após falha do drain final.                                                           |
| 010   | Parcial                           | Flush em publicação, impressão e links internos principais; beforeunload avisa. Saída abrupta/offline e toda navegação do shell ainda não têm recuperação garantida.                                                                      |
| 011   | Validado no canônico              | Dez migrations forward-only para seis RPCs aplicadas; quatro substituem definições sem reescrever histórico. Versões, assinaturas, owner, `search_path` e ACLs confirmados por postflight e MCP oficiais.                                |
| 012   | Backend aplicado; caller pendente | RPCs de add/remove/reorder fazem uma transação por chamada e bloqueiam a revista; runtime atual continua no caminho legado até rollout RPC-first separado.                                                                                |
| 013   | Parcial                           | Erros de listagem/itens não viram vazio; editor/print tratam rejeição; respostas antigas da lista descartadas. Permissões live não certificadas.                                                                                          |
| 014   | Parcial                           | Publicação é uma RPC transacional: lock, requisitos, status e token do trigger são validados juntos; testes provam rollback sem token. Falta ciclo público real autorizado, revogação e paridade da Edge Function live.                  |
| 015   | Parcial                           | Contratos locais e concorrência da sessão passaram; gate de integridade de todas as operações/banco real não encerrado.                                                                                                                   |
| 016   | Implementado/testado              | Origem da transformação corrigida; bounding boxes reais do navegador alinhadas.                                                                                                                                                           |
| 017   | Implementado/testado              | Renderer carrega CSS; galeria usa renderer/escopo compartilhado; acesso frio com 1920×2716 confirmado.                                                                                                                                    |
| 018   | Parcial                           | Amostras Aa aplicam fontFamily; famílias não instaladas e divergências do registry ainda não resolvidas.                                                                                                                                  |
| 019   | Parcial                           | Fit considera altura/largura; controles e quatro larguras exercitados. Homologação completa de foco/tela cheia/múltiplos painéis pendente.                                                                                                |
| 020   | Parcial                           | Flush antes de abrir impressão e erro de leitura tratado; prontidão de assets/fontes e PDF final pendentes.                                                                                                                               |
| 021   | Pendente                          | Registry e compatibilidade das revistas existentes não foram alterados; decisões de produto necessárias.                                                                                                                                  |
| 022   | Decidido/implementado local       | PO autorizou assets existentes como aproximação; capa, institucional e seção os reutilizam. Fidelidade fotográfica exata segue impossível sem os originais.                                                                               |
| 023   | Pendente                          | Composição editorial dos oito templates não refeita; os doze existentes foram preservados.                                                                                                                                                |
| 024   | Parcial                           | Correção de amostras tipográficas; demais elementos do modal aguardam composição/assets e aceite.                                                                                                                                         |
| 025   | Parcial                           | Usar template cria com a escolha; proteção de reentrada e erro; testes atualizados. Ordenação recente e favoritos por conta pendentes.                                                                                                    |
| 026   | Parcial                           | Estados de loading/erro e KPI/lista separados; totais globais e homologação no shell completo pendentes.                                                                                                                                  |
| 027   | Parcial                           | Grade ganhou badge sobre capa, empresa/ícone, produtos/template, menu inferior visível e CTA por status. Modo lista e igualdade visual integral pendentes.                                                                                |
| 028   | Parcial                           | Busca inclui subtítulo; paginação/escopo global e política de normalização ainda pendentes.                                                                                                                                               |
| 029   | Parcial                           | Duplicação RPC ativa remapeia IDs estruturados; validada com PostgreSQL 17 e mock de integração com IDs distintos. Undo/arquivamento e ciclo autenticado real ainda precisam de homologação.                                           |
| 030   | Parcial                           | Links inconsistentes /m substituídos por /revista-publica; CTA validado com token sintético. Token revogado e serving real não validados.                                                                                                 |
| 031   | Parcial                           | Busca textual não casa com CNPJ vazio. Limite de 200 clientes e paginação/busca no servidor ainda pendentes.                                                                                                                              |
| 032   | Parcial                           | Seleção/limpeza usam clientCrmId e Identity propaga o vínculo. Escopo do cache por conta e cenários de overrides manuais pendentes.                                                                                                       |
| 033   | Pendente                          | Contadores e limites soft existentes foram preservados; política de textos legados e novos contratos não homologada.                                                                                                                      |
| 034   | Implementado/testado              | Hex sincroniza com mudanças externas/presets; blur não restaura cor antiga. Cores globais intactas.                                                                                                                                       |
| 035   | Parcial                           | Header passa a mostrar erro real e usar ações aguardáveis; shell completo/stepper ainda não homologado.                                                                                                                                   |
| 036   | Parcial                           | Catálogo continua com lote 80 e categorias locais; a UI não alega mais “Mais relevantes” sem ranking e encaminha nome/preço ao serviço. Paginação e contagens globais continuam pendentes.                                                |
| 037   | Parcial                           | Map de seleção independe do filtro; erro preserva seleção e adição é aguardada/deduplicada. Modalidade de seleção e paginação completa pendentes.                                                                                         |
| 038   | Pendente                          | Favoritos de produtos não implementados; nenhuma tabela de favoritos criada.                                                                                                                                                              |
| 039   | Parcial                           | Resumo usa imagem da variante via helper existente; preço/sale_price preservados. Interação completa de swatches/variantes pendente.                                                                                                      |
| 040   | Parcial                           | Estimativa usa paginação real e agora recalcula/reparte páginas ao trocar densidade do template; resumo não declara sucesso global falso; clear aguarda. Catálogo paginado ainda está pendente.                                       |
| 041   | Implementado/testado local        | Contrato v2: capa, institucional, seção, produtos e contato; IDs persistentes e limites defensivos.                                                                                                                                       |
| 042   | Implementado e validado no banco  | Envelope versionado reutiliza `page_order`; arrays/null legados permanecem automáticos. A validação live agora rejeita campos obrigatórios nulos/ausentes e IDs repetidos, sem migration de dados.                                      |
| 043   | Implementado/testado local        | UI cria seção/institucional, duplica/exclui páginas editoriais e edita título/texto. Operações de produto continuam separadas.                                                                                                            |
| 044   | Implementado/testado local        | Reordenação preserva extremos; itens novos entram antes do contato; páginas acima da capacidade são repartidas e páginas vazias omitidas; IDs duplicados/malformados são rejeitados.                                                    |
| 045   | Implementado/testado local        | Institucional e contato renderizam no preview, impressão e viewer pelo renderer compartilhado; assets atuais e cores existentes são preservados.                                                                                          |
| 046   | Parcial                           | Rodada final: 810 aprovados, 40 ignorados, zero falhas em 49 arquivos; inclui publicação/duplicação atômicas, paginação de 1.005 itens, reflow e renderer editorial. Verificações browser permanecem locais.                              |
| 047   | Bloqueado ambiente                | Harness isolado não substitui E2E autenticado com backend real de teste.                                                                                                                                                                  |
| 048   | Parcial                           | Quatro larguras sem overflow; cores/guardas sem diff. Sem comparação pixel a pixel com shell completo nem aceite PO.                                                                                                                      |
| 049   | Aplicado/validado no canônico     | Seis objetos e quatro substituições corretivas autorizadas, aplicadas nas versões `20260909181000`–`20260909181400` e `20260909190000`–`20260909190400`; zero grants para `anon`.                                                       |
| 050   | Em publicação                     | Código publicado no PR #1852; merge, deployment Vercel e homologação integral ainda não encerrados neste registro.                                                                                                                        |

## Próxima sequência segura

1. Publicar a branch de hardening e abrir PR contra a `main`; executar todos os gates, sem bypass.
2. Aplicar no Supabase canônico, nesta ordem, as migrations expansivas `20260909200000`, `20260909201000` e `20260909210000`; validar por `pg_catalog`, privilégios e chamada real do sitemap.
3. Publicar `magazine-import-local` e validar uma importação autenticada, replay idempotente e conflito de versão.
4. Somente depois do banco expansivo verde, integrar o PR e aguardar deployment Vercel `READY`.
5. Validar `/api/health`, `/api/ready`, `/sitemap.xml`, `/magazine`, ciclo draft/publicado/arquivado e duas sessões concorrentes.
6. Promover e aplicar a migration restritiva RPC-only; repetir smoke e auditoria de ACL/RLS.
7. Manter como backlog explícito — não como falso concluído — favoritos, paginação server-side do CRM, assets fotográficos finais e comparação pixel a pixel no shell completo.

## Reprodução e artefatos

[Plano](MAGAZINE_CORRECOES_E_MELHORIAS_50_ETAPAS_2026-09-09.md) · [auditoria-base histórica](../audits/MAGAZINE_REFERENCIAS_BASELINE_2026-09-09.md) · [contratos browser](../evidence/magazine-20260909/browser-contracts.json) · [controles browser](../evidence/magazine-20260909/browser-controls.json).

Harness reproduzível: [instruções](../../tests/magazine/browser/README.md). Contratos de serviço: `tests/integration/magazine-service-fuzz.test.ts`; fila: `src/pages/magazine/__tests__/editorPersistence.test.ts`; controles: `src/pages/magazine/components/__tests__/MagazineControls.regression.test.tsx`.

```bash
npm run test -- --retry=0 src/pages/magazine tests/magazine src/services/__tests__/magazine tests/integration/magazine-service-fuzz.test.ts src/lib/security/__tests__/magazine-guard.test.ts
npm run qa:typecheck
node scripts/validate-supabase-config.mjs
```

Resultados completos temporários: `/tmp/promo-magazine-validation-20260909-DKFGKd/unit-results.json`, `scenario-results.json` e screenshots no mesmo diretório. As capturas ainda usam fotografias placeholder; não comprovam fidelidade às referências. O teste E2E de criação foi atualizado com interceptação de escrita sintética; a suite E2E autenticada completa não foi executada.
