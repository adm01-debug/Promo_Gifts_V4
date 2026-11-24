/**
 * Colunas de `print_area_techniques` que podem ser lidas no cliente.
 *
 * A tabela tem GRANT por COLUNA para `anon` (migration 20261124163000 revogou
 * `unit_cost`), e `dbInvoke` resolve `print_area_techniques` para
 * `v_print_area_techniques_public` (GOLD_READ_ALIASES), view cuja projecao tem
 * exatamente estas 15 colunas — sem custo e sem `production_days`.
 *
 * `select=*` na TABELA responde 401/42501 para `anon` (grant por coluna) e
 * `select` com coluna fora da projecao da VIEW responde 400/42703; nos dois casos
 * a leitura cai para `[]` sem erro visivel. Por isso a lista e unica e
 * compartilhada: qualquer coluna nova exige alterar a view e este modulo juntos.
 */
const COLUMNS = [
  'id',
  'product_id',
  'tabela_preco_id',
  'location_code',
  'location_name',
  'location_order',
  'max_width',
  'max_height',
  'is_curved',
  'shape',
  'technique_order',
  'is_active',
  'notes',
  'created_at',
  'updated_at',
] as const;

/** Lista pronta para `select=` do PostgREST. */
export const PRINT_AREA_PUBLIC_COLUMNS = COLUMNS.join(',');
