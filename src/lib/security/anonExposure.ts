/**
 * anonExposure — regras puras da aba "Exposição anon" de /admin/seguranca-acesso.
 *
 * Fonte dos dados (tudo já existe em produção, sem DDL nova):
 *   • `public.fn_verify_anon_catalog_grants()` — tripwire anti-regressão v5 do
 *     contrato de leitura do `anon`: devolve uma linha por objeto fora do
 *     contrato (0 linhas = saudável). EXECUTE para `authenticated`.
 *   • `public.fn_anon_catalog_grant_audit_run()` — roda o tripwire, grava o
 *     snapshot em `public.anon_catalog_grant_audit_log` e devolve a contagem.
 *   • `public.anon_catalog_grant_audit_log` — histórico dos snapshots, com a
 *     policy `anon_catalog_grant_audit_log_admin_read` (só admin lê).
 *
 * Nada aqui toca o banco nem o React: são funções puras, testáveis isoladas.
 */

export interface AnonViolation {
  objectName: string;
  objectKind: string;
  issue: string;
}

export interface AnonAuditSnapshot {
  id: number;
  checkedAt: string;
  violationCount: number;
  violations: AnonViolation[];
}

export interface AnonExposureGroup {
  kind: string;
  label: string;
  total: number;
  objetos: string[];
  issues: string[];
}

export interface AnonExposureSummary {
  saudavel: boolean;
  violacoesAtuais: number;
  objetosDistintos: number;
  tiposDeObjeto: number;
  snapshots: number;
  piorContagem: number;
  ultimaVerificacao: string | null;
  variacao: number | null;
}

export const ANON_EXPOSURE_SEM_DADOS: AnonExposureSummary = {
  saudavel: true,
  violacoesAtuais: 0,
  objetosDistintos: 0,
  tiposDeObjeto: 0,
  snapshots: 0,
  piorContagem: 0,
  ultimaVerificacao: null,
  variacao: null,
};

const KIND_LABELS: Record<string, string> = {
  view: 'View',
  matview: 'Materialized view',
  table: 'Tabela',
  function: 'Função',
  policy: 'Policy',
  rls: 'RLS',
  column: 'Coluna',
  sequence: 'Sequence',
};

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

/** Normaliza uma linha crua do tripwire (jsonb ou retorno da RPC). */
export function normalizarViolacao(valor: unknown): AnonViolation | null {
  if (!ehRegistro(valor)) return null;
  const objeto = texto(valor.object_name);
  const tipo = texto(valor.object_kind);
  const problema = texto(valor.issue);
  if (!objeto || !tipo || !problema) return null;
  return { objectName: objeto, objectKind: tipo, issue: problema };
}

/** Aceita o `violations` jsonb do snapshot (ou o array da própria RPC). */
export function normalizarViolacoes(valor: unknown): AnonViolation[] {
  if (!Array.isArray(valor)) return [];
  const normalizadas: AnonViolation[] = [];
  for (const item of valor) {
    const violacao = normalizarViolacao(item);
    if (violacao) normalizadas.push(violacao);
  }
  return normalizadas;
}

export function rotuloTipoObjeto(kind: string): string {
  return KIND_LABELS[kind.toLowerCase()] ?? kind;
}

/** Agrupa por `object_kind`, do maior para o menor; empate pelo rótulo. */
export function agruparViolacoes(violations: AnonViolation[]): AnonExposureGroup[] {
  const mapa = new Map<string, AnonExposureGroup>();
  for (const violacao of violations) {
    const atual = mapa.get(violacao.objectKind) ?? {
      kind: violacao.objectKind,
      label: rotuloTipoObjeto(violacao.objectKind),
      total: 0,
      objetos: [],
      issues: [],
    };
    atual.total += 1;
    if (!atual.objetos.includes(violacao.objectName)) atual.objetos.push(violacao.objectName);
    if (!atual.issues.includes(violacao.issue)) atual.issues.push(violacao.issue);
    mapa.set(violacao.objectKind, atual);
  }
  return [...mapa.values()].sort(
    (a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'),
  );
}

export function filtrarViolacoes(violations: AnonViolation[], termo: string): AnonViolation[] {
  const busca = termo.trim().toLowerCase();
  if (busca === '') return violations;
  return violations.filter(
    (violacao) =>
      violacao.objectName.toLowerCase().includes(busca) ||
      violacao.objectKind.toLowerCase().includes(busca) ||
      violacao.issue.toLowerCase().includes(busca),
  );
}

/** Mais recente primeiro; data inválida vai para o fim (desempate pelo id). */
export function ordenarSnapshots(snapshots: AnonAuditSnapshot[]): AnonAuditSnapshot[] {
  return [...snapshots].sort((a, b) => {
    const tempoA = Date.parse(a.checkedAt);
    const tempoB = Date.parse(b.checkedAt);
    if (Number.isNaN(tempoA) && Number.isNaN(tempoB)) return b.id - a.id;
    if (Number.isNaN(tempoA)) return 1;
    if (Number.isNaN(tempoB)) return -1;
    return tempoB - tempoA;
  });
}

export interface AnonSnapshotVariacao {
  snapshot: AnonAuditSnapshot;
  variacao: number | null;
}

/** Variação de cada snapshot contra a verificação imediatamente anterior. */
export function variacoesPorSnapshot(snapshots: AnonAuditSnapshot[]): AnonSnapshotVariacao[] {
  const cronologico = [...ordenarSnapshots(snapshots)].reverse();
  const saida: AnonSnapshotVariacao[] = [];
  let anterior: number | null = null;
  for (const snapshot of cronologico) {
    saida.push({
      snapshot,
      variacao: anterior === null ? null : snapshot.violationCount - anterior,
    });
    anterior = snapshot.violationCount;
  }
  return saida.reverse();
}

export function descreverVariacao(variacao: number | null): string {
  if (variacao === null) return 'Primeira verificação registrada';
  if (variacao === 0) return 'Sem mudança desde a verificação anterior';
  if (variacao > 0) return `${variacao} nova(s) violação(ões) desde a verificação anterior`;
  return `${Math.abs(variacao)} violação(ões) resolvida(s) desde a verificação anterior`;
}

export function descreverExecucao(violationCount: number): string {
  return violationCount === 0
    ? 'Nenhuma violação: o contrato de leitura do anon está intacto.'
    : `${violationCount} objeto(s) fora do contrato de leitura do anon.`;
}

export function resumirExposicao(snapshots: AnonAuditSnapshot[]): AnonExposureSummary {
  const ordenados = ordenarSnapshots(snapshots);
  const atual = ordenados.at(0);
  if (!atual) return { ...ANON_EXPOSURE_SEM_DADOS };

  const anterior = ordenados.at(1) ?? null;
  const grupos = agruparViolacoes(atual.violations);
  return {
    saudavel: atual.violationCount === 0,
    violacoesAtuais: atual.violationCount,
    objetosDistintos: grupos.reduce((total, grupo) => total + grupo.objetos.length, 0),
    tiposDeObjeto: grupos.length,
    snapshots: ordenados.length,
    piorContagem: ordenados.reduce(
      (pior, snapshot) => (snapshot.violationCount > pior ? snapshot.violationCount : pior),
      0,
    ),
    ultimaVerificacao: atual.checkedAt,
    variacao: anterior ? atual.violationCount - anterior.violationCount : null,
  };
}
