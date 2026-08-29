/**
 * degradationSink — persistência cross-sessão dos eventos de degradação.
 *
 * O `degradationRegistry` é in-memory + `sessionStorage`: some quando o operador
 * fecha a aba, e nunca chega a quem opera o sistema. Este sink espelha os mesmos
 * eventos em `frontend_telemetry` (tabela já existente, consumida por
 * `/admin/telemetria`), permitindo visão cross-sessão e histórica.
 *
 * Risco controlado: um bloco com RLS negado degrada a CADA refetch do TanStack
 * Query. Sem throttle isso vira centenas de INSERTs/min. Por isso:
 *  - cooldown por chave (`scope|reason`): no máximo 1 evento por janela;
 *  - teto global por sessão (defesa contra fan-out de muitos escopos);
 *  - o evento emitido carrega `count`, cobrindo TODAS as ocorrências suprimidas
 *    desde a emissão anterior (nenhuma degradação some da contabilidade).
 *
 * Invariantes provadas em `scripts/simulate-degradation-sink.mjs`
 * (700 cenários, 217k asserções).
 */
import { telemetryService } from '@/services/telemetryService';
import type { DegradationReason } from '@/lib/intelligence/degradation';

export interface ThrottleDecision {
  emit: boolean;
  /** Motivo da supressão, ou origem da emissão. */
  reason: 'cap' | 'cooldown' | 'first' | 'window';
  /** Quantas ocorrências a emissão representa (0 quando suprimida). */
  count: number;
}

export interface DegradationThrottleOptions {
  cooldownMs?: number;
  maxEvents?: number;
}

/** Janela padrão: 1 evento por bloco/motivo por minuto. */
export const DEFAULT_COOLDOWN_MS = 60_000;
/** Teto por sessão — evita fan-out em incidentes amplos (ex.: JWT expirado). */
export const DEFAULT_MAX_EVENTS = 50;

interface Entry {
  at: number;
  pending: number;
}

/** Fábrica pura e testável do throttle (sem I/O, sem relógio implícito). */
export function createDegradationThrottle(options: DegradationThrottleOptions = {}) {
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
  const last = new Map<string, Entry>();
  let emitted = 0;

  return {
    offer(key: string, now: number): ThrottleDecision {
      const entry = last.get(key);
      if (!entry) {
        if (emitted >= maxEvents) return { emit: false, reason: 'cap', count: 0 };
        last.set(key, { at: now, pending: 0 });
        emitted += 1;
        return { emit: true, reason: 'first', count: 1 };
      }
      if (now - entry.at < cooldownMs) {
        entry.pending += 1;
        return { emit: false, reason: 'cooldown', count: 0 };
      }
      if (emitted >= maxEvents) {
        entry.pending += 1;
        return { emit: false, reason: 'cap', count: 0 };
      }
      const count = entry.pending + 1;
      entry.at = now;
      entry.pending = 0;
      emitted += 1;
      return { emit: true, reason: 'window', count };
    },
    get emitted(): number {
      return emitted;
    },
    reset(): void {
      last.clear();
      emitted = 0;
    },
  };
}

let throttle = createDegradationThrottle();

export interface DegradationSinkInput {
  scope: string;
  reason: DegradationReason;
  code: string | null;
  at?: number;
}

/**
 * Espelha a degradação em `frontend_telemetry` (best-effort, nunca lança).
 * O `telemetryService` já faz batching/sampling e resolve o client do Supabase
 * de forma preguiçosa, então o import estático não pesa no bundle crítico.
 */
export function sinkDegradation(input: DegradationSinkInput): ThrottleDecision {
  const now = typeof input.at === 'number' && Number.isFinite(input.at) ? input.at : Date.now();
  const key = `${input.scope}\u0000${input.reason}`;
  const decision = throttle.offer(key, now);
  if (!decision.emit) return decision;

  try {
    telemetryService.log({
      event_type: 'api_fail',
      name: 'intelligence_block_degraded',
      metadata: {
        scope: input.scope,
        reason: input.reason,
        code: input.code,
        occurrences: decision.count,
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      },
    });
  } catch {
    // Telemetria jamais pode quebrar a rota que já está degradada.
  }

  return decision;
}

/** Isolamento entre testes. */
function resetDegradationSinkForTests(): void {
  throttle = createDegradationThrottle();
}

export { resetDegradationSinkForTests as __resetDegradationSink };
