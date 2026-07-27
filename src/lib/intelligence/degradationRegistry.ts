/**
 * degradationRegistry — coletor in-memory dos eventos `intelligence_block_degraded`.
 *
 * Motivação: `degradeOrThrow()` já registra a degradação no logger estruturado,
 * mas em produção o logger só escreve erros. Sem um coletor, o operador não tem
 * como saber QUAIS blocos de `/inteligencia-comercial`, `/estoque` e `/trends`
 * estão degradando (RLS negado, relação ausente, quota) — a rota "parece" ok.
 *
 * Este módulo é um store externo minimalista (padrão `useSyncExternalStore`):
 * - ring buffer com capacidade fixa (não cresce indefinidamente em sessões longas);
 * - persistência best-effort em `sessionStorage` (sobrevive a reload/HMR, não vaza
 *   entre abas nem entre sessões);
 * - snapshot imutável e estável por referência (evita loop de render no React).
 *
 * Não há PII: apenas `scope` (identificador estático do bloco), `reason`,
 * `code` do PostgREST/Postgres e timestamp.
 */
import type { DegradationReason } from '@/lib/intelligence/degradation';

export interface DegradationEvent {
  /** Identificador estável do bloco, ex.: `segments.orders`. */
  scope: string;
  /** Classificação já normalizada pelo `classifyDegradable`. */
  reason: DegradationReason;
  /** Código bruto (Postgres/PostgREST) quando disponível. */
  code: string | null;
  /** Epoch ms do registro. */
  at: number;
}

export interface DegradationAggregate {
  scope: string;
  reason: DegradationReason;
  count: number;
  lastAt: number;
  codes: string[];
}

/** Capacidade do ring buffer. Suficiente para uma sessão de auditoria. */
export const DEGRADATION_LOG_CAP = 200;

const STORAGE_KEY = 'intel_degradation_log_v1';

let snapshot: readonly DegradationEvent[] = [];
const listeners = new Set<() => void>();

function isValidEvent(value: unknown): value is DegradationEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as Partial<DegradationEvent>;
  return (
    typeof e.scope === 'string' &&
    e.scope.length > 0 &&
    typeof e.reason === 'string' &&
    (typeof e.code === 'string' || e.code === null) &&
    typeof e.at === 'number' &&
    Number.isFinite(e.at)
  );
}

function safeSessionStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const s = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    // Acesso pode lançar em iframes com storage bloqueado.
    return s ?? null;
  } catch {
    return null;
  }
}

function persist(): void {
  const store = safeSessionStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // QuotaExceeded / modo privado — telemetria nunca deve quebrar a aplicação.
  }
}

/** Restaura eventos persistidos. Idempotente e tolerante a payload corrompido. */
export function hydrateDegradationLog(): void {
  const store = safeSessionStorage();
  if (!store) return;
  let raw: string | null = null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const valid = parsed.filter(isValidEvent).slice(-DEGRADATION_LOG_CAP);
    if (valid.length === 0) return;
    snapshot = Object.freeze(valid);
    emit();
  } catch {
    // JSON inválido: descarta silenciosamente.
  }
}

function emit(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Um listener defeituoso não pode impedir os demais.
    }
  }
}

/** Registra uma degradação. Chamado por `degradeOrThrow`. */
export function recordDegradation(event: Omit<DegradationEvent, 'at'> & { at?: number }): void {
  const normalized: DegradationEvent = {
    scope: event.scope,
    reason: event.reason,
    code: event.code ?? null,
    at: typeof event.at === 'number' && Number.isFinite(event.at) ? event.at : Date.now(),
  };
  if (!isValidEvent(normalized)) return;

  const next = snapshot.concat(normalized);
  snapshot = Object.freeze(
    next.length > DEGRADATION_LOG_CAP ? next.slice(next.length - DEGRADATION_LOG_CAP) : next,
  );
  persist();
  emit();
}

/** Snapshot estável (mesma referência enquanto não houver novo evento). */
export function getDegradationLog(): readonly DegradationEvent[] {
  return snapshot;
}

/** Assina mudanças. Retorna o unsubscribe. */
export function subscribeDegradationLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Limpa o log (botão do painel e isolamento entre testes). */
export function clearDegradationLog(): void {
  snapshot = Object.freeze([]);
  const store = safeSessionStorage();
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  emit();
}

/**
 * Agrega por `scope + reason`, ordenado por ocorrências (desc) e, em empate,
 * pelo evento mais recente. Puro — usado pelo painel e pelas simulações.
 */
export function aggregateDegradations(
  events: readonly DegradationEvent[],
): DegradationAggregate[] {
  const map = new Map<string, DegradationAggregate>();
  for (const e of events) {
    const key = `${e.scope}\u0000${e.reason}`;
    const current = map.get(key);
    if (current) {
      current.count += 1;
      if (e.at > current.lastAt) current.lastAt = e.at;
      if (e.code && !current.codes.includes(e.code)) current.codes.push(e.code);
    } else {
      map.set(key, {
        scope: e.scope,
        reason: e.reason,
        count: 1,
        lastAt: e.at,
        codes: e.code ? [e.code] : [],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}
