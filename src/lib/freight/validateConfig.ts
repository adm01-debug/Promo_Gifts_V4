/**
 * Confere as caixas e os parâmetros **antes** de qualquer conta do plano.
 *
 * O motor confia nos tipos, mas quem o alimenta é uma linha de banco passada
 * por um adaptador. Um campo ausente, com outro nome (`cubic_divisor_correios`
 * no lugar de `cubicDivisorCorreios`) ou em texto (`'6000'`) não quebra nada:
 * vira número errado com status `ok` — peso cubado 0, dez caixas onde cabia
 * uma, peso bruto concatenado. Aqui a falha é **fechada**: entrada inválida
 * bloqueia o plano e o aviso nomeia o campo.
 *
 * **Uma caixa inválida bloqueia o plano inteiro**, mesmo havendo outras
 * válidas. Ignorá-la em silêncio mudaria o plano sem ninguém saber — e, se ela
 * fosse a maior, trocaria um "cabe" por um "não cabe". Quem cadastrou precisa
 * ver o erro.
 *
 * O que **não** é erro aqui: `fillFactor` da caixa fora de (0, 1]. Esse caso
 * tem regra própria e documentada — vale o padrão global (`fitCount`), que
 * esta validação garante estar no intervalo.
 *
 * As entradas são `unknown` de propósito: o tipo declarado é a promessa de
 * quem chama, e é justamente ela que está sendo conferida.
 */

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function ler(objeto: unknown, campo: string): unknown {
  return ehRegistro(objeto) ? objeto[campo] : undefined;
}

function ehNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function ehPositivo(valor: unknown): valor is number {
  return ehNumero(valor) && valor > 0;
}

/**
 * Como o valor recebido aparece no aviso, em palavras de quem cadastra e sem
 * depender do `toString` dele.
 */
function mostrar(valor: unknown): string {
  if (valor === undefined) return 'campo ausente';
  if (valor === null) return 'campo vazio';
  if (typeof valor === 'number') return String(valor);
  if (typeof valor === 'string') return `texto "${valor}"`;
  return 'valor que não é número';
}

const DIVISORES = [
  ['cubicDivisorCorreios', 'o divisor do peso cubado dos Correios'],
  ['cubicDivisorRodoviario', 'o divisor do peso cubado rodoviário'],
] as const;

function problemasDosParametros(settings: unknown): string[] {
  const problemas: string[] = [];

  for (const [campo, rotulo] of DIVISORES) {
    const valor = ler(settings, campo);
    if (!ehPositivo(valor)) {
      problemas.push(
        `Parâmetro de frete inválido: ${rotulo} (${campo}) precisa ser um número maior que zero. Recebido: ${mostrar(valor)}.`,
      );
    }
  }

  const fator = ler(settings, 'defaultFillFactor');
  if (!ehPositivo(fator) || fator > 1) {
    problemas.push(
      `Parâmetro de frete inválido: o fator de aproveitamento padrão (defaultFillFactor) precisa ser um número maior que zero e no máximo 1. Recebido: ${mostrar(fator)}.`,
    );
  }

  return problemas;
}

const LADOS = [
  ['inner', 'heightCm', 'a altura interna'],
  ['inner', 'widthCm', 'a largura interna'],
  ['inner', 'lengthCm', 'o comprimento interno'],
  ['outer', 'heightCm', 'a altura externa'],
  ['outer', 'widthCm', 'a largura externa'],
  ['outer', 'lengthCm', 'o comprimento externo'],
] as const;

const LADOS_EXTERNOS = [
  ['heightCm', 'a altura externa'],
  ['widthCm', 'a largura externa'],
  ['lengthCm', 'o comprimento externo'],
] as const;

function problemasDaCaixa(box: unknown, posicao: number, idsVistos: Set<string>): string[] {
  const code = ler(box, 'code');
  const caixa = typeof code === 'string' && code !== '' ? `Caixa ${code}` : `Caixa nº ${posicao}`;

  if (!ehRegistro(box)) return [`${caixa} inválida: os dados da caixa não vieram.`];

  const problemas: string[] = [];

  // O id é o que o empacotador usa para distinguir as caixas. Sem id, ou com o
  // mesmo id em duas caixas, elas seriam tomadas por uma só.
  const id = box.id;
  if (typeof id !== 'string' || id === '') {
    problemas.push(
      `${caixa} inválida: o id da caixa (id) precisa ser um texto não vazio. Recebido: ${mostrar(id)}.`,
    );
  } else if (idsVistos.has(id)) {
    problemas.push(`${caixa} inválida: o id "${id}" já é de outra caixa da lista.`);
  } else {
    idsVistos.add(id);
  }

  for (const [face, lado, rotulo] of LADOS) {
    const valor = ler(box[face], lado);
    if (!ehPositivo(valor)) {
      problemas.push(
        `${caixa} inválida: ${rotulo} (${face}.${lado}) precisa ser um número maior que zero. Recebido: ${mostrar(valor)}.`,
      );
    }
  }

  // Externa menor que interna é medida trocada ou digitada em outra unidade;
  // o peso cubado e o m³ saem da externa e ficariam perto de zero.
  for (const [lado, rotulo] of LADOS_EXTERNOS) {
    const interno = ler(box.inner, lado);
    const externo = ler(box.outer, lado);
    if (ehPositivo(interno) && ehPositivo(externo) && externo < interno) {
      problemas.push(
        `${caixa} inválida: ${rotulo} (outer.${lado} = ${externo}) não pode ser menor que a interna (inner.${lado} = ${interno}).`,
      );
    }
  }

  const vazia = box.emptyWeightG;
  const vaziaValida = ehNumero(vazia) && vazia >= 0;
  if (!vaziaValida) {
    problemas.push(
      `${caixa} inválida: o peso da caixa vazia (emptyWeightG) precisa ser um número maior ou igual a zero. Recebido: ${mostrar(vazia)}.`,
    );
  }

  const maximo = box.maxWeightG;
  if (!ehPositivo(maximo)) {
    problemas.push(
      `${caixa} inválida: o peso máximo (maxWeightG) precisa ser um número maior que zero. Recebido: ${mostrar(maximo)}.`,
    );
  } else if (vaziaValida && maximo <= vazia) {
    problemas.push(
      `${caixa} inválida: o peso máximo (maxWeightG = ${maximo}) precisa ser maior que o peso da caixa vazia (emptyWeightG = ${vazia}).`,
    );
  }

  return problemas;
}

/**
 * Lista o que impede o cálculo, em avisos prontos para a tela. Lista vazia
 * quer dizer que caixas e parâmetros podem ser usados.
 *
 * Lista de caixas vazia **não** é problema daqui: sem caixa ativa o plano sai
 * `nao_cabe`, com o aviso próprio.
 */
export function validateConfig(boxes: unknown, settings: unknown): string[] {
  const problemas = problemasDosParametros(settings);

  if (!Array.isArray(boxes)) {
    problemas.push('Caixas de transporte inválidas: a lista de caixas não veio.');
    return problemas;
  }

  // `Array.isArray` estreita `unknown` para `any[]`; cada caixa continua sendo
  // conferida como `unknown`.
  const caixas: readonly unknown[] = boxes;
  const idsVistos = new Set<string>();
  return [
    ...problemas,
    ...caixas.flatMap((box, indice) => problemasDaCaixa(box, indice + 1, idsVistos)),
  ];
}

/**
 * Confere a lista de linhas e as opções do plano, as outras duas entradas que
 * vêm de fora. Lista vazia quer dizer que dá para calcular.
 *
 * Só a forma é conferida (lista, objeto, `row` presente): o conteúdo da linha
 * tem tratamento próprio (`resolveItemDimensions`, `expandQuantities`).
 */
export function validateEntrada(inputs: unknown, options: unknown): string[] {
  const problemas: string[] = [];

  if (!ehRegistro(options)) {
    problemas.push('Opções do plano inválidas: as opções do cálculo não vieram.');
  }

  if (!Array.isArray(inputs)) {
    problemas.push('Itens do plano inválidos: a lista de itens não veio.');
    return problemas;
  }

  const linhas: readonly unknown[] = inputs;
  linhas.forEach((linha, indice) => {
    if (!ehRegistro(linha)) {
      problemas.push(`Item nº ${indice + 1} inválido: os dados do item não vieram.`);
    } else if (!ehRegistro(linha.row)) {
      problemas.push(`Item nº ${indice + 1} inválido: os dados do produto (row) não vieram.`);
    }
  });
  return problemas;
}
