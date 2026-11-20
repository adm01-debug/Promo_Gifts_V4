/**
 * Tetos técnicos do motor de frete.
 *
 * Não são regra de negócio nem parâmetro de `freight_settings`: existem para o
 * motor **sempre responder** — sem exceção e sem travar a tela —, mesmo quando
 * a quantidade chega com zeros a mais.
 */

/**
 * Máximo de volumes (caixas) que um plano monta.
 *
 * Cada caixa do plano é um objeto próprio em `FreightPlan.volumes`, então o
 * tamanho do plano cresce com o número de caixas, não com o de produtos.
 * Medido em 20/11/2026 (Node 22.23; menor e maior mediana de duas rodadas de 9
 * execuções, em máquina dividida com outros processos), com uma peça de
 * 1 unidade por caixa (cubo de 30 cm nas quatro caixas padrão):
 *
 * | Volumes | Tempo do plano | Plano em JSON |
 * |---|---|---|
 * | 1.000 | 3 a 5 ms | 0,38 MB |
 * | 10.000 | 13 a 23 ms | 3,81 MB |
 * | 120.000 (sem teto, motor anterior) | 171 a 183 ms | 45,72 MB |
 *
 * 10.000 é o ponto em que o plano ainda responde em milissegundos e cabe com
 * folga na memória da aba; dez vezes mais já são dezenas de MB por cálculo, e
 * sem teto nenhum uma quantidade com zeros a mais derrubava a tela: o motor
 * anterior estourava a pilha entre 125 mil e 126 mil volumes (o ponto exato
 * muda com o ambiente) e, com `Number.MAX_SAFE_INTEGER` unidades, a memória
 * (este último caso foi medido na validação de 19/11/2026, não aqui).
 *
 * Acima do teto o plano sai `dados_insuficientes`, com um aviso que cita
 * quantas caixas o pedido daria e pede para conferir a quantidade. Nenhum
 * volume é montado: a contagem sai das capacidades, antes de alocar.
 *
 * Não corta pedido real: 10.000 caixas GG (0,12 m³ cada) são 1.200 m³ de
 * carga. Quem chega nesse número é erro de digitação.
 */
export const MAX_VOLUMES_POR_PLANO = 10_000;
