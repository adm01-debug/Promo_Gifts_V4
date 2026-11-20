/**
 * Converte uma célula de planilha em booleano. Aceita "sim/não", "true/false"
 * e "1/0" (e as variações abaixo); o que não for reconhecido como "sim" vira
 * `false`, que é o comportamento da importação desde antes de este helper
 * existir.
 */
const VALORES_SIM = ['true', '1', 'sim', 'yes', 's', 'y', 'x'];

export function parseBooleanCell(raw: unknown): boolean {
  return VALORES_SIM.includes(String(raw).toLowerCase().trim());
}

const SIM_ESTRITO = ['sim', 's', 'true', '1', 'yes', 'verdadeiro'];
const NAO_ESTRITO = ['nao', 'n', 'false', '0', 'no', 'falso'];

/**
 * Leitura estrita (campo "Não mistura"): só os conjuntos acima valem, sem
 * acento, caixa ou espaços nas pontas. Qualquer outro valor devolve `undefined`
 * para quem chama avisar a linha e não enviar o campo.
 */
export function parseStrictBooleanCell(raw: unknown): boolean | undefined {
  const valor = String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (SIM_ESTRITO.includes(valor)) return true;
  if (NAO_ESTRITO.includes(valor)) return false;
  return undefined;
}
