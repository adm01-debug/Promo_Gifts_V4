// Historical pure contracts recovered from 10d607a47^ (before decommission #557).
// Used by preserved unit tests only; index.ts still returns 410 and imports none of this code.

type FilterQuery = { [method: string]: (...args: unknown[]) => FilterQuery };

class InvalidFilterError extends Error {
  field: string;
  reason: string;
  receivedType: string;
  constructor(field: string, reason: string, receivedType: string) {
    super(`Invalid filter on field "${field}": ${reason}`);
    this.name = 'InvalidFilterError';
    this.field = field;
    this.reason = reason;
    this.receivedType = receivedType;
  }
}

/** Escapa metacaracteres do LIKE (%, _ e a própria barra) — mesmo helper do crm-db-bridge. */
export function escapeLikePattern(term: string): string {
  return term.replace(/[%_\\]/g, (c) => `\\${c}`);
}

/**
 * Valor para dentro de `.or()` do PostgREST: entre aspas duplas, com `"` e `\` escapados.
 * Sem aspas, vírgula/parênteses/ponto no termo de busca injetariam condições extras no filtro.
 */
export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/["\\]/g, (c) => `\\${c}`)}"`;
}

export function applyFilters(
  query: FilterQuery,
  filters: Record<string, unknown>,
  categoryDescendants: string[] | null,
) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (key === '_search' && typeof value === 'string') {
      const pattern = quotePostgrestValue(`%${escapeLikePattern(value)}%`);
      query = query.or(['name', 'sku', 'supplier_reference', 'brand', 'description'].map((col) => `${col}.ilike.${pattern}`).join(','));
      return;
    }

    // Name prefix search: matches products whose name STARTS with the term (case insensitive)
    if (key === '_name_prefix' && typeof value === 'string') {
      query = query.ilike('name', `${escapeLikePattern(value)}%`);
      return;
    }

    if (categoryDescendants && (key === 'category_id' || key === 'main_category_id')) {
      query = query.in(key, categoryDescendants);
      return;
    }

    // Suffix-based operator promotion: foo_gte → .gte('foo', val), foo_isnull → .is('foo', null|not.null)
    const suffixMatch = key.match(/^(.+)_(gte|lte|gt|lt|neq|like|ilike|isnull|notnull)$/);
    if (suffixMatch) {
      const [, col, op] = suffixMatch;
      if (op === 'isnull') { query = query.is(col, null); return; }
      if (op === 'notnull') { query = query.not(col, 'is', null); return; }
      query = query[op](col, value);
      return;
    }

    // Detect unknown suffix-style keys early (e.g. foo_isnotnull, foo_between) and log clearly.
    const unknownSuffix = key.match(/^(.+)_([a-z]+)$/);
    if (unknownSuffix && !['category', 'main', 'sub', 'group', 'price', 'created', 'updated', 'product', 'supplier', 'color', 'image'].includes(unknownSuffix[2])) {
      // Heuristic: if the suffix looks like an operator attempt but isn't whitelisted, warn but still try equality.
      const knownOps = ['gte','lte','gt','lt','neq','like','ilike','isnull','notnull','eq','in'];
      if (knownOps.some(op => unknownSuffix[2].includes(op)) && !knownOps.includes(unknownSuffix[2])) {
        console.warn(`[external-db-bridge] Unknown filter operator suffix "_${unknownSuffix[2]}" for key "${key}". Supported: ${knownOps.join(', ')}. Falling back to equality.`);
      }
    }

    if (typeof value === 'string') {
      // Support PostgREST-style is.null / not.is.null (and common variants)
      const nullVariants = ['is.null', 'isnull', 'null'];
      const notNullVariants = ['not.is.null', 'is.not.null', 'notnull', 'not.null'];
      if (nullVariants.includes(value)) { query = query.is(key, null); return; }
      if (notNullVariants.includes(value)) { query = query.not(key, 'is', null); return; }

      // Support PostgREST-style in.(val1,val2,...) operator
      const inMatch = value.match(/^in\.\((.+)\)$/);
      if (inMatch) {
        const vals = inMatch[1].split(',').map(v => v.trim());
        query = query.in(key, vals);
        return;
      }

      // Support PostgREST-style comparison operators: gte., lte., gt., lt., neq., like., ilike.
      const operatorMatch = value.match(/^(gte|lte|gt|lt|neq|like|ilike)\.(.+)$/);
      if (operatorMatch) {
        const [, op, val] = operatorMatch;
        query = query[op](key, val);
        return;
      }

      // Detect unrecognized PostgREST-style "op.value" attempts and log clearly.
      const looksLikeOperator = value.match(/^([a-z]+(?:\.[a-z]+)?)\.(.+)$/);
      if (looksLikeOperator) {
        const attemptedOp = looksLikeOperator[1];
        const knownStringOps = ['is.null','not.is.null','is.not.null','in','gte','lte','gt','lt','neq','like','ilike'];
        if (!knownStringOps.includes(attemptedOp)) {
          console.warn(`[external-db-bridge] Unknown PostgREST-style operator "${attemptedOp}" in value for key "${key}". Supported: ${knownStringOps.join(', ')}. Treating as literal equality.`);
        }
      }

      if (['name', 'description', 'title', 'razao_social', 'nome_fantasia', 'nome', 'descricao'].includes(key)) {
        query = query.ilike(key, `%${value}%`);
      } else {
        query = query.eq(key, value);
      }
    } else if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (typeof value === 'object') {
      // Defense-in-depth: validateFilters() should have caught this earlier and returned 400.
      // If we reach here (e.g. internal call site bypassed validation), refuse loudly instead of silently dropping.
      throw new InvalidFilterError(
        key,
        'filter value must be a primitive (string, number, boolean) — received a raw object. Use suffix promotion (e.g. `${key}_gte`) or a PostgREST string operator (e.g. "gte.10", "is.null").',
        'object',
      );
    } else {
      query = query.eq(key, value);
    }
  });
  return query;
}
