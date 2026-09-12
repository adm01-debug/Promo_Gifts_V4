# Kit Maker — revisão pós-implementação das 100 etapas

Data da revisão: 12/09/2026. Rota: `/montar-kit`. Projeto canônico: `doufsxqlfjyuvxuezpln`.

## 1. Veredito executivo

A rodada corretiva eliminou as três falhas reproduzidas na auditoria anterior e implementou as principais lacunas funcionais de IA, personalização, comparação de caixas, persistência, biblioteca, estoque e revisão. Uma segunda revisão adversarial encontrou doze defeitos adicionais; todos receberam correção e regressão dedicada. A suíte agregada do módulo terminou com **33 arquivos e 218 testes aprovados** (mais dois arquivos e dez testes que na primeira medição), sem testes diagnósticos vermelhos. TypeScript, lint dos arquivos alterados, build de produção e orçamento de bundle também passaram.

O resultado ainda não deve ser chamado de `100/100 aceito` por quatro razões externas ao código implementado:

1. as oito superfícies autenticadas ainda não tiveram comparação visual humana e pixel a pixel nos viewports contratados;
2. os fluxos com JWT real — upload, geração de mockup, IA e criação de orçamento — não foram exercitados nesta worktree com um usuário de teste autorizado;
3. o token administrativo disponível na CLI não enxerga o projeto canônico, impedindo uma nova inspeção de `pg_catalog` e a regeneração segura de `types.ts`;
4. o catálogo canônico atualmente tem zero templates ativos de kit e nenhum valor preenchido em `packaging_finish`; o código oferece fallback real de catálogo, mas os dados editoriais continuam pendentes.

O branch foi publicado no PR #1860 e também teve build manual de preview aprovado. Portanto, o estado correto é: **implementação corretiva publicada para revisão; validação automatizada local e preview aprovados; integração REST canônica validada em leitura; aceite visual, integrações autenticadas, merge e publicação de produção ainda pendentes**.

## 2. Escopo efetivamente alterado

- Estoque agregado por produto/variante, distinção entre zero e desconhecido e revalidação fresca antes do orçamento.
- Retry de autosave com o mesmo `request_id` e o mesmo snapshot congelado.
- Sugestões de IA transformadas em até três composições determinísticas com produtos reais, caixa compatível e orçamento recalculado localmente.
- Aplicação atômica da composição escolhida ao editor.
- Personalização em três colunas, técnica, área, paleta, dimensões, frente/verso, zoom, tela cheia, reuso de arte e geração real por `generate-mockup`.
- Preço de personalização com setup, mínimo, quantidade precificada e proteção contra respostas fora de ordem.
- Comparação de duas ou três caixas com escolha da vencedora e preview contextual.
- Persistência de cliente CRM, dados manuais, estado de cotação e ID do kit de origem dentro do snapshot versionado já existente.
- Biblioteca com indicadores, filtros de status, busca, ordenação, grid/lista e tratamento seguro de erro.
- Landing com templates reais quando disponíveis e composições determinísticas a partir do catálogo quando não existem templates ativos.
- Workspace de itens com filtros avançados, ordenação e composição lateral; revisão reorganizada em dois painéis.
- Atualização de TypeScript para versão compatível com as declarações do Vite instalado.

Nenhuma migration, DDL, alteração de dado comercial ou deploy de Edge Function foi realizado nesta rodada.

## 3. Falhas da auditoria anterior

| ID  | Falha anterior                                                               | Estado atual  | Evidência                                                                                                            |
| --- | ---------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| F01 | demanda genérica e variante podiam disputar o mesmo estoque sem soma correta | **CORRIGIDA** | `evaluateKitStock` agrega a demanda por produto e distribui a disponibilidade sem contagem dupla; regressão aprovada |
| F02 | estoque nulo era convertido em zero                                          | **CORRIGIDA** | completude é preservada e o resultado passa a `unknown`; rótulos e bloqueio comercial cobertos por testes            |
| F03 | retry do primeiro autosave criava nova identidade/payload                    | **CORRIGIDA** | operação pendente conserva `request_id` e payload congelado até resolver; regressão aprovada                         |

O teste diagnóstico `tests/audit/kit-maker-plan-review.test.tsx`, originalmente vermelho, agora faz parte da regressão verde.

### 3.1 Segunda revisão adversarial do PR

| Achado | Risco reproduzido                                                            | Correção e prova                                                                                                                 |
| ------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| R01    | retry de autosave podia salvar o snapshot antigo e perder a edição nova      | versão local de edição agenda imediatamente o snapshot novo após recuperar a operação congelada; teste de três chamadas/revisões |
| R02    | `client_id` selecionado no CRM não seguia para o orçamento                   | campo incluído em `_quote`; teste de payload                                                                                     |
| R03    | IA consumia todo o limite com itens e não reservava a caixa                  | busca limitada por subconjuntos encontra combinação válida dentro do orçamento; regressão 45+25+caixa 20 em limite 90            |
| R04    | variante irmã com estoque nulo bloqueava uma variante escolhida e conhecida  | desconhecido agora é avaliado na unidade de estoque efetivamente consumida; teste de variantes irmãs                             |
| R05    | limite mínimo do briefing de IA era ignorado                                 | composições abaixo do mínimo e faixas invertidas são rejeitadas; regressões dedicadas                                            |
| R06    | retry de orçamento revalidava estoque antes de recuperar um commit existente | recibo idempotente exato é repetido antes da validação aplicável a nova operação; teste confirma uma única leitura de estoque    |
| R07    | só a personalização visível era reprecificada após mudar quantidade          | sincronizadores reativos cobrem todos os alvos habilitados; teste confirma quantidades 50 e 100 simultaneamente                  |
| R08    | resposta tardia de mockup podia sobrescrever técnica/arte alteradas          | fingerprint e geração monotônica descartam resposta obsoleta; teste assíncrono troca a arte durante a geração                    |
| R09    | paleta da arte era enviada em chave que o writer canônico ignora             | paleta passa também pelo campo `notes` suportado da personalização, sem DDL; teste do payload de produção                        |
| R10    | filtros de material/preço/ordenação sumiam com uma única categoria           | somente o seletor de categoria depende da cardinalidade; teste de acessibilidade garante os controles                            |
| R11    | clone de template alterava a URL, mas mantinha a landing montada             | modo landing acompanha `kit`/`product` na URL; contrato de rota testado                                                          |
| R12    | falha do catálogo era escondida quando `kit_templates` estava vazio          | erro combinado oferece retry e não simula catálogo vazio; teste de componente                                                    |

O controle de remoção de arte usado pelo Kit Maker também passou a apenas desvincular a URL: uma arte reutilizada por outra linha, rascunho ou orçamento não é apagada do Storage.

## 4. Reavaliação das lacunas G01–G13

| ID                            | Estado                               | Resultado atual                                                     | Limite remanescente                                                                          |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| G01 IA só filtrava            | **RESOLVIDA**                        | composições reais, alternativas, orçamento e caixa compatível       | happy path do provedor com JWT real                                                          |
| G02 personalização incompleta | **RESOLVIDA NO CÓDIGO**              | três colunas, paleta, lados, zoom, fullscreen, reuso e geração      | aceite visual e geometria técnica homologada                                                 |
| G03 preço incoerente          | **RESOLVIDA NO CLIENTE**             | setup/mínimo/total/quantidade e descarte de resposta velha          | confronto com casos comerciais reais                                                         |
| G04 comparação ausente        | **RESOLVIDA**                        | diálogo de comparação de caixas e seleção vencedora                 | aceite visual                                                                                |
| G05 estrutura de caixas       | **PARCIAL POR DADO**                 | filtros, foco, preview e recomendação implementados                 | `packaging_finish` não está populado e não existe fechamento canônico confirmado             |
| G06 layout genérico           | **RESOLVIDA**                        | workspace lateral e revisão em dois painéis                         | responsividade visual humana                                                                 |
| G07 destaques eram produtos   | **RESOLVIDA COM FALLBACK**           | templates reais; sem templates, composição baseada no catálogo real | curadoria editorial de templates no banco                                                    |
| G08 biblioteca incompleta     | **RESOLVIDA**                        | stats, status, busca, ordenação e grid/lista                        | jornada autenticada com volume real                                                          |
| G09 cliente não persistia     | **RESOLVIDA**                        | `client_id` e dados manuais no snapshot versionado                  | round-trip real autorizado                                                                   |
| G10 origem do orçamento       | **RESOLVIDA NO PAYLOAD**             | ID do kit e arte/mockup seguem na cotação                           | inspeção do registro real criado                                                             |
| G11 estoque/frete             | **ESTOQUE RESOLVIDO; FRETE PARCIAL** | leitura fresca fail-closed antes da RPC                             | frete continua estimativa, sem transportadora/CEP real                                       |
| G12 types/base                | **PARCIAL EXTERNO**                  | objetos/RPCs confirmados via REST/OpenAPI                           | `set_custom_kit_pinned` ainda ausente do type gerado; CLI sem acesso administrativo canônico |
| G13 cobertura                 | **AMPLIADA**                         | 218 testes focados, typecheck, lint, build e bundle verdes          | baselines visuais e E2E autenticado ainda pendentes                                          |

## 5. Matriz atual das 100 etapas

Legenda: `I` = implementada e validada localmente; `P` = implementação presente, mas depende de dado/serviço/aceite externo; `V` = validação externa ou humana pendente. Nenhuma etapa recebe “aceite PO” automaticamente.

| Etapa | Estado | Síntese da revisão pós-correção                                                                       |
| ----: | :----: | ----------------------------------------------------------------------------------------------------- |
|   001 |   P    | Código no PR #1860, preview manual e REST canônico conferidos; merge de produção ainda pendente.      |
|   002 |   I    | Trabalho isolado em branch/worktree e alterações de outros agentes preservadas.                       |
|   003 |   V    | Referências catalogadas; medição pixel a pixel autenticada ainda pendente.                            |
|   004 |   P    | Requisitos corretivos rastreados; plano histórico de 2.000 subitens não foi reaberto artificialmente. |
|   005 |   I    | Este relatório é o registro único de implementação, evidência e limites.                              |
|   006 |   P    | Ambiente local representativo validado; faltam credenciais de usuário de teste.                       |
|   007 |   I    | Falhas de estoque, retry, preço, concorrência de resposta e ausência de dados simuladas.              |
|   008 |   I    | Dois percursos e transições preservam a composição.                                                   |
|   009 |   I    | Hooks e componentes foram especializados sem duplicar o domínio central.                              |
|   010 |   V    | Critérios existem; aceite visual pertence ao PO.                                                      |
|   011 |   I    | Cores e tokens atuais preservados; alterações ficaram no módulo.                                      |
|   012 |   P    | Grades responsivas implementadas; inspeção humana em 1440/1024/390 pendente.                          |
|   013 |   P    | Hierarquia/textos/ícones aproximados; comparação final pendente.                                      |
|   014 |   P    | Assets atuais usados conforme autorização; paridade fotográfica exata não é possível sem originais.   |
|   015 |   I    | Loading, erro, vazio, seleção e feedback implementados nos novos fluxos.                              |
|   016 |   I    | Estado e validação do wizard consolidados.                                                            |
|   017 |   I    | Snapshot versionado restaura cliente, cotação, itens e origem.                                        |
|   018 |   I    | Contratos transacionais existentes preservados e consumidos.                                          |
|   019 |   I    | Autosave serializado, idempotente e recuperável no cliente.                                           |
|   020 |   V    | RLS real com usuários A/B requer sessões autorizadas.                                                 |
|   021 |   P    | REST/OpenAPI verificados; `pg_catalog` administrativo pendente.                                       |
|   022 |   I    | Produtos e variantes reais consultados e normalizados.                                                |
|   023 |   I    | Embalagens usam o domínio canônico `product_type=packaging`.                                          |
|   024 |   P    | Projeção comercial usada; acabamento não tem dados preenchidos.                                       |
|   025 |   I    | Moeda, quantidades e desconhecidos tratados sem falso zero.                                           |
|   026 |   I    | Preço comercial e de personalização deixam de aceitar valor velho/incompleto.                         |
|   027 |   I    | Demanda por variante/produto e leitura fresca implementadas.                                          |
|   028 |   I    | Busca, filtros, paginação lógica e ordenação implementados.                                           |
|   029 |   I    | Imagens e fallbacks usam catálogo real.                                                               |
|   030 |   P    | Runtime reconciliado; regeneração segura de types aguarda acesso administrativo.                      |
|   031 |   I    | Cabeçalho e ações da landing reconstruídos.                                                           |
|   032 |   I    | Hero “itens primeiro” implementado.                                                                   |
|   033 |   I    | Hero “caixa primeiro” implementado.                                                                   |
|   034 |   I    | Benefícios e ajuda contextual implementados.                                                          |
|   035 |   I    | Templates reais/fallback de composição substituem produtos avulsos.                                   |
|   036 |   I    | CTA abre IA e aplica composição escolhida.                                                            |
|   037 |   V    | Primeira tela precisa de aceite visual autenticado.                                                   |
|   038 |   I    | Biblioteca reconstruída com controles contratados.                                                    |
|   039 |   I    | Cards e ações preservados e ampliados.                                                                |
|   040 |   V    | Aceite visual da biblioteca pendente.                                                                 |
|   041 |   I    | Workspace de itens e sidebar de composição implementados.                                             |
|   042 |   I    | Cards exibem identidade, imagem, variante, preço e disponibilidade.                                   |
|   043 |   I    | Filtros, categorias, preço, personalização e ordenação integrados.                                    |
|   044 |   I    | Variantes e quantidades preservam identidade por linha.                                               |
|   045 |   I    | Composição lateral editável e sticky implementada.                                                    |
|   046 |   I    | Validação distingue carregando, desconhecido, indisponível e disponível.                              |
|   047 |   I    | Salvar/retomar inclui estado comercial e cliente.                                                     |
|   048 |   I    | Avanço para caixas mantém seleção e revalida dados.                                                   |
|   049 |   P    | Sem erro estrutural nos testes; teclado/leitor e catálogo extremo pendentes.                          |
|   050 |   V    | Aceite humano da tela de itens pendente.                                                              |
|   051 |   I    | Escolha de caixa possui filtros, catálogo e preview lateral.                                          |
|   052 |   P    | Medidas/material/preço/acabamento suportados; fechamento não foi inventado sem schema.                |
|   053 |   I    | Preview acompanha foco/seleção e permite confirmação.                                                 |
|   054 |   I    | Encaixe evita afirmação positiva com dimensões incompletas.                                           |
|   055 |   I    | Ocupação e espaço livre usam medidas disponíveis e exibem incerteza.                                  |
|   056 |   I    | Ranking e justificativas de recomendação implementados.                                               |
|   057 |   I    | Página de recomendações usa composição atual e caixas calculadas.                                     |
|   058 |   I    | Comparação de duas ou três caixas e escolha vencedora integradas.                                     |
|   059 |   P    | Ausência/troca tratadas; revalidação real com dados extremos pendente.                                |
|   060 |   V    | E2E autenticado dos dois percursos pendente.                                                          |
|   061 |   I    | Personalização é mantida por linha de item.                                                           |
|   062 |   I    | Layout em três colunas implementado.                                                                  |
|   063 |   I    | Técnica e área vêm dos dados disponíveis.                                                             |
|   064 |   I    | Paleta, dimensões, setup, mínimo e total integrados.                                                  |
|   065 |   I    | Upload existente e reuso de artes do kit integrados.                                                  |
|   066 |   I    | Frente/verso, zoom e tela cheia implementados.                                                        |
|   067 |   I    | `generate-mockup` integrado com loading, erro e resultado.                                            |
|   068 |   I    | Arte e mockup persistem no snapshot e seguem ao orçamento.                                            |
|   069 |   I    | Resumo e bloqueios por item implementados.                                                            |
|   070 |   V    | Upload/geração reais e aceite visual pendentes.                                                       |
|   071 |   I    | Sugestão resulta em composição referenciada por itens reais.                                          |
|   072 |   I    | Briefing amplo preservado.                                                                            |
|   073 |   I    | Candidatos vêm do catálogo carregado, não de IDs inventados.                                          |
|   074 |   I    | Até três alternativas respeitam orçamento e compatibilidade verificável.                              |
|   075 |   I    | Alternativas navegáveis exibem itens, imagem e total.                                                 |
|   076 |   I    | Aplicação troca a composição em uma única operação de estado.                                         |
|   077 |   P    | Erros e respostas tardias tratados; provedor real requer JWT/segredo.                                 |
|   078 |   P    | Sem preço inventado pelo modelo; telemetria/custo do provedor dependem do ambiente.                   |
|   079 |   I    | IA continua acessível pelas entradas previstas.                                                       |
|   080 |   V    | Aceite integrado com provedor e mockup reais pendente.                                                |
|   081 |   I    | Revisão reorganizada em dois painéis.                                                                 |
|   082 |   I    | Identidade e vínculo CRM/manual persistem.                                                            |
|   083 |   I    | Composição e totais incluem caixa, produtos, personalização e setup.                                  |
|   084 |   I    | Respostas fora de ordem e quantidade divergente não são aceitas.                                      |
|   085 |   P    | Estoque é reconfirmado; frete permanece estimativa explicitamente rotulada.                           |
|   086 |   I    | RPC transacional existente preservada e payload reconciliado.                                         |
|   087 |   I    | Idempotência de criação permanece integrada.                                                          |
|   088 |   P    | Falhas locais simuladas; concorrência live requer usuário de teste.                                   |
|   089 |   I    | Salvar, visualizar e sair preservam o estado necessário.                                              |
|   090 |   V    | Orçamento real ponta a ponta não foi criado nesta rodada.                                             |
|   091 |   I    | Regressões diagnósticas foram convertidas em testes verdes exigentes.                                 |
|   092 |   V    | Baselines visuais aprovadas pelo PO ainda não existem.                                                |
|   093 |   V    | Integração e concorrência reais requerem credenciais autorizadas.                                     |
|   094 |   P    | Sem violações introduzidas detectadas; matriz assistiva/manual pendente.                              |
|   095 |   P    | Build e bundle aprovados; métricas de navegação autenticada pendentes.                                |
|   096 |   I    | Documentação reconciliada com o estado pós-implementação.                                             |
|   097 |   P    | Branch isolada publicada no PR #1860; revisão/merge ainda pendentes.                                  |
|   098 |   P    | Gates centrais e preview manual passam; integração GitHub→Vercel falhou sem logs de build.            |
|   099 |   V    | Esta rodada ainda não foi mergeada/publicada.                                                         |
|   100 |   V    | Encerramento depende dos aceites visual e operacional acima.                                          |

Resumo da matriz: **66 etapas implementadas e validadas localmente, 20 implementadas com dependência externa/parcial e 14 aguardando validação/aceite externo**. O total de implementação é alto; o total de aceite PO continua separado por desenho.

## 6. Validações executadas

| Verificação                           | Resultado                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Regressão agregada do Kit Maker       | **PASS — 33 arquivos, 218 testes; 2 arquivos/16 testes ignorados conforme configuração**                                |
| Suíte global do repositório           | **PASS — 1.143 arquivos e 24.740 testes; 128 arquivos/1.138 testes ignorados conforme configuração**                    |
| Falhas F01–F03                        | **PASS — regressões corrigidas**                                                                                        |
| TypeScript                            | **PASS — `tsc --noEmit`** após compatibilizar TypeScript com Vite                                                       |
| ESLint dos arquivos alterados         | **PASS**                                                                                                                |
| Build de produção e guards do projeto | **PASS**                                                                                                                |
| Orçamento de bundle                   | **PASS — 10,62 MB de 13,06 MB; maior chunk 814,8 KB de 970,2 KB**                                                       |
| REST de tabelas canônicas             | **PASS — `custom_kits`, `kit_templates`, `product_variants`, `generated_mockups` responderam 200**                      |
| RPCs no OpenAPI canônico              | **PASS — save, quote e pin confirmadas**                                                                                |
| Templates ativos                      | **0 — fallback real de catálogo ativado, sem seed fictício**                                                            |
| Embalagens                            | **14 registros; `packaging_finish` sem valores preenchidos**                                                            |
| Variantes ativas com estoque          | **19.686 registros**                                                                                                    |
| Auditoria de dependências             | **2 altas transitivas de `pptxgenjs`/`image-size`; sem correção segura disponível e sem alcance no bundle de produção** |

## 7. Simulações críticas

- Linha genérica e linha de variante disputando o mesmo estoque: bloqueio correto.
- Estoque nulo, consulta falha e consulta em andamento: estados distintos e fail-closed.
- Estoque alterado entre revisão e clique final: nova consulta obrigatória antes da RPC.
- Resposta perdida no primeiro autosave: mesmo request e mesmo snapshot no retry.
- Duas respostas de preço fora de ordem: somente quantidade/versão atual é aceita.
- Setup não zero e cobrança mínima: total e payload mantêm os componentes comerciais.
- IA sem template ativo: composição determinística usa produtos/caixas reais carregados.
- IA acima do orçamento ou sem encaixe verificável: alternativa inválida não é aplicada.
- Geração de mockup: loading, falha e sucesso não confundem arte-fonte com resultado gerado.
- Cliente CRM versus preenchimento manual: ID canônico e snapshot descritivo permanecem separados.

## 8. Pendências objetivas para o encerramento 100/100

1. Obter sessão de teste autenticada e percorrer R01–R08 em desktop, tablet e mobile.
2. Registrar capturas comparativas e aceite visual do PO, preservando as cores atuais.
3. Exercitar upload, mockup, IA e orçamento com JWT real e dados descartáveis autorizados.
4. Testar RLS/concorrência com dois usuários e duas abas no banco canônico.
5. Restaurar acesso administrativo ao projeto canônico, comparar `pg_catalog` e regenerar `types.ts` com a salvaguarda de exports.
6. Decidir se o produto aceita frete estimado ou fornecer integração de CEP/transportadora.
7. Popular/curar templates de kit e atributos de acabamento caso façam parte do catálogo comercial.
8. Resolver os dois bloqueios externos do PR #1860, mergear e validar `/montar-kit` na versão efetivamente publicada.
9. Investigar, com autorização própria de schema, o finding live `public.zapp_catalog_stats()`; não mascará-lo em allowlist sem auditar definição e grants.

## 9. Comandos de reprodução

```bash
npx vitest run tests/audit/kit-maker-plan-review.test.tsx tests/lib/kit tests/lib/buildCustomKitInsert.test.ts tests/contracts/kit-maker tests/pages/kit-builder tests/components/kit-builder tests/components/kit-library tests/components/pages/KitBuilderPage.test.tsx tests/hooks/useKit tests/components/KitComposition.test.tsx tests/components/quotes/ClientPicker.crm.test.tsx tests/lib/kit-ai-composition.test.ts --retry=0
npm test -- --retry=0
npx tsc --noEmit
npm run lint:baseline:incremental
npm run build
npm run check:bundle-size
```

## 10. Conclusão

As falhas comprovadas foram corrigidas e as funcionalidades centrais antes ausentes ou parciais agora possuem implementação e testes. O que resta não é um novo lote amplo de código: são validações autenticadas, dados editoriais/canônicos, decisão sobre frete, aceite visual e publicação. Declarar `10/10` antes desses passos seria falso; declarar que o plano continua no estado anterior também seria falso. Este documento registra a fronteira exata entre ambos.
