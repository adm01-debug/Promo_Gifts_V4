# Magazine — execução parcial do plano de 50 etapas

Data: 09/09/2026. Branch: `codex/magazine-integrity-20260909`.
Base: `55e598d3e30b49adc218e43c67dfbe64136deae8`.
Worktree: `/tmp/promo-magazine-implementation-20260909-IlRhfk`.

## Veredito

**Primeira rodada implementada e testada; o plano de 50 etapas NÃO está concluído.** Seis etapas têm seu núcleo de código implementado/testado; o checklist de homologação integral continua aberto. Não há base para declarar 10/10, fidelidade às cinco imagens ou produção atualizada.

A instrução explícita do PO autorizou executar o código do plano. Não foi interpretada como autorização genérica para objetos de banco ainda não especificados. O Supabase canônico não sofreu alterações.

## Evidências executadas

- Instalação isolada pelo lockfile: `npm ci --ignore-scripts --no-audit --no-fund`. Scripts de instalação não foram executados; gates de código foram chamados separadamente. Manifesto/lockfile não alterados.
- Antes da correção: três contratos novos do hook falharam — snapshot completo, retorno nulo e publicação antes do debounce. Os 16 contratos anteriores dessa suite passaram.
- Após correção: **764 testes aprovados, 3 ignorados anteriores, 0 falhas**, em 41 arquivos coletados, sem retries. A lista dos skips continua aberta; não representa certificado de triggers.
- TypeScript `npm run qa:typecheck`: passou. ESLint dos arquivos alterados e novos: verificação local sem erros após correções; não equivale a todos os gates do GitHub.
- Browser: 13 cenários de auditoria e 10 de controles concluídos sem erros de harness na rodada corrigida; contêm tanto confirmações quanto lacunas conhecidas, não 23 PASS de funcionalidades.
- **6 contratos assertivos no Chromium correspondente ao Playwright instalado passaram**, sem erros de página: galeria fria A4, criação com template, CTA público/menu, Fit completo, Ctrl+S e ausência de falso salvo.
- Larguras 390, 820, 1433 e 1672 px: nenhum overflow horizontal nas telas Identidade/Produtos do harness.
- Gate SSOT `node scripts/validate-supabase-config.mjs`: passou. Diff vazio em estilos/tokens globais, paleta do Magazine, `client.ts`, tipo Product, manifesto e lockfile.
- Consulta de saúde do MCP `supabase_producao`: **Management API 403 — conta sem privilégios**. Nenhuma consulta de schema live foi certificada; não usar outro banco como substituto.

Ambiente de browser: componentes reais, shell mínimo, CRM/autenticação/catálogo/persistência simulados, requisições externas bloqueadas e service workers desabilitados. O client canônico pode emitir aviso de configuração ausente ao carregar módulos; a rede externa permanece bloqueada e os métodos de persistência são substituídos. Isso não é integração real com Supabase. Não foram usados secrets nem dados de clientes reais.

## Mudanças principais e limites

1. Autosave passou a enviar somente campos alterados; o serviço não faz DELETE/INSERT de itens ao receber snapshots legados. Os IDs permanecem estáveis. O contrato de `update` é de metadados; itens usam operações próprias.
2. Fila de gravação por sessão, preservação de edição mais nova, retorno reconciliado, dirty/error e retry. **Não é lock transacional entre usuários.**
3. Rascunho/Ctrl+S/publicação/impressão aguardam gravação; links principais do editor também. Fechar abruptamente/offline continua exigindo recuperação mais completa; flush no unmount é best effort.
4. Renderer alinhado, CSS/escopo compartilhados e Fit em largura e altura. Não foram instaladas novas fontes nem substituídos assets editoriais.
5. Criação na galeria mantém template; cards da grade ganharam ações/metadados; links públicos usam a rota existente; busca inclui subtítulo.
6. CRM grava identidade e não pesquisa CNPJ com string vazia; hex acompanha presets; seleção de produtos sobrevive a filtros e erros; estimativa conta páginas reais; imagem escolhida no resumo acompanha a variante.
7. Erros de leitura não viram listas vazias silenciosamente; impressão trata falha de carga. Reordenação/limpeza continuam sem transação multirregistro no servidor.

## Acompanhamento individual

“Implementado/testado” significa verificação local do núcleo da correção, **não homologação em produção**. “Parcial” nunca deve ser convertido automaticamente em checkbox concluído.

| Etapa | Situação | Evidência ou trabalho restante |
|---|---|---|
| 001 | Parcial | SHA local/remoto igual; PRs abertos pesquisados por Magazine: nenhum. Baseline arquivado; capturas antigas ainda em /tmp. |
| 002 | Validado local | npm ci isolado: Vitest 4.1.11; Chromium 1217 instalado. Sem mudança de lockfile. |
| 003 | Parcial | Contratos de perda/IDs preservados no teste de integração e novas falhas de autosave reproduzidas antes da correção. |
| 004 | Bloqueado PO | Decisão sobre páginas estruturadas versus editor livre e ativos fotográficos ainda pendente; demais ambiguidades permanecem no plano. |
| 005 | Bloqueado acesso | MCP supabase_producao health retornou Management API 403; nenhum pg_catalog live certificado. |
| 006 | Implementado/testado | Patches só de campos editados; serviço update não apaga/reinsere itens de snapshots legados. |
| 007 | Implementado/testado | IDs preservados no autosave; retorno e updatedAt reconciliados; testes reais do serviço com DB em memória. |
| 008 | Parcial | Fila por sessão e proteção contra resposta antiga. Não há CAS/lock entre abas ou usuários. |
| 009 | Implementado/testado | Dirty/saving/error; null não confirma sucesso; retry, rascunho e Ctrl+S ligados ao flush. |
| 010 | Parcial | Flush em publicação, impressão e links internos principais; beforeunload avisa. Saída abrupta/offline e toda navegação do shell ainda não têm recuperação garantida. |
| 011 | Pendente | Atomicidade de operações multirregistro requer definição/validação de RPC; nenhuma migration preparada ou aplicada nesta rodada. |
| 012 | Parcial | Mutações serializadas; limpar aguarda e para no erro. Exclusão/reordenação em lote ainda não é transação no servidor. |
| 013 | Parcial | Erros de listagem/itens não viram vazio; editor/print tratam rejeição; respostas antigas da lista descartadas. Permissões live não certificadas. |
| 014 | Parcial | Publicar aguarda campos pendentes; falta ciclo público real autorizado e validação de revogação. |
| 015 | Parcial | Contratos locais e concorrência da sessão passaram; gate de integridade de todas as operações/banco real não encerrado. |
| 016 | Implementado/testado | Origem da transformação corrigida; bounding boxes reais do navegador alinhadas. |
| 017 | Implementado/testado | Renderer carrega CSS; galeria usa renderer/escopo compartilhado; acesso frio com 1920×2716 confirmado. |
| 018 | Parcial | Amostras Aa aplicam fontFamily; famílias não instaladas e divergências do registry ainda não resolvidas. |
| 019 | Parcial | Fit considera altura/largura; controles e quatro larguras exercitados. Homologação completa de foco/tela cheia/múltiplos painéis pendente. |
| 020 | Parcial | Flush antes de abrir impressão e erro de leitura tratado; prontidão de assets/fontes e PDF final pendentes. |
| 021 | Pendente | Registry e compatibilidade das revistas existentes não foram alterados; decisões de produto necessárias. |
| 022 | Bloqueado PO/ativos | Fotografias originais não fornecidas; alternativa com assets existentes foi perguntada, ainda sem resposta. |
| 023 | Pendente | Composição editorial dos oito templates não refeita; os doze existentes foram preservados. |
| 024 | Parcial | Correção de amostras tipográficas; demais elementos do modal aguardam composição/assets e aceite. |
| 025 | Parcial | Usar template cria com a escolha; proteção de reentrada e erro; testes atualizados. Ordenação recente e favoritos por conta pendentes. |
| 026 | Parcial | Estados de loading/erro e KPI/lista separados; totais globais e homologação no shell completo pendentes. |
| 027 | Parcial | Grade ganhou badge sobre capa, empresa/ícone, produtos/template, menu inferior visível e CTA por status. Modo lista e igualdade visual integral pendentes. |
| 028 | Parcial | Busca inclui subtítulo; paginação/escopo global e política de normalização ainda pendentes. |
| 029 | Pendente | Suíte existente de lifecycle reexecutada; duplicação/undo/arquivamento ainda precisam da rodada transacional própria. |
| 030 | Parcial | Links inconsistentes /m substituídos por /revista-publica; CTA validado com token sintético. Token revogado e serving real não validados. |
| 031 | Parcial | Busca textual não casa com CNPJ vazio. Limite de 200 clientes e paginação/busca no servidor ainda pendentes. |
| 032 | Parcial | Seleção/limpeza usam clientCrmId e Identity propaga o vínculo. Escopo do cache por conta e cenários de overrides manuais pendentes. |
| 033 | Pendente | Contadores e limites soft existentes foram preservados; política de textos legados e novos contratos não homologada. |
| 034 | Implementado/testado | Hex sincroniza com mudanças externas/presets; blur não restaura cor antiga. Cores globais intactas. |
| 035 | Parcial | Header passa a mostrar erro real e usar ações aguardáveis; shell completo/stepper ainda não homologado. |
| 036 | Pendente | Catálogo continua com lote 80, categorias locais e ordenação relevância ainda sem ranking real. |
| 037 | Parcial | Map de seleção independe do filtro; erro preserva seleção e adição é aguardada/deduplicada. Modalidade de seleção e paginação completa pendentes. |
| 038 | Pendente | Favoritos de produtos não implementados; nenhuma tabela de favoritos criada. |
| 039 | Parcial | Resumo usa imagem da variante via helper existente; preço/sale_price preservados. Interação completa de swatches/variantes pendente. |
| 040 | Parcial | Estimativa usa paginateMagazine inclusive capa/contracapa; resumo não declara sucesso global falso; clear aguarda. Gestão editorial e atomicidade pendentes. |
| 041 | Bloqueado PO | Modelo editorial ainda não decidido; nenhum type de página ou esquema novo inventado. |
| 042 | Bloqueado dependência | Depende de 041 e inventário 005; nenhum DDL ou grant preparado/aplicado. |
| 043 | Pendente | Nova página, duplicação e menus editoriais não implementados. |
| 044 | Pendente | Reordenação de páginas e compatibilidade pageOrder ainda não implementadas. |
| 045 | Pendente | Conteúdo editorial/páginas institucionais ainda não integrado aos três destinos. |
| 046 | Parcial | 764 testes passaram; 3 skips anteriores persistem. Novos contratos duráveis e 6 verificações browser; suite visual com IDs antigos ainda requer revisão. |
| 047 | Bloqueado ambiente | Harness isolado não substitui E2E autenticado com backend real de teste. |
| 048 | Parcial | Quatro larguras sem overflow; cores/guardas sem diff. Sem comparação pixel a pixel com shell completo nem aceite PO. |
| 049 | Bloqueado acesso/autorização | 403 do MCP; nenhuma migration/deploy no canônico; autorização individual dos objetos continua necessária. |
| 050 | Pendente | Mudanças locais isoladas; sem merge, push ou publicação nesta rodada; homologação integral não encerrada. |

## Próxima sequência segura

1. Concluir persistência: recuperação ao sair/offline, detecção de conflitos multiusuário e desenho transacional de operações de itens. Propor objetos apenas após conferir contratos reais; não aplicar migration agora.
2. Resolver paginação/contagens do catálogo e CRM, favoritos, variantes e paridade grade/lista, preservando o que esta rodada entregou.
3. Decidir páginas estruturadas versus editor livre e ativos fotográficos; depois implementar modelo/editorial/versionamento sem alterar revistas existentes silenciosamente.
4. Reconciliar fontes/registry, testes visuais com IDs obsoletos e capturar as cinco telas no shell completo; não aceitar baselines automaticamente.
5. Restabelecer acesso autorizado ao projeto canônico, validar ambiente de teste, submeter cada alteração de banco e somente depois homologar/integrar/publicar.

## Reprodução e artefatos

[Plano](MAGAZINE_CORRECOES_E_MELHORIAS_50_ETAPAS_2026-09-09.md) · [auditoria-base histórica](../audits/MAGAZINE_REFERENCIAS_BASELINE_2026-09-09.md) · [contratos browser](../evidence/magazine-20260909/browser-contracts.json) · [controles browser](../evidence/magazine-20260909/browser-controls.json).

Harness reproduzível: [instruções](../../tests/magazine/browser/README.md). Contratos de serviço: `tests/integration/magazine-service-fuzz.test.ts`; fila: `src/pages/magazine/__tests__/editorPersistence.test.ts`; controles: `src/pages/magazine/components/__tests__/MagazineControls.regression.test.tsx`.

```bash
npm run test -- --retry=0 src/pages/magazine tests/magazine src/services/__tests__/magazine tests/integration/magazine-service-fuzz.test.ts src/lib/security/__tests__/magazine-guard.test.ts
npm run qa:typecheck
node scripts/validate-supabase-config.mjs
```

Resultados completos temporários: `/tmp/promo-magazine-validation-20260909-DKFGKd/unit-results.json`, `scenario-results.json` e screenshots no mesmo diretório. As capturas ainda usam fotografias placeholder; não comprovam fidelidade às referências. O teste E2E de criação foi atualizado com interceptação de escrita sintética; a suite E2E autenticada completa não foi executada.
