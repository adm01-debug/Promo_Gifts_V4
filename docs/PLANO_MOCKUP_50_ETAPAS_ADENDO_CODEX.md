# Adendo ao Plano Mockup — análise do documento do Codex (etapas 51–68)

**Fonte:** `Promo_Gifts_V4_Mockup_Analise_e_Design.pdf` (Codex, 08/10/2026, mesmo commit `c194982c5f1f` da nossa auditoria). Instrução do dono: ignorar mudanças de cores (paleta de UI), analisar as de design, análise exaustiva do resto.
**Veredito:** o documento confirma 18 dos nossos achados (M06=etapa 11, M16=21, M18=32, M23=24, M29=26, M30=28, M38=14, M39=12/13, M40=45/46…), não contradiz nenhuma das 29 decisões já tomadas, e traz 22 achados novos (abaixo). A proposta de redesign (4 etapas) é compatível com as decisões Q3/Q8/Q9 e fica como onda 3 — o próprio Codex manda corrigir os contratos antes de aplicar a nova UI.

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
