/**
 * Tradução do ramo de atividade do CRM para o ramo do catálogo (sinal de peso 30
 * do "Encaixe do Cliente").
 *
 * PROBLEMA: o CRM externo guarda `ramo_atividade` como TEXTO LIVRE digitado por
 * pessoas ("Farmacêutico", "Construtora", "agro", "Clínica"). O catálogo tem uma
 * taxonomia fechada de 22 ramos pai em `ramo_atividade.nome` (banco canônico
 * doufsxqlfjyuvxuezpln). Sem tradução, o sinal de ramo nunca liga.
 *
 * MEDIDO no canônico em 2026-11-15 (`execute_sql`, somente leitura):
 *   • `ramo_atividade`                → 22 linhas (os nomes abaixo, grafia exata).
 *   • `ramo_atividade_filho`          → 108 linhas, 0 sem pai.
 *   • `produto_ramo_atividade`        → 54.360 vínculos, 5.813 produtos distintos,
 *                                        105 filhos distintos usados.
 *
 * REGRA DE OURO: nunca chutar. Recomendar pelo ramo errado é pior que recomendar
 * sem ramo. Texto sem correspondência honesta volta com `ramoPaiId: null`,
 * `nome: null` e `confianca: 'baixa'` — o chamador então pontua o produto sem o
 * sinal de ramo, em vez de pontuar pelo ramo de outra pessoa.
 *
 * PUREZA: sem rede, sem React, sem acesso a banco. Por isso os IDs dos 22 ramos
 * NÃO moram aqui (hardcode de dado de produção é proibido): quem tem o catálogo
 * carregado passa em `catalogo` e recebe `ramoPaiId` resolvido; quem só precisa
 * do nome canônico (uma query SQL casa por `ramo_atividade.nome`) chama com um
 * argumento e recebe `ramoPaiId: null` com `nome` preenchido.
 * Leia o resultado assim: `nome !== null` é o sinal de "houve tradução";
 * `ramoPaiId` só vem preenchido quando o catálogo foi passado e contém o ramo.
 */

/** Linha do catálogo de ramos pai, como vem de `select id, nome from ramo_atividade`. */
export interface RamoCatalogo {
  readonly id: string;
  readonly nome: string;
}

/**
 * Força da tradução:
 *   • `alta`  — o texto é um dos 22 nomes do catálogo (ignorando acento, caixa,
 *               plural, ordem das palavras e palavras de ligação).
 *   • `media` — o texto casou por apelido conhecido ("Construtora" → "Indústria
 *               Construção"); é uma tradução humana curada, não uma identidade.
 *   • `baixa` — não houve correspondência honesta; nada foi traduzido.
 */
export type ConfiancaRamo = 'alta' | 'baixa' | 'media';

export interface RamoNormalizado {
  /** ID em `ramo_atividade.id`, ou `null` se não houve match ou não veio catálogo. */
  readonly ramoPaiId: string | null;
  /** Nome canônico do ramo pai (grafia exata do banco), ou `null` se não houve match. */
  readonly nome: string | null;
  readonly confianca: ConfiancaRamo;
}

/**
 * Os 22 ramos pai, na grafia exata de `ramo_atividade.nome` (medido em 2026-11-15).
 * Esta lista é a fonte dos alvos de tradução; o ID vem do catálogo em runtime.
 */
export const RAMOS_CANONICOS = [
  'Agro',
  'Celulose',
  'Educação',
  'Energia',
  'Ferramentas e Ferragens',
  'Financeiro',
  'Holdings',
  'Indústria Alimentícia',
  'Indústria Automobilística',
  'Indústria Construção',
  'Indústria Eletrônicos',
  'Indústria Embalagens',
  'Indústria Farmacêutica',
  'Indústria Fitas Adesivas',
  'Indústria Química',
  'Indústria Siderúrgica',
  'Metalúrgica',
  'Mineração',
  'Petróleo',
  'Saúde',
  'Tecnologia',
  'Transportes e Logística',
] as const satisfies readonly string[];

/**
 * Apelidos curados: como as pessoas escrevem no CRM → ramo pai do catálogo.
 * Só entra desvio defensável. Casos deliberadamente FORA (devolvem `baixa`):
 * varejo/supermercado, imobiliária, publicidade, serviços pessoais e telecom —
 * não existe ramo pai honesto para eles na taxonomia de 22.
 * Armadilha coberta: "Petroquímica" é filho de **Petróleo**, não de Indústria
 * Química (`ramo_atividade_filho`: "Petroquímica | Indústria" → Petróleo).
 */
export const APELIDOS_POR_RAMO: Readonly<Record<string, readonly string[]>> = {
  Agro: [
    'Agronegócio',
    'Agropecuária',
    'Agrícola',
    'Agricultura',
    'Agroindústria',
    'Fazenda',
    'Pecuária',
    'Avicultura',
    'Suinocultura',
    'Fertilizantes',
    'Defensivos agrícolas',
    'Sementes',
    'Nutrição animal',
    'Cooperativa agrícola',
  ],
  Celulose: ['Papel e celulose', 'Indústria de papel', 'Papeleira'],
  Educação: [
    'Educacional',
    'Ensino',
    'Escola',
    'Colégio',
    'Faculdade',
    'Universidade',
    'Cursos preparatórios',
  ],
  Energia: [
    'Energia elétrica',
    'Energia solar',
    'Bioenergia',
    'Geração de energia',
    'Distribuidora de energia',
  ],
  'Ferramentas e Ferragens': ['Ferramentas', 'Ferragens', 'Distribuidora de ferramentas'],
  Financeiro: [
    'Banco',
    'Bancário',
    'Financeira',
    'Seguradora',
    'Seguros',
    'Corretora de seguros',
    'Corretora de valores',
    'Consórcio',
    'Cooperativa de crédito',
    'Previdência',
    'Fintech',
    'Meios de pagamento',
    'Factoring',
    'Investimentos',
  ],
  Holdings: ['Holding financeira', 'Holding não financeira'],
  'Indústria Alimentícia': [
    'Alimentos',
    'Alimentício',
    'Indústria de alimentos',
    'Bebidas',
    'Distribuidora de bebidas',
    'Frigorífico',
    'Laticínios',
    'Café',
    'Açúcar e álcool',
  ],
  'Indústria Automobilística': [
    'Automotivo',
    'Autopeças',
    'Peças automotivas',
    'Montadora',
    'Concessionária',
    'Concessionária de veículos',
    'Pneus',
    'Implementos rodoviários',
  ],
  'Indústria Construção': [
    'Construtora',
    'Construção',
    'Construção civil',
    'Incorporadora',
    'Engenharia civil',
    'Empreiteira',
    'Cimento',
    'Material de construção',
  ],
  'Indústria Eletrônicos': ['Eletrônicos', 'Eletroeletrônico', 'Eletrodomésticos'],
  'Indústria Embalagens': ['Embalagens', 'Embalagem plástica'],
  'Indústria Farmacêutica': [
    'Farmacêutico',
    'Farmácia',
    'Medicamentos',
    'Laboratório farmacêutico',
    'Distribuidora de medicamentos',
    'Farmacêutica veterinária',
  ],
  'Indústria Fitas Adesivas': ['Fitas adesivas'],
  'Indústria Química': ['Química', 'Químico', 'Produtos químicos', 'Tintas', 'Indústria de tintas'],
  'Indústria Siderúrgica': ['Siderúrgica', 'Siderurgia', 'Aço', 'Usina siderúrgica'],
  Metalúrgica: ['Metalurgia', 'Metalúrgico', 'Metalmecânica'],
  Mineração: ['Mineradora', 'Minério', 'Extração mineral'],
  Petróleo: [
    'Petróleo e gás',
    'Óleo e gás',
    'Combustíveis',
    'Distribuidora de combustíveis',
    'Lubrificantes',
    'Petroquímica',
    'Gás natural',
    'TRR',
  ],
  Saúde: [
    'Clínica',
    'Hospital',
    'Plano de saúde',
    'Operadora de saúde',
    'Cooperativa de saúde',
    'Odontologia',
    'Laboratório de análises clínicas',
  ],
  Tecnologia: [
    'TI',
    'Tecnologia da informação',
    'Software',
    'Softwares',
    'Software house',
    'Informática',
    'Desenvolvimento de software',
  ],
  'Transportes e Logística': [
    'Transportadora',
    'Transporte',
    'Transporte rodoviário',
    'Logística',
    'Companhia aérea',
    'Frete',
  ],
};

/** Pontuação e separadores que o CRM mistura no texto ("Farmacêutica | Indústria"). */
const SEPARADORES_RE = /[|/\\\-_,.;:()[\]{}+&"'`]/g;

/**
 * Palavras que não distinguem ramo. Removidas dos dois lados (texto do CRM e
 * nome canônico), então "setor de energia" e "Energia" viram a mesma chave.
 */
const PALAVRAS_IGNORADAS = new Set([
  'a',
  'o',
  'as',
  'os',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'para',
  'com',
  'ramo',
  'setor',
  'setores',
  'segmento',
  'area',
  'atividade',
  'tipo',
]);

function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Plural português para singular, no que basta para este vocabulário fechado. */
function singularizar(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('oes') || token.endsWith('aes')) return `${token.slice(0, -3)}ao`;
  if (token.endsWith('eis')) return `${token.slice(0, -3)}el`;
  if (token.endsWith('ais')) return `${token.slice(0, -3)}al`;
  if (token.endsWith('ns')) return `${token.slice(0, -2)}m`;
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

/**
 * Chave de comparação: sem acento, minúscula, sem pontuação, sem palavras de
 * ligação, singular e com os tokens em ordem alfabética — "Alimentícia
 * Indústria" e "Indústria Alimentícia" casam, sem precisar de uma entrada para
 * cada ordem. Usada nos dois lados da comparação.
 */
export function chaveRamo(texto: string): string {
  const base = removerAcentos(texto).toLowerCase().replace(SEPARADORES_RE, ' ');
  const tokens: string[] = [];
  for (const bruto of base.split(/\s+/)) {
    if (!bruto || PALAVRAS_IGNORADAS.has(bruto)) continue;
    const token = singularizar(bruto);
    if (!token || PALAVRAS_IGNORADAS.has(token)) continue;
    tokens.push(token);
  }
  return tokens.sort().join(' ');
}

/** chave → nome canônico, para os 22 nomes do catálogo (match de confiança alta). */
const CHAVES_CANONICAS = new Map<string, string>(
  RAMOS_CANONICOS.map((nome) => [chaveRamo(nome), nome]),
);

/** chave → nome canônico, para os apelidos curados (match de confiança média). */
const CHAVES_APELIDOS = new Map<string, string>(
  Object.entries(APELIDOS_POR_RAMO).flatMap(([nome, apelidos]) =>
    apelidos.map((apelido) => [chaveRamo(apelido), nome] as [string, string]),
  ),
);

const SEM_RAMO: RamoNormalizado = { ramoPaiId: null, nome: null, confianca: 'baixa' };

function resolverId(nome: string, catalogo: readonly RamoCatalogo[]): string | null {
  const chave = chaveRamo(nome);
  for (const linha of catalogo) {
    if (chaveRamo(linha.nome) === chave) return linha.id;
  }
  return null;
}

/**
 * Traduz o `ramo_atividade` em texto livre do CRM para um ramo pai do catálogo.
 *
 * @param texto    Texto como veio do CRM (aceita `null`/`undefined`/vazio).
 * @param catalogo Linhas de `ramo_atividade` (`id` + `nome`), quando o chamador
 *                 as tem carregadas. Sem elas, `ramoPaiId` volta `null` e o
 *                 casamento segue possível pelo `nome` canônico.
 * @returns Ramo pai traduzido, ou `{ ramoPaiId: null, nome: null, confianca: 'baixa' }`
 *          quando não há correspondência honesta.
 */
export function normalizeRamo(
  texto: string | null | undefined,
  catalogo: readonly RamoCatalogo[] = [],
): RamoNormalizado {
  if (typeof texto !== 'string') return SEM_RAMO;
  const chave = chaveRamo(texto);
  if (!chave) return SEM_RAMO;

  const canonico = CHAVES_CANONICAS.get(chave);
  if (canonico) {
    return { ramoPaiId: resolverId(canonico, catalogo), nome: canonico, confianca: 'alta' };
  }

  const porApelido = CHAVES_APELIDOS.get(chave);
  if (porApelido) {
    return { ramoPaiId: resolverId(porApelido, catalogo), nome: porApelido, confianca: 'media' };
  }

  return SEM_RAMO;
}
