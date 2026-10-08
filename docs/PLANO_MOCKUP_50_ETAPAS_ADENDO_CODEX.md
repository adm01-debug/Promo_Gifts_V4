# Adendo ao Plano Mockup — análise do documento do Codex (etapas 51–68)

**Fonte:** `Promo_Gifts_V4_Mockup_Analise_e_Design.pdf` (Codex, 08/10/2026, mesmo commit `c194982c5f1f` da nossa auditoria). Instrução do dono: ignorar mudanças de cores (paleta de UI), analisar as de design, análise exaustiva do resto.
**Veredito:** o documento dos 40 achados do Codex (M01–M40), 13 já estavam no nosso plano (M06=etapa 11, M11=27, M14=snapshot/16, M16=21, M18=32, M23=24, M28=redesign, M29=26, M30=28, M32=25, M38=14, M39=12/13, M40=45/46) e 27 viraram as 18 etapas novas abaixo (51–68). Não contradiz nenhuma das 29 decisões já tomadas. (Correção: a primeira versão deste adendo dizia "18 confirmados e 22 novos" — a contagem certa é 13 e 27.) A proposta de redesign (4 etapas) é compatível com as decisões Q3/Q8/Q9 e fica como onda 3 — o próprio Codex manda corrigir os contratos antes de aplicar a nova UI.

## Conceito-chave adotado do Codex: SNAPSHOT DE REVISÃO
Cada geração captura um snapshot imutável (produto+variante+foto, marca+versão aplicada, cores escolhidas, geometria por área, cliente, data). PNG e ficha PDF nascem do MESMO snapshot, nunca dos campos atuais da tela. Alterar qualquer dado marca o resultado anterior como desatualizado e inicia nova revisão. Isso materializa as decisões Q12 (revisões) e Q18 (ficha fiel) e resolve M08/M14/M19/M22/M27. As três camadas de conclusão são estados distintos: imagem gerada ≠ projeto salvo ≠ ficha disponível.

## Etapas novas (51–68)
51. [F:hugo][O2] M01/M02: UMA transformação para prévia e saída — prévia laser/serigrafia e compositor usam os MESMOS pixels e a MESMA geometria (fim do fallback 20 cm/8 px no servidor divergindo dos 40 px do editor; função única da etapa 19 estendida ao servidor).
52. [F:iris][O2] M03: giro/escala não cortam a marca em silêncio — separar caixa da marca da área de aplicação; corte só com aviso explícito.
53. [F:hugo][O2] M04: a geração usa SEMPRE o arquivo original da foto escolhida, nunca o thumbnail CDN; seleção explícita entre fotos reais da variante.
54. [F:iris][O2] M05: ação "Usar logo do cliente" — o CRM (Singu) já devolve logo_url; hoje só vira avatar. Entra no mesmo pipeline de validação do upload. (Casa com Q22.)
55. [F:hugo][O2] M07: reabrir rascunho/histórico restaura produto+variante+FOTO exatos (fim do variant:null/images[0]).
56. [F:hugo][O2] M08/M09/M10: análise de cores pertence ao asset+área — paleta, Pantone escolhido (HEX junto) e tratamento entram no snapshot; trocar código Pantone atualiza a amostra em todos os consumidores; cada área tem a SUA análise. (Isto é integridade de dados, não mudança de cor de UI.)
57. [F:hugo][O2] M13/M37: identidade de técnica por ID + validação por (produto, local, técnica, dimensão, cores) como conjunto; `undefined !== null` não vira "área oficial"; máximos de técnicas distintas não se somam.
58. [F:iris][O2] M15: remover logo de UMA área não limpa a área ativa (callback respeita o ID).
59. [F:iris][O1] M17: a barra de status prioriza o ERRO atual sobre o "Salvo" antigo (ordem: erro > salvando > pendência > salvo).
60. [F:hugo][O2] M19/M22: contrato único de saída — nada de data URL gravada no histórico; card, lightbox e compartilhar nomeiam explicitamente imagem × ficha e usam o asset da MESMA revisão.
61. [F:hugo][O2] M20: lote associa resultado por ID estável de área, nunca por areaName (nomes repetidos quebram).
62. [F:iris][O1] M21: busca de cliente consulta o universo autorizado no servidor (fim do fuzzy só nas 50 primeiras páginas carregadas); "não encontrado" ≠ "CRM indisponível".
63. [F:iris][O2] M24: excluir/filtrar reconcilia paginação e seleção de comparação (sem página fantasma).
64. [F:hugo][O2] M25: exclusão segura de assets compartilhados — logo reutilizada por outra revisão não é apagada; limpar só órfãos; layout_url incluído no ciclo de vida. (Entra no desenho da lixeira Q7.)
65. [F:iris][O2] M26/M27: anotações e ficha têm persistência real com estado visível (falha de captura/UPDATE não é só logger).
66. [F:iris][O1] M33/M34: arraste com ajuste fino por teclado (tamanho/rotação incluídos), pointercancel, limites coerentes; upload padronizado nos 3 pontos (raster 10 MB; arte original AI/EPS/PDF/SVG/CDR 25 MB; validação igual no picker e no arraste; sem envio concorrente).
67. [F:iris][O2] M31/M35/M36: ordenação rotulada pelo alcance real; ficha sem ampliação cortada (fit íntegro + zoom, A4 exportado intacto); overlay de progresso honesto (sem 95% fictício nem menção a IA).
68. [F:vera][O2] M12: respostas de análise antigas ignoradas (token por análise) e imagem com crossOrigin + onload protegido — teste cobrindo.

## Redesign (onda 3, após contratos) — decisões de design ACEITAS da proposta
- 4 etapas (Produto → Logo e cores → Aplicação → Resultado), uma ação dominante por tela; stepper de 6 itens morre (M28).
- Cabeçalho de trabalho: cliente visível + "Trocar cliente" com reconciliação explícita (nunca troca silenciosa); "Meus mockups" acessível.
- Voltar não apaga trabalho; invalidações são anunciadas ("resultado anterior desatualizado").
- Catálogo 62/38 com inspector; estados: sem produto / carregando / sem foto utilizável (impede avançar com placeholder) / troca de variante.
- Logo e cores: dois caminhos (logo do cliente | enviar arquivo), origem visível, "Trocar logo"; original de arte preservado com versão de aplicação identificada.
- Pantone: 4 estados rotulados (detectada / sugerida / informada / aplicada) — sugestão NUNCA vira selo de confirmação automática.
- Histórico: comparar até 3 (não 4), adaptador único para página e aba (M23), sem KPIs decorativos.
- Acessibilidade: alvos 44–48 px, contraste 4,5:1, Esc fecha a camada ativa (não reseta), Ctrl/Cmd+R mantém o sentido do navegador — já alinhado aos cartões da onda 1.
- Matriz de aceite A01–A20 do Codex adotada como critérios de prova das ondas 2–3 (nenhum marcado como "já testado").

## Conflito a decidir com o dono (único)
- O Codex propõe **cliente obrigatório** para gerar; a decisão Q22 registrada era cliente opcional (campos nulos sem erro). Ver pergunta D1.

## Fora (instrução do dono)
- Mudanças de paleta/cor da UI propostas pelo PDF: ignoradas. O app segue o Blue Premium como está; o timbrado segue a marca (Q19).

---

# Adendo 2 — o que MAIS se aproveita do documento do Codex (etapas 69–80)
Segunda passada (08/10/2026): partes do PDF que ainda não tinham virado etapa — contrato de dados, estados de conclusão, jornada, acessibilidade e a matriz de aceite. Cores de UI continuam ignoradas.

69. [F:workersql][O2] PROPOSTA SQL — snapshot de revisão em `generated_mockups`: `snapshot jsonb` (identidade; produto/variante/foto original; marca + versão aplicada; cores escolhidas; geometria por área com id estável; cliente; data real), `revision int`, `is_stale boolean`, `snapshot_version int` (contrato p.15 do PDF). Estende a etapa 16 (`parent_mockup_id`). Rollback incluso.
70. [F:hugo][O3] Compor SEMPRE gerando o snapshot; PNG e ficha leem DELE (nunca dos campos atuais da tela). Qualquer edição relevante marca a revisão anterior como desatualizada; "Novo mockup para este cliente" abre revisão nova sem sobrescrever (M14, M19). Depende da 69.
71. [F:iris][O3] Três estados de conclusão distintos e visíveis — Imagem gerada · Projeto salvo · Ficha disponível — cada um com erro e retentativa próprios; falha de um mantém a imagem anterior; "Salvo" só com persistência confirmada (p.12).
72. [F:hugo][O2] Original de arte preservado + versão de aplicação identificada (redução de cores/tratamento determinístico); o vendedor volta à marca original sem reenviar o arquivo (p.8).
73. [F:iris][O2] Multi-área: "Usar este logo nas outras áreas" copia só a marca (sem prometer tamanho/técnica validados); cada área com ID estável e foto/vista associada quando existir (p.11).
74. [F:iris][O2] Estados de geometria rotulados na prévia: validada · dimensões conhecidas sem máscara (posicionamento ilustrativo, sem fronteira oficial desenhada) · técnica sem regra (nunca vira selo "compatível") — sem régua com falsa precisão. OBS: a decisão Q13 (produto SEM dimensões não gera) continua valendo; estes rótulos cobrem os casos parciais.
75. [F:iris][O3] Passo Produto com estados reais: sem produto / carregando (skeleton) / sem foto utilizável (impede avançar com placeholder) / troca de variante preserva cliente e logo e reavalia técnica, área e revisão visual (p.7).
76. [F:iris][O3] Cabeçalho de trabalho: cliente, nome do projeto quando necessário, "Trocar cliente" (reconcilia a marca aplicada, nunca troca em silêncio), estado de salvamento e acesso a "Meus mockups"; voltar não apaga trabalho; invalidações anunciadas (p.6, M28/M32).
77. [F:workertestes][O3] Matriz de aceite A01–A20 vira testes, um cartão por grupo, com fixtures FIXAS (nunca marca/cliente real): (a) marca CRM e upload+reload, (b) variante/foto, (c) Pantone alterado, (d) áreas diferentes e remoção por área, (e) técnica/limite e escala conhecida×estimada, (f) rotação/escala, (g) edição pós-geração, (h) atalhos seguros, (i) teclado/toque, (j) responsividade 375/768/1024/1440, (k) falhas de análise/salvar/lote parcial, (l) imagem×ficha, (m) histórico/exclusão, (n) formatos e limites. Evidência = asserções do estado persistido, não "título do cenário".
78. [F:iris][O3] Acessibilidade geral (W3C 2.5.7/1.4.3/2.5.8): busca como combobox acessível, nomes em sliders/diálogos, foco visível, Esc fecha SÓ a camada ativa, contraste 4,5:1 em pares reais (inclui hover/placeholder), alvos ≥44 px nas ações frequentes, `prefers-reduced-motion` respeitado, sucesso discreto.
79. [F:iris][O3] Histórico: busca por produto/SKU; filtros por cliente/técnica/período no servidor; alternância imagem×ficha explícita; comparar até 3 com checkbox visível; estados distintos (filtro vazio / sem histórico / falha de carga); sem KPIs decorativos (p.13).
80. [F:workertestes][O3] e2e do módulo: trocar seletores antigos de `mockup-generator.spec.ts`, cobrir timeout sem geração e assertar o estado persistido (M40). Roda no workflow que o Joaquim incluir (etapa 50).

## Do documento do Codex que NÃO viramos etapa
- Percentuais fixos 62/38 e 31/69 do layout; "alvos 44–48 px" em tudo; comparar 3 vs 4 — preferências, não requisitos.
- Qualquer item de cor/paleta (instrução do dono).

---

# Adendo 3 — planos antigos do repositório que ainda valem + risco achado (etapas 81–84)
Varredura (08/10/2026) dos planos de 100/50 etapas, roadmap, Kit Maker e da lista de planos da memória do dono. Resultado: o plano "cartão de arquivo (mockup)" da memória é do **Zapp Web V2** (um mockup de UI, outro projeto) — não é deste módulo.

## Planos do repositório sobre o Mockup ainda NÃO feitos
| Origem | Item | Veredito |
|---|---|---|
| Plano 100: 002 | owner e criticidade do módulo ("owner TBD" em todos os docs) | **Vale** — barato; entra no ADR (etapa 49) → etapa 81 |
| Plano 100: 063 · 092 / Plano 50: 036 | provar o mockup E2E em staging; hoje exigem "cobrança simulada e aprovação", que NÃO existem (créditos arquivados — Q11; aprovação interna — Q5) | **Vale, reescrito** → etapa 82 (fluxo real: gerar → salvar → anexar ao orçamento → link assinado → lixeira) |
| Roadmap :713 / ANALISE_109 :126 | aprovação pública pelo cliente | **Futuro** (decisão Q5); fica no roadmap |
| Kit Maker 080 | aceite integrado com mockup real | **Vale** → coberto pela 82 (Kit Maker entra no smoke) |
| E39 (aceite visual "mockup x produção") | é design de tela, não o módulo | Ignorado |

## RISCO descoberto (muda 3 etapas já aprovadas)
O orçamento e o **Kit Builder já gravam URLs de mockup/arte** (`quote_items.mockup_urls` e `artwork_urls`, `src/pages/kit-builder/useKitBuilderQuote.ts:250,284`; `src/hooks/quotes/quoteHelpers.ts:234-235`; `src/lib/mockup-storage.ts:50` usa `getPublicUrl`). Orçamentos antigos guardam essas URLs públicas. Se o bucket virar privado (decisão Q6) e as etapas 4/9 forem aplicadas como estão, **toda imagem de mockup de orçamento já emitido quebra**. Além disso, URL assinada expira: gravar URL assinada no orçamento (etapa 38) também quebra com o tempo.
Correções:
- Etapa 38/37: o orçamento passa a guardar o **caminho no storage (ou o id do mockup)**, nunca uma URL; a URL assinada é gerada na hora de exibir/gerar PDF.
- Etapa 4: em vez de tornar o bucket atual privado de imediato, usar **transição em duas fases** (ver D4): bucket NOVO privado para tudo que for gerado daqui em diante; o bucket legado fica com leitura por objeto apenas para o que orçamentos antigos referenciam, até o backfill dos caminhos.
- Etapa 9: o serviço aceita os dois formatos (URL legada e caminho) durante a transição.

## Etapas novas
81. [F:vera][O2] Owner e criticidade do módulo no ADR da fronteira (etapa 49): owner = Joaquim, criticidade C1 (não bloqueia o orçamento) — confirmar (D3).
82. [F:workertestes][O3] Smoke E2E real em STAGING (plano 063/092/036 reescrito): gerar → salvar → anexar ao orçamento → link assinado de 7 dias → lixeira; inclui o Kit Builder gerando mockup para a caixa. Precisa de ambiente staging + JWT de teste + dados descartáveis → [J] fornece o ambiente.
83. [F:complexo][O2] Inventário e adaptação dos consumidores de URL de mockup/arte FORA do módulo: Kit Builder (`useKitBuilderQuote`), `quoteHelpers`, `quoteService`, simulador — todos passam a guardar caminho/id e resolver URL assinada na leitura; testes de contrato do payload do orçamento atualizados (`quoteServicePayloadContract.test.ts`). **Pré-requisito da etapa 4.**
84. [F:workersql][O3] PROPOSTA SQL de backfill: converter URLs públicas legadas em `quote_items.mockup_urls`/`artwork_urls` (e `generated_mockups.mockup_url/thumbnail_url/layout_url`) para caminhos de storage, em lotes, com rollback e contagem antes/depois. Depois do backfill o bucket legado pode ficar privado.
