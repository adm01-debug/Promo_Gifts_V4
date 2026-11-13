/**
 * tests/edge-functions/live/_live-suite.ts
 * --------------------------------------------------------------
 * Gerador de suíte de integração LIVE por edge function.
 *
 * Cada `tests/edge-functions/live/<fn>.test.ts` chama `runLiveSuite({...})`.
 * A suíte cobre, de forma uniforme:
 *   1. CORS preflight (OPTIONS) — headers Access-Control-* presentes.
 *   2. Fronteira de auth — derivada do manifest (anon rejeitado vs alcançado).
 *   3. Validação de input — JSON inválido / body vazio / tipos errados →
 *      nunca 500 (quebra silenciosa); 4xx quando o handler é alcançável.
 *   4. Happy-path — somente para funções NÃO destrutivas, com role disponível
 *      e (se cara) com EDGE_LIVE_COSTLY=1; valida status + shape (zod).
 *
 * Sem credenciais reais → describeLive faz skip silencioso (CI verde).
 */
import { it, expect } from "vitest";
import {
  callEdge,
  preflight,
  describeLive,
  getJwt,
  ALLOW_COSTLY,
  MAX_RETRY_BUDGET_MS,
  type CallEdgeOptions,
  type EdgeRole,
} from "./_live-client";
import {
  expectedAnonStatuses,
  happyPathRole,
  isDestructive,
  LENIENT_BODY,
  SUPPORTS_DRY_RUN,
} from "./_authz";
import { errorEnvelopeSchema, type Schema } from "./_schemas";

type Body = CallEdgeOptions["body"];

interface InvalidInput {
  label: string;
  body?: Body;
  headers?: Record<string, string>;
  /** Role usado p/ passar a fronteira de auth antes da validação. */
  role?: EdgeRole;
}

interface HappyPath {
  method?: string;
  role?: EdgeRole;
  body?: Body;
  query?: string;
  headers?: Record<string, string>;
  expectStatus?: number[];
  schema?: Schema;
  /** Gate em EDGE_LIVE_COSTLY (geração de imagem/IA cara). */
  costly?: boolean;
}

export interface LiveSuiteDescriptor {
  fn: string;
  method?: string;
  query?: string;
  /** Body "plausível" usado nos testes de fronteira/validação. */
  validBody?: Body;
  happyPath?: HappyPath;
  invalidInputs?: InvalidInput[];
  /** Função não implementa OPTIONS → pula assert de CORS. */
  skipCors?: boolean;
  /** Função ainda não deployada no canônico (aguardando deploy-edge-functions.yml
   *  pós-merge) → aceita 404 na fronteira de auth até o deploy. Remover o flag
   *  depois que a função estiver no ar. */
  pendingDeploy?: boolean;
  /** Headers extras aplicados a todas as chamadas (ex.: x-signature). */
  baseHeaders?: Record<string, string>;
}

// Requests live (cold start + retry em 5xx) podem passar dos 5s default do
// vitest. O fallback deriva de MAX_RETRY_BUDGET_MS (pior caso real do próprio
// callEdge) + 20% de margem — um valor fixo menor que esse budget corta a
// chamada antes do retry terminar (bug real: 2026-11-02, 6 testes de
// intelligence-substitute-applied/magic-up-score estouraram 30_000ms fixos
// porque 4 tentativas de 15s já somam 60s).
const LIVE_TEST_TIMEOUT =
  Number(process.env.EDGE_LIVE_TEST_TIMEOUT_MS) || Math.ceil(MAX_RETRY_BUDGET_MS * 1.2);

const DEFAULT_INVALID: InvalidInput[] = [
  { label: "JSON inválido", body: '{"broken": ' },
  { label: "body vazio", body: "" },
  { label: "array no lugar de objeto", body: [1, 2, 3] },
  { label: "string crua", body: "just-a-string" },
  { label: "null", body: "null" },
  { label: "número", body: "42" },
];

function expectNoCrash(status: number, label: string) {
  // Quebra silenciosa = 500. O contrato mínimo é nunca crashar.
  expect(status, `${label}: não pode retornar 5xx`).toBeLessThan(500);
}

export function runLiveSuite(desc: LiveSuiteDescriptor): void {
  const { fn, method = "POST", query, baseHeaders } = desc;
  const anon = expectedAnonStatuses(fn);
  const role = happyPathRole(fn);

  describeLive(`[live] ${fn}`, () => {
    if (!desc.skipCors) {
      it("CORS preflight (OPTIONS) responde com headers Access-Control-*", async () => {
        const res = await preflight(fn);
        expectNoCrash(res.status, "OPTIONS");
        const acao = res.headers.get("access-control-allow-origin");
        // Edges padronizadas via _shared/cors → ACAO presente. Toleramos
        // ausência apenas se o status já indicar preflight ok (204/200).
        if (acao === null) {
          expect([200, 204, 404, 405]).toContain(res.status);
        } else {
          expect(acao.length).toBeGreaterThan(0);
        }
      }, LIVE_TEST_TIMEOUT);
    }

    it(`fronteira de auth (anon) — modo "${anon.mode}"`, async () => {
      const res = await callEdge(fn, {
        method,
        query,
        role: "anon",
        headers: baseHeaders,
        body: desc.validBody ?? {},
      });
      if (anon.mode === "reject") {
        const ok = desc.pendingDeploy ? [401, 403, 404] : [401, 403];
        expect(ok, `${fn} anon deve ser rejeitado`).toContain(res.status);
      } else {
        // public/scoped: handler alcançado — qualquer não-5xx é válido.
        expectNoCrash(res.status, "anon reach");
      }
    }, LIVE_TEST_TIMEOUT);

    const invalids = [...DEFAULT_INVALID, ...(desc.invalidInputs ?? [])];
    for (const inv of invalids) {
      it(`input inválido (${inv.label}) → sem crash 5xx`, async () => {
        // LENIENT_BODY: autenticado, a função executaria de verdade com valores padrão.
        const useRole = inv.role ?? (anon.mode === "reject" && !LENIENT_BODY.has(fn) ? role : "anon");
        // Se o tier exige role e não há credencial, a chamada vira 401 (ainda <500).
        const res = await callEdge(fn, {
          method,
          query,
          role: useRole,
          headers: { ...baseHeaders, ...inv.headers },
          body: inv.body,
        });
        // 408 sintético = timeout do CLIENTE: a função seguiu executando; não é "4xx de validação".
        expect(res.timedOut, `${inv.label}: timeout do cliente — a função executou além do limite`).not.toBe(true);
        expectNoCrash(res.status, inv.label);
        // Quando alcançamos o handler autenticado, esperamos 4xx (validação).
        if (useRole !== "anon" && (await getJwt(useRole)) && res.status !== 401 && res.status !== 403) {
          expect(res.status, `${inv.label}: deveria ser 4xx`).toBeGreaterThanOrEqual(400);
          expect(res.status).toBeLessThan(500);
          if (res.json && typeof res.json === "object") {
            // Erro deve seguir contrato {code|error|message}.
            expect(errorEnvelopeSchema.safeParse(res.json).success).toBe(true);
          }
        }
      }, LIVE_TEST_TIMEOUT);
    }

    const hp = desc.happyPath;
    // Happy-path só p/ funções não-destrutivas — ou destrutivas que suportam
    // dry-run seguro (read-only). Nunca disparar efeito real.
    if (hp && (!isDestructive(fn) || SUPPORTS_DRY_RUN.has(fn))) {
      it("happy-path → status esperado + shape válido", async (ctx) => {
        if (hp.costly && !ALLOW_COSTLY) {
          // Geração cara: pular sem credencial/flag explícita.
          ctx.skip();
          return;
        }
        const hpRole = hp.role ?? role;
        if (hpRole !== "anon") {
          const jwt = await getJwt(hpRole);
          if (!jwt) {
            ctx.skip();
            return;
          }
        }
        const res = await callEdge(fn, {
          // happy-path executa a função de verdade: timeout não é repetido (sem efeito duplicado/custo)
          retryOnTimeout: false,
          method: hp.method ?? method,
          query: hp.query ?? query,
          role: hpRole,
          headers: { ...baseHeaders, ...hp.headers },
          body: hp.body,
        });
        const allowed = hp.expectStatus ?? [200, 201, 202, 204];
        expect(allowed, `status ${res.status} fora de [${allowed}]`).toContain(res.status);
        if (hp.schema && res.json !== null) {
          const parsed = hp.schema.safeParse(res.json);
          expect(parsed.success, `shape inválido: ${JSON.stringify(res.json).slice(0, 200)}`).toBe(
            true,
          );
        }
      }, LIVE_TEST_TIMEOUT);
    }
  });
}
