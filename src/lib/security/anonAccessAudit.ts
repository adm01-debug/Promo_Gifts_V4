/**
 * anonAccessAudit — regras puras da aba "Raio-x do acesso `anon`".
 *
 * Consome `fn_admin_anon_access_audit()` (migration 20261126192900), wrapper
 * admin do diagnostico `public.fn_anon_access_audit()`. O diagnostico responde
 * quatro perguntas estruturais, uma por categoria:
 *   RLS_SEM_POLICY             — tabela com RLS ligada e zero policy (todos recebem 0 rows)
 *   FUNC_SEM_EXECUTE_ANON      — funcao usada em policy PUBLIC sem EXECUTE para anon (HTTP 500)
 *   VIEW_SENSIVEL_ANON         — view interna com SELECT para anon (potencial data leak)
 *   BADGE_TABLE_SEM_ANON_GRANT — tabela de badge/count sem SELECT para anon (HTTP 403)
 * Zero linhas = ambiente saudavel.
 */

export interface AnonAccessRow {
  categoria: string;
  objeto: string;
  anonGrant: boolean;
  authGrant: boolean;
  severidade: string;
  descricao: string;
}

export interface AnonAccessGroup {
  categoria: string;
  label: string;
  severidade: string;
  descricao: string;
  objetos: string[];
}

export interface AnonAccessSummary {
  total: number;
  criticos: number;
  altos: number;
  informativos: number;
  categorias: number;
}

export const CATEGORIA_LABEL: Record<string, string> = {
  RLS_SEM_POLICY: 'RLS ativa sem nenhuma policy',
  FUNC_SEM_EXECUTE_ANON: 'Função em policy sem EXECUTE para anon',
  VIEW_SENSIVEL_ANON: 'View sensível exposta a anon',
  BADGE_TABLE_SEM_ANON_GRANT: 'Tabela de badge sem grant para anon',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function parseAnonAccessRows(data: unknown): AnonAccessRow[] {
  if (!Array.isArray(data)) return [];
  const rows: AnonAccessRow[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const objeto = asText(item.objeto).trim();
    if (!objeto) continue;
    rows.push({
      categoria: asText(item.categoria) || 'SEM_CATEGORIA',
      objeto,
      anonGrant: item.anon_grant === true,
      authGrant: item.auth_grant === true,
      severidade: (asText(item.severidade) || 'INFO').toUpperCase(),
      descricao: asText(item.descricao),
    });
  }
  return rows;
}

export function categoriaLabel(categoria: string): string {
  const label = CATEGORIA_LABEL[categoria];
  if (label) return label;
  return categoria.replace(/_/g, ' ').toLowerCase();
}

const PESO: Record<string, number> = { CRITICAL: 3, HIGH: 2, INFO: 1 };

export function severidadeRank(severidade: string): number {
  return PESO[severidade.toUpperCase()] ?? 0;
}

export function severidadeLabel(severidade: string): string {
  const chave = severidade.toUpperCase();
  if (chave === 'CRITICAL') return 'Crítico';
  if (chave === 'HIGH') return 'Alto';
  if (chave === 'INFO') return 'Informativo';
  return severidade;
}

export function ordenarAnonAccess(rows: AnonAccessRow[]): AnonAccessRow[] {
  return [...rows].sort((a, b) => {
    const diff = severidadeRank(b.severidade) - severidadeRank(a.severidade);
    if (diff !== 0) return diff;
    return a.objeto.localeCompare(b.objeto);
  });
}

export function agruparPorCategoria(rows: AnonAccessRow[]): AnonAccessGroup[] {
  const mapa = new Map<string, AnonAccessGroup>();
  for (const row of ordenarAnonAccess(rows)) {
    const grupo = mapa.get(row.categoria) ?? {
      categoria: row.categoria,
      label: categoriaLabel(row.categoria),
      severidade: row.severidade,
      descricao: row.descricao,
      objetos: [],
    };
    if (severidadeRank(row.severidade) > severidadeRank(grupo.severidade)) {
      grupo.severidade = row.severidade;
      grupo.descricao = row.descricao;
    }
    if (!grupo.descricao) grupo.descricao = row.descricao;
    if (!grupo.objetos.includes(row.objeto)) grupo.objetos.push(row.objeto);
    mapa.set(row.categoria, grupo);
  }
  return [...mapa.values()]
    .map((grupo) => ({ ...grupo, objetos: [...grupo.objetos].sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => {
      const diff = severidadeRank(b.severidade) - severidadeRank(a.severidade);
      if (diff !== 0) return diff;
      return a.label.localeCompare(b.label);
    });
}

export function resumirAnonAccess(rows: AnonAccessRow[]): AnonAccessSummary {
  const resumo: AnonAccessSummary = {
    total: rows.length,
    criticos: 0,
    altos: 0,
    informativos: 0,
    categorias: new Set(rows.map((r) => r.categoria)).size,
  };
  for (const row of rows) {
    const rank = severidadeRank(row.severidade);
    if (rank >= 3) resumo.criticos += 1;
    else if (rank === 2) resumo.altos += 1;
    else resumo.informativos += 1;
  }
  return resumo;
}

export function describeAnonAccessError(error: unknown): string {
  const bruto =
    error instanceof Error ? error.message : isRecord(error) ? asText(error.message) : '';
  const texto = bruto.toLowerCase();

  if (texto.includes('42501') || texto.includes('restrito a administradores')) {
    return 'Sua conta não tem permissão de administrador para ver esta auditoria.';
  }
  if (texto.includes('autenticacao obrigatoria') || texto.includes('autenticação obrigatória')) {
    return 'Sessão expirada. Entre novamente para rodar a auditoria.';
  }
  if (texto.includes('pgrst202') || texto.includes('could not find the function')) {
    return 'A auditoria ainda não está publicada no banco (migration 20261126192900).';
  }
  if (bruto) return `Não foi possível rodar a auditoria: ${bruto}`;
  return 'Não foi possível rodar a auditoria. Tente novamente.';
}
