# Inventário de proveniência — mocks, fallbacks e consumidores downstream

**Data:** 2026-08-26  
**Etapa do plano:** 56 — inventariar mocks/fallbacks no BI e badges  
**Natureza:** leitura somente; este documento não altera código, banco, migrations, workflows ou dados.

## Escopo e método

O inventário cobre caminhos executáveis de produção no worktree `codex/stabilization-100` relacionados a:

- BI por cliente, comparação setorial e Inteligência Comercial;
- badges comerciais, de inteligência e de confiança de fornecedor;
- telas, CTAs, notificações, IA, clipboard/WhatsApp e exportações que consomem esses valores.

Foram deliberadamente excluídos mocks exclusivos de testes, fixtures de E2E, harnesses visuais e stubs de unit test. Eles não chegam à UI produtiva por si mesmos.

Como mapa inicial, foi consultado o grafo existente do repositório (`graphify-out/graph.json`, 29.262 nós) com consultas sobre mocks, fallbacks, BI, badges, catálogo e consumidores. Cada conclusão abaixo foi então confirmada diretamente no código com `rg` e leitura dos módulos citados. O grafo ajuda a encontrar relações; o código é a evidência normativa deste inventário.

### Resumo executivo

A matriz contém **20 caminhos de proveniência**: 11 no BI e 9 em badges/inteligência de produto. Há **quatro problemas estruturais de alta prioridade**:

1. `isMock` é global e insuficiente: `useClientBI` e `useClientSeasonality` podem retornar `isMock: false` com campos determinísticos simulados no payload.
2. `useClientHealthScore` e `useChurnRisk` transformam dados possivelmente simulados em score, risco, próxima ação e script, mas não propagam proveniência.
3. Há consumidores com efeito externo ou persistente — notificação, Edge Function de IA, PDF/PPTX, clipboard/WhatsApp e abertura de orçamento — que não aplicam política de proveniência.
4. `useProductIntelligenceBadges` e `useSupplierTrust` podem renderizar badges comerciais/confiabilidade a partir de mocks sem expor essa condição ao componente visual.

Também há boas referências a reutilizar: `PriceFreshnessBadge` prefere o estado honesto `unknown`; `GoldSyncBadge` diferencia dado vazio, desatualizado e erro; `ConnectionRowSourceBadge` e `CredentialSourceBadge` expõem `DB`/`ENV`/`MISTO`/`PARCIAL`, em vez de inferir que o dado é real.

## Convenção de leitura da matriz

- **Real:** vindo de consulta/RPC ou campo do catálogo, ainda que possa haver heurística de apresentação.
- **Simulado:** mock determinístico, demo ou valor fabricado para preencher ausência de dado.
- **Curado:** recomendação estática humana/regra de negócio; não deve ser apresentada como observação histórica.
- **Estimado:** cálculo derivado de dados reais e/ou constantes, sem fonte primária própria.
- **Sem sinalização:** a tela ou consumidor não recebe informação suficiente para distinguir a origem.

Uma ausência de dados reais não prova que a funcionalidade seja inválida. O risco surge quando a UI, uma automação ou uma comunicação trata o fallback como fato observado.

## A. BI por cliente — fontes e estados mistos

| ID | Campo/origem | Condição e proveniência efetiva | Tela(s) e consumidor(es) downstream | Sinalização atual | Risco | Decisão necessária |
|---|---|---|---|---|---|---|
| BI-01 | `DEMO_CLIENT_ID` e `DEMO_COMPANY` em `src/lib/bi/demoClient.ts` | Cliente explícito `demo-client-bi-preview`; usa dados simulados nas zonas de BI. | `BusinessIntelligencePage`; `useCrmCompany`; componentes de BI. `ConfirmQuoteSuggestionsModal` bloqueia abertura real de orçamento para esse ID. | Banner “Modo Demonstração”. | Baixo; contenção explícita já existe. | Preservar como caso aceito e cobrir contra regressão. |
| BI-02 | `MOCK_CLIENT_STATS` em `src/lib/bi/mockData.ts` via `useClientBI` | Sem histórico de pedidos: LTV, ticket, contagem, datas, pedidos, categorias e deltas são simulados. | `ClientOverview360`, `EnrichedOrdersTimeline`, Health Score, churn, briefing, resumo e exportações. | `ClientOverview360` mostra “Dados simulados”; os consumidores derivados não recebem a flag. | **Alto:** score, risco e próxima ação podem parecer históricos. | Definir contrato por campo e política de bloqueio/aviso para derivados. |
| BI-03 | `useClientBI.topCategories`, `recentOrders[].itemsCount` e `productPreview` | Mesmo quando há pedidos reais e `isMock: false`, `topCategories` vem sempre de `MOCK_CLIENT_STATS`; `itemsCount` é fixado em `1` e o preview pode cair em `"Pedido"`. | `useClientsComparison`, `ClientHealthHero`, `ChurnRiskBanner`, briefing, resumo, PDF/PPTX. | Sem sinalização de mistura quando `isMock: false`. | **Alto:** falsa proveniência parcial; categoria favorita e argumentos comerciais podem nascer de dados fabricados. | Separar `real/simulated/estimated/unavailable` por campo; não usar categoria simulada em CTA/WhatsApp. |
| BI-04 | `useClientAffinity` + `MOCK_CLIENT_STATS` e `MOCK_SUGGESTIONS` | RPC `get_client_top_products` vazia/erro produz categorias e produtos sugestivos simulados, sem `productId`. | `ClientAffinityProducts`, `ClientHealthHero`, `BIBriefingMode`, `ExecutiveSummaryButton`, `BIAiCopilot`, modal de orçamento. | `ClientAffinityProducts` mostra “Simulado”. | **Alto:** o modal exibe preço/estimativa e pode abrir o Quote Builder para cliente real; não inventa IDs, mas apresenta recomendação como “IA do BI”. | Escolher entre bloquear CTA, exigir confirmação explícita ou permitir somente “curadoria simulada”. |
| BI-05 | `useClientCategoryAffinity.buildMockResult()` | Falha/ausência de `get_client_top_products` gera shares, tendência e categoria favorita determinísticos. | `ClientCategoryRadar`, `ClientHealthHero`, `ChurnRiskBanner`, `BIBriefingMode`, `useClientsComparison`. | Radar marca “Simulado” se o hook o reporta. Outros consumidores não recebem origem por campo. | **Alto:** “favorita”, tendência e GAP alimentam roteiro, CTA e comparação. | Propagar a origem para cada agregado e suprimir ação comercial automática quando não for real. |
| BI-06 | `useIndustryTrends` + `getMockIndustryTrends()` | CRM/RPC sem empresas/linhas ou com erro: top produtos, volumes, ticket e direção de tendência são simulados. No caminho real, `trend` é sempre `stable` por não existir série temporal para calculá-la. | `IndustryTrendingProducts`, `ClientHealthHero`, briefing, resumo, Copilot, PPTX/PDF, modal de orçamento. | `IndustryTrendingProducts` exibe “Simulado” no fallback; no caminho real a direção é uma aproximação não rotulada. | **Alto:** tendência/volume setorial pode influenciar projeção, recomendação e orçamento. | Diferenciar campo observado de classificação heurística; bloquear/rotular recomendações setoriais simuladas fora do demo. |
| BI-07 | `useIndustryCategoryTrends.buildMockResult()` | Sem amostra/RPC, agrega categorias a partir de tendências mockadas. | `ClientCategoryRadar`, `ClientHealthHero`, `BIBriefingMode`, `ClientLookalikes`, comparador. | Radar agrega `isMock`; briefing/lookalikes não o usam para governar efeitos. | **Alto:** produz GAP e “oportunidade no setor” que podem abrir orçamento. | Definir se GAP simulado pode ser somente leitura; não permitir CTA comercial sem sinalização. |
| BI-08 | `useClientSeasonality` — fallback integral | Cliente com menos de três meses cobertos: `client` e `industry`, picos, dias até pico e insight vêm de `getMockSeasonality()`. | `ClientSeasonalityHeatmap`, `useClientHealthScore`, `useSeasonalPeakNotifications`, Health Hero, resumo, Copilot, PDF/PPTX. | Heatmap mostra “Simulado”; `BusinessIntelligencePage` chama a notificação sem receber `isMock`. | **Crítico:** pode inserir notificação persistente afirmando histórico inexistente e disparar CTA urgente. | Bloquear notificação e decisões de janela quando qualquer entrada sazonal for simulada. |
| BI-09 | `useClientSeasonality` — estado misto | Cliente possui meses suficientes, mas setor está vazio: `industry` usa `getMockSeasonality().industry`, enquanto retorno declara `isMock: false`. | Heatmap, comparação visual, insights e todo consumidor que confia no booleano global. | “Dados reais” pode ser exibido apesar de setor simulado. | **Crítico:** falso negativo de proveniência. | Contrato campo a campo (cliente e setor independentes), com badge “setor estimado/simulado”. |
| BI-10 | `useClientVsIndustry` + constantes de `useClientHealthScore` | Benchmark insuficiente retorna métricas vazias; Health Score usa bases `10`, `2500` e potencial anual derivado/`30000` para compor score, share e próxima ação. | `ClientHealthHero`, `BIBriefingMode`, `ExecutiveSummaryButton`, `BIAiCopilot`, comparador. | `useClientVsIndustry.isMock` não é exposto pelo Health Score. | **Alto:** score e recomendação passam por estimativas silenciosas, não por benchmark observado. | Decidir se score vira `unknown/parcial` sem benchmark, ou se pode exibir “estimado” sem CTA persistente. |
| BI-11 | `INDUSTRY_RECOMMENDATIONS`, `FALLBACK` e `categoryResolver` | Curadoria estática por ramo; fallback “Geral”; agrupamento por regex ou “Outros”. Não é evento de mercado. | `EmpiricalRecommendations`, `BIProductCard`, dossiê; categorias de radar/afinidade/tendência. | A tela escreve “Curadoria”; `BIProductCard` pode abrir orçamento mesmo sem `productId`. | Médio: origem é razoavelmente clara, mas preço/produto não é validado contra catálogo no CTA. | Manter como curadoria explicitamente aprovada; decidir se cards sem ID podem abrir orçamento ou devem buscar/validar catálogo antes. |

### Dependências de efeito do BI

| Efeito | Entrada atual | Evidência | Risco de proveniência | Aceite esperado antes de ativar/expandir |
|---|---|---|---|---|
| Notificação persistente | `daysToNextPeak`/`nextPeakMonth` | `useSeasonalPeakNotifications` insere em `workspace_notifications`; `BusinessIntelligencePage` chama o hook sem `isMock`. | Pode afirmar “historicamente concentra compras” usando sazonalidade simulada. | Não inserir quando fonte não for inteiramente real e fresca; registrar origem se houver exceção aprovada. |
| Health Score e churn | BI, benchmark, sazonalidade e constantes | `useClientHealthScore`, `useChurnRisk`, `ClientHealthHero`, `ChurnRiskBanner`. | Score, risco e WhatsApp podem ser gerados com mistura silenciosa. | Resultado deve carregar proveniência/qualidade; banners de ação exigem dados decisórios reais. |
| IA “grounded” | Objeto `context` sem flags de origem | `BIAiCopilot` chama `invokeEdge('bi-copilot', { context })`. | A Edge Function não recebe `isMock` nem limita a linguagem da resposta. | Propagar proveniência ao contrato da Edge Function e desabilitar/rotular respostas baseadas em simulação. |
| Clipboard, WhatsApp e briefing | Score, categorias, sazonalidade e sugestões | `ExecutiveSummaryButton`, `BIBriefingMode`, `ChurnRiskBanner`. | Texto pronto para comunicação externa pode converter suposição em alegação factual. | Aviso estrutural e cópia não factual, ou bloqueio, se qualquer campo decisório for simulado/estimado. |
| PDF/PPTX | Agregados dos hooks de BI | `useBIDossierExport`, `dossierPdfGenerator`, `ExecutiveSummaryButton`, `pptxGenerator`. | Alguns trechos do PDF/PPTX anotam simulação, mas o documento/score agregado não é bloqueado nem possui proveniência completa. | Metadado de origem por seção e bloqueio/rodapé obrigatório para exportação mista. |
| CTA de orçamento | Afinidade/tendência/curadoria | `ClientHealthHero` → `ConfirmQuoteSuggestionsModal`; `BIProductCard`. | Para cliente real com fallback, há sugestões e estimativas; IDs nulos evitam pré-preenchimento falso, mas a ação comercial continua acessível. | Política explícita: bloquear, pedir confirmação ou permitir somente recomendações com produto resolvido e origem exibida. |

## B. Badges, confiança e inteligência de produto

| ID | Campo/origem | Condição e proveniência efetiva | Tela(s) e consumidor(es) | Sinalização atual | Risco | Decisão necessária |
|---|---|---|---|---|---|---|
| BDG-01 | `useProductIntelligenceBadges` → `generateMockIntelligence` e `generateMockVelocities` | Se `mv_product_intelligence` estiver nula ou `mv_stock_velocity` vazia, o hook gera flags e velocidades simuladas sem distinguir loading, vazio e erro. | `ProductCard` (Hot Item/Best-seller) e PDP (`ProductDetailHero`). | O hook não devolve `isMock`; ambos os chamadores não passam `isDemo` ao componente visual. | **Crítico:** badges “Hot Item”, “Best-seller”, “Emergente”, “Classe A” e ruptura podem parecer dados de mercado reais. | Introduzir proveniência no retorno e não renderizar badge comercial derivada de mock fora de modo demo explicitamente sinalizado. |
| BDG-02 | `useIntelligenceBadgeSettingsValue` → `DEFAULT_INTELLIGENCE_BADGE_SETTINGS` | Enquanto cache está vazio ou a leitura de `admin_settings` falha/é bloqueada por RLS, adota thresholds padrão (`Hot Item` e `Best-seller` ligados). É fallback de configuração, não de dado comercial. | Todos os cards que usam `useProductIntelligenceBadges`. | Sem indicação de config default/falha. | Médio: pode divergir da decisão de administração e amplificar BDG-01. | Decidir se não-admin pode usar config pública/versionada; caso contrário, manter badges suspensas até resolver a configuração. |
| BDG-03 | `useSupplierTrust` → `getMockSupplierTrust` | Sem variante/fonte/fornecedor ou em erro, retorna verificação, prazo e rating determinísticos pelo ID. Mesmo no caminho parcialmente real, `avgRating` continua mockado (“real-ish”). | PDP → `DynamicTrustBadges`: “Fornecedor verificado”, “Entrega rápida”, “Alta qualidade”. | `SupplierTrustData` não tem origem; tooltip promete “histórico de qualidade comprovada” e “avaliações de compradores”. | **Crítico:** confiança de fornecedor e avaliação podem ser fabricadas e comunicadas como comprovadas. | Separar lead time real, status do fornecedor e rating indisponível; não renderizar qualidade/avaliação sem fonte real aprovada. |
| BDG-04 | `ProductRiskDetail` | Sem dados e sem erro, usa `generateMockVelocity`/`generateMockIntelligence`. Se há erro sem dados, mostra erro, não mock. | Painel de risco de fornecedor/inventário. | Badge `demo` visível; em erro mostra estado de falha. | Baixo a médio: a origem está exposta, mas decisões operacionais ainda podem ser tomadas se o usuário ignorar o label. | Preservar padrão; aplicar a mesma semântica a todos os consumidores de inteligência. |
| BDG-05 | `useStockChartData` / `StockHistoryChart` | Sem histórico e sem erro, usa mocks de estoque, velocidade, inteligência e fornecedor. | Gráfico da página de produto. | “dados ilustrativos” no título e “(demo)” em insight de preço. | Baixo a médio: sinalização boa, mas ainda é uma referência para CTA de cotação. | Preservar; definir se CTAs operacionais devem ficar inativos durante demo. |
| BDG-06 | `MarketIntelligenceChart.generateMockMarketData` | Sem dado macro e sem erro, gera série aleatória/fornecedores mock. | `CommercialIntelligencePage`; pode mostrar demanda e “Mercado Aquecido”. | Badge “dados ilustrativos” e sufixo “(demo)”. | Médio: boa transparência local, porém os sinais podem influenciar leitura de mercado. | Manter como demo visual; não reutilizar KPIs simulados em IA/exportação sem mesma proveniência. |
| BDG-07 | `TrendsPage` e cards de tendência | Mocks de produtos, buscas, funil, insights e calor só quando `?demo=1`; default é real. | `/tendencias` e cards auxiliares. | Badge de demo no cabeçalho da página. | Baixo: ativação explícita e comportamento padrão seguro. | Preservar gate e seu teste contratual; evitar que novos cards ignorem `isDemoMode()`. |
| BDG-08 | `ProductMatchPage` | `MOCK_MATCH_PRODUCTS` somente se catálogo vazio **e** `import.meta.env.DEV`; build produtivo recebe lista vazia. | `/match`. | Não há badge, mas não há caminho de produção normal para o mock. | Baixo: isolamento por ambiente; não é dado operacional em produção. | Preservar gate e teste contratual. |
| BDG-09 | Gestão de badges: `product_badge_definitions` | `source_kind` e `data_source` são metadados editáveis no CRUD administrativo. A busca estática encontrou usos somente no módulo de gestão, não no renderer de `IntelligenceBadges`/`DynamicTrustBadges`. | Admin `/admin/...badges...`; não há ligação de execução comprovada com ProductCard/PDP. | A tela mostra “Origem”, mas ela não governa os badges comerciais atuais. | Médio: duas fontes de verdade — catálogo administrativo versus regras hard-coded; não concluir que a tabela está ausente ou obsoleta sem auditoria de dados/callers. | PO deve decidir se o cadastro é catálogo documental, futura SSOT ou pipeline a integrar; não apagar nem alterar a tabela sem autorização. |

## Cobertura de telas e consumidores observados

| Área | Proveniência hoje | Estado |
|---|---|---|
| `BusinessIntelligencePage` / demo explícito | `DEMO_CLIENT_ID`, banner e bloqueio específico de orçamento. | Transparente para o caso demo, mas não para fallback de cliente real. |
| `ClientOverview360`, `ClientAffinityProducts`, `IndustryTrendingProducts`, `ClientCategoryRadar`, `ClientSeasonalityHeatmap` | Recebem `isMock` de alguns hooks. | Parcialmente transparente; falha nos estados mistos e não se propaga aos consumidores. |
| `ClientHealthHero` e `ChurnRiskBanner` | Agregam BI, benchmark, sazonalidade e categorias. | Sem modelo de proveniência; alimentam CTA e WhatsApp. |
| `BIBriefingMode`, `ExecutiveSummaryButton`, `useBIDossierExport`, `BIAiCopilot` | Consomem múltiplas fontes, inclusive mock/estimativa/curadoria. | Sem bloqueio ou envelope de origem de ponta a ponta. |
| `ProductCard` e `ProductDetailHero` | `useProductIntelligenceBadges` e `useSupplierTrust`. | Badges podem surgir de mocks sem rótulo. |
| `StockHistoryChart`, `ProductRiskDetail`, `MarketIntelligenceChart` | Mocks somente no vazio sem erro. | Rótulos de demo/ilustrativo presentes; são os padrões visuais mais próximos do alvo. |
| `GoldSyncBadge`, `PriceFreshnessBadge`, badges de credenciais | Usam estado explícito (`empty`, `stale`, `error`, `unknown`, `DB`/`ENV`/`MISTO`). | Referências corretas de UI para a futura convenção de proveniência. |

## Contrato alvo para a etapa 57 — depende de autorização de design/PO

Este inventário **não implementa** a etapa 57. A decisão requerida é de produto e design, pois muda a semântica e potencialmente a UI dos fluxos comerciais.

O contrato mínimo recomendado por campo decisório é:

```ts
type ProvenanceKind = 'real' | 'simulated' | 'estimated' | 'curated' | 'unavailable';

interface FieldProvenance {
  kind: ProvenanceKind;
  source: string;       // RPC, tabela, regra, demo ou fallback identificado
  observedAt?: string;  // timestamp/freshness quando existir
  reason?: string;      // ausência de amostra, erro, configuração etc.
}
```

Campos decisórios não devem depender de um único `isMock` global. No mínimo, devem carregar origem independente para:

- histórico do cliente, categorias, pedidos, benchmark e sazonalidade;
- tendência/volume setorial e categoria GAP;
- score/risk/next action/script, que devem agregar as proveniências de suas entradas;
- produto sugerido, preço estimado, `productId` e recomendação curada;
- badge de inteligência, velocidade/ABC/ruptura e cada atributo de confiança de fornecedor.

### Política que exige escolha do PO

| Situação | Opção conservadora recomendada | Escolha de produto necessária |
|---|---|---|
| Qualquer insumo decisório simulado | Exibir somente leitura com marca estrutural de proveniência. | Quais usos podem continuar com confirmação explícita? |
| Notificação, WhatsApp, e-mail/clipboard e IA | Bloquear por padrão; não afirmar “histórico” ou “mercado” simulado. | Se houver exceção, qual texto, auditoria e consentimento são necessários? |
| PDF/PPTX/briefing | Rodapé/por-seção obrigatório e bloqueio de exportação inteiramente simulada. | O documento pode ser exportado com mistura? Para qual público? |
| CTA de orçamento | Exigir produto real resolvido e origem visível; demo não abre fluxo real. | Curadoria estática pode abrir orçamento ou só sugerir busca no catálogo? |
| Badges comerciais | Não renderizar Hot Item/Best-seller/qualidade/ruptura de mock em produção. | Há algum modo de preview interno autorizado? |
| Dados parciais | Mostrar origem por campo, não “Dados reais” global. | Qual rótulo visual e qual limiar de aceitabilidade/freshness? |

## Backlog de aceite derivado (sem alteração nesta etapa)

1. Criar teste de caracterização para BI-03: dados reais de pedidos + `topCategories` mock não podem produzir estado `real` integral.
2. Criar teste para BI-09: setor mock com cliente real deve expor proveniência mista.
3. Testar que `useSeasonalPeakNotifications` não persiste em `workspace_notifications` quando a sazonalidade não for real e suficiente.
4. Versionar o envelope de contexto de `bi-copilot` com proveniência; testar que a Edge Function não receba fatos simulados como observados.
5. Cobrir clipboard/briefing/WhatsApp/PDF/PPTX para que dados simulados sejam bloqueados ou identificados conforme decisão aprovada.
6. Cobrir `ClientHealthHero` e `ConfirmQuoteSuggestionsModal` para impedir CTA comercial baseada exclusivamente em fallback de cliente real, conforme política aprovada.
7. Fazer `useProductIntelligenceBadges` devolver origem por badge e testar que ProductCard/PDP não publiquem badge mock como dado comercial real.
8. Separar `SupplierTrustData` por atributo e testar que rating mock nunca ativa o tooltip de “avaliações de compradores”.
9. Definir uma única SSOT entre `product_badge_definitions` e regras hard-coded; a decisão deve preceder qualquer limpeza, migration ou remoção.
10. Reutilizar os padrões `unknown`/`stale`/`DB-ENV-MISTO` já existentes, com baseline visual aprovado antes de qualquer alteração de layout.

## Evidências e comandos somente leitura executados

```bash
# Grafo existente: descoberta dos centros de dependência.
graphify query "Map mocks, fallbacks, BI dashboards, badge indicators, product catalog consumers, and downstream data provenance in this repository" --budget 2200
graphify query "Which BI, analytics, dashboard, chart, metric, and admin panels use mock data, fallback values, simulated data, or default statuses? Trace their downstream UI consumers." --budget 3600
graphify query "Which status badges, data source indicators, freshness indicators, and connection panels have unknown, fallback, mock, or default state semantics?" --budget 3600

# Confirmação no código — fontes e consumidores BI.
rg -n "MOCK_CLIENT_STATS|getMockIndustryTrends|getMockSeasonality|DEMO_CLIENT_ID|isDemoClient" src/hooks/bi src/components/bi src/lib/bi --glob '!**/*.test.*'
rg -n "useSeasonalPeakNotifications|invokeEdge\\('bi-copilot'|generateBIDossierPDF|generateBIPptx|workspace_notifications" src --glob '!**/*.test.*'

# Confirmação no código — badges e origem.
rg -n "generateMockVelocities|generateMockIntelligence|getMockSupplierTrust|isDemoMode|generateMockMarketData" src --glob '!**/*.test.*'
rg -n "product_badge_definitions" src --glob '!**/*.test.*'
```

Arquivos de evidência principal:

- `src/lib/bi/mockData.ts`, `src/lib/bi/demoClient.ts`, `src/lib/bi/industryRecommendations.ts`, `src/lib/bi/categoryResolver.ts`;
- `src/hooks/bi/useClientBI.ts`, `useClientAffinity.ts`, `useClientCategoryAffinity.ts`, `useIndustryTrends.ts`, `useIndustryCategoryTrends.ts`, `useClientSeasonality.ts`, `useClientVsIndustry.ts`, `useClientHealthScore.ts`, `useChurnRisk.ts`, `useSeasonalPeakNotifications.ts`, `useBIDossierExport.ts`;
- `src/components/bi/ClientHealthHero.tsx`, `BIAiCopilot.tsx`, `BIBriefingMode.tsx`, `ExecutiveSummaryButton.tsx`, `ConfirmQuoteSuggestionsModal.tsx`, `ClientCategoryRadar.tsx`;
- `src/hooks/products/useProductIntelligenceBadges.ts`, `src/hooks/products/useSupplierTrust.ts`, `src/components/common/IntelligenceBadges.tsx`, `src/components/common/SocialProof.tsx`, `src/components/products/StockHistoryChart.tsx`, `src/components/inventory/risk/ProductRiskDetail.tsx`, `src/components/intelligence/MarketIntelligenceChart.tsx`;
- `src/components/admin/badges-manager/types.ts`, `src/components/admin/badges-manager/useBadgesManager.ts`, `src/components/admin/connections/ConnectionRowSourceBadge.tsx`, `src/components/products/PriceFreshnessBadge.tsx`, `src/components/intelligence/GoldSyncBadge.tsx`.

## Limites desta fotografia

- O inventário prova o comportamento do código no worktree, não a quantidade de registros reais em produção.
- Nenhuma tabela, policy, função, trigger, migration, RLS ou dado foi consultado de forma mutante ou alterado.
- A ausência de uma referência estática de renderer para `product_badge_definitions` não prova que a tabela seja lixo; ela pode atender a admin, relatórios, automações futuras ou clientes externos. Qualquer remoção permanece bloqueada por validação explícita do PO e auditoria de callers/DB.
