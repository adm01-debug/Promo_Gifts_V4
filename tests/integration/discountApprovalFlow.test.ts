/**
 * E2E/Integration test: Discount Approval Workflow
 *
 * Testa o fluxo completo: vendedor solicita > admin aprova/rejeita > notificações.
 *
 * Modos:
 *  1) MOCK (default em CI): valida o contrato das duas RPCs transacionais e
 *     garante que o cliente não duplica as notificações criadas pelo trigger.
 *  2) LIVE (opt-in): se as variáveis de ambiente abaixo estiverem definidas,
 *     o teste executa contra o Supabase real, autenticando dois usuários fixos
 *     criados via painel Auth + a função RPC `seed_discount_test_users`.
 *
 * Para rodar em modo LIVE:
 *   INTEGRATION_TEST_SUPABASE_URL=...
 *   INTEGRATION_TEST_SUPABASE_ANON_KEY=...
 *   INTEGRATION_TEST_SELLER_PASSWORD=...
 *   INTEGRATION_TEST_ADMIN_PASSWORD=...
 *   bunx vitest run tests/integration/discountApprovalFlow.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { renderHookWithProviders } from "../hooks/_helpers/render-hook-providers";

// ─────────────────────────────────────────────────────────────
// Hoisted mock state — accessible inside vi.mock factories
// ─────────────────────────────────────────────────────────────

const H = vi.hoisted(() => {
  const SELLER_ID = "seller-test-uuid";
  const ADMIN_ID = "admin-test-uuid";
  const QUOTE_ID = "quote-test-uuid";
  const REQUEST_ID = "request-test-uuid";

  type Op = {
    table: string;
    method: string;
    payload?: unknown;
    filter?: { col: string; val: unknown };
  };
  const ops: Op[] = [];

  function makeBuilder(table: string, results: Record<string, unknown> = {}) {
    let currentMethod = "select";
    let currentPayload: unknown = undefined;
    let currentFilter: { col: string; val: unknown } | undefined;

    const record = () => {
      ops.push({ table, method: currentMethod, payload: currentPayload, filter: currentFilter });
    };

    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      select: (_cols?: string) => builder,
      insert: (payload: unknown) => {
        currentMethod = "insert";
        currentPayload = payload;
        record();
        return builder;
      },
      update: (payload: unknown) => {
        currentMethod = "update";
        currentPayload = payload;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        currentFilter = { col, val };
        if (currentMethod === "update") record();
        return builder;
      },
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => Promise.resolve({ data: results.single ?? null, error: null }),
      maybeSingle: () => Promise.resolve({ data: results.maybeSingle ?? null, error: null }),
      then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
        const updateError = currentMethod === "update" ? (results.updateError ?? null) : null;
        resolve({ data: results.list ?? [], error: updateError });
      },
    });
    return builder;
  }

  let overrides: Record<string, Record<string, unknown>> = {};

  async function rpcImpl(fn: string, payload: Record<string, unknown>) {
    ops.push({ table: fn, method: "rpc", payload });
    const override = overrides[fn];
    if (override) {
      return { data: override.data ?? null, error: override.error ?? null };
    }
    if (fn === "request_discount_approval_transactional") {
      return {
        data: {
          id: REQUEST_ID,
          quote_id: QUOTE_ID,
          seller_id: SELLER_ID,
          status: "pending",
        },
        error: null,
      };
    }
    if (fn === "respond_discount_approval_transactional") {
      return {
        data: {
          id: REQUEST_ID,
          quote_id: QUOTE_ID,
          seller_id: SELLER_ID,
          status: payload._approved ? "approved" : "rejected",
        },
        error: null,
      };
    }
    return { data: null, error: null };
  }

  function defaultResults(table: string): Record<string, unknown> {
    if (overrides[table]) return overrides[table];
    switch (table) {
      case "discount_approval_requests":
        return {
          single: {
            id: REQUEST_ID,
            quote_id: QUOTE_ID,
            seller_id: SELLER_ID,
            requested_discount_percent: 15,
            max_allowed_percent: 10,
            status: "approved",
          },
        };
      case "user_roles":
        return { list: [{ user_id: ADMIN_ID }] };
      case "profiles":
        return { maybeSingle: { full_name: "Vendedor Teste" } };
      default:
        return {};
    }
  }

  let currentUser: { id: string; email: string } | null = {
    id: SELLER_ID,
    email: "seller-test@discount-approval.test",
  };

  return {
    SELLER_ID, ADMIN_ID, QUOTE_ID, REQUEST_ID,
    ops,
    fromImpl: (table: string) => makeBuilder(table, defaultResults(table)),
    rpcImpl,
    setOverride: (table: string, results: Record<string, unknown>) => {
      overrides[table] = results;
    },
    clearOverrides: () => { overrides = {}; },
    getUser: () => currentUser,
    setUser: (u: { id: string; email: string } | null) => { currentUser = u; },
  };
});

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => H.fromImpl(table),
    rpc: (fn: string, payload: Record<string, unknown>) => H.rpcImpl(fn, payload),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: H.getUser(),
    loading: false,
    isAdmin: H.getUser()?.id === H.ADMIN_ID,
  }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Imports AFTER mocks
import { useDiscountApproval } from "@/hooks/quotes";
import { toast } from "sonner";

const { SELLER_ID, ADMIN_ID, QUOTE_ID, REQUEST_ID, ops } = H;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function setUser(role: "seller" | "admin" | "none") {
  if (role === "none") { H.setUser(null); return; }
  H.setUser(
    role === "seller"
      ? { id: SELLER_ID, email: "seller-test@discount-approval.test" }
      : { id: ADMIN_ID, email: "admin-test@discount-approval.test" }
  );
}

beforeEach(() => {
  ops.length = 0;
  H.clearOverrides();
  vi.clearAllMocks();
  setUser("seller");
});

// ─────────────────────────────────────────────────────────────
// 1. Vendedor solicita aprovação (happy path)
// ─────────────────────────────────────────────────────────────
describe("E2E: Vendedor solicita aprovação de desconto", () => {
  it("delega criação, snapshot, histórico e notificação à RPC transacional", async () => {
    setUser("seller");
    const { result } = renderHookWithProviders(() => useDiscountApproval());

    let success = false;
    await act(async () => {
      success = await result.current.requestApproval(QUOTE_ID, 15, 10, "Cliente VIP");
    });

    expect(success).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Solicitação de aprovação enviada")
    );

    expect(ops).toEqual([{
      table: "request_discount_approval_transactional",
      method: "rpc",
      payload: {
        _quote_id: QUOTE_ID,
        _seller_notes: "Cliente VIP",
      },
    }]);
    expect(ops.some(o => [
      "discount_approval_requests",
      "quotes",
      "quote_history",
      "workspace_notifications",
    ].includes(o.table))).toBe(false);
  });

  it("retorna false se não houver usuário autenticado", async () => {
    setUser("none");
    const { result } = renderHookWithProviders(() => useDiscountApproval());
    let success = true;
    await act(async () => {
      success = await result.current.requestApproval(QUOTE_ID, 15, 10);
    });
    expect(success).toBe(false);
    expect(ops).toEqual([]);
  });

  it("não consulta admins nem escreve notificação diretamente pelo cliente", async () => {
    setUser("seller");
    const { result } = renderHookWithProviders(() => useDiscountApproval());
    await act(async () => {
      await result.current.requestApproval(QUOTE_ID, 15, 10);
    });
    expect(ops.some(o => o.table === "user_roles")).toBe(false);
    expect(ops.some(o => o.table === "workspace_notifications")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Admin aprova
// ─────────────────────────────────────────────────────────────
describe("E2E: Admin aprova solicitação", () => {
  it("delega decisão, quote, histórico e notificação à RPC transacional", async () => {
    setUser("admin");
    const { result } = renderHookWithProviders(() => useDiscountApproval());

    let success = false;
    await act(async () => {
      success = await result.current.respondToApproval(REQUEST_ID, true, "Aprovado");
    });

    expect(success).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Desconto aprovado!");

    expect(ops).toEqual([{
      table: "respond_discount_approval_transactional",
      method: "rpc",
      payload: {
        _request_id: REQUEST_ID,
        _approved: true,
        _admin_notes: "Aprovado",
      },
    }]);
  });

  it("não confirma aprovação se a transação falha", async () => {
    setUser("admin");
    H.setOverride("respond_discount_approval_transactional", {
      error: { code: "40001", message: "transaction failed" },
    });
    const { result } = renderHookWithProviders(() => useDiscountApproval());

    let success = true;
    await act(async () => {
      success = await result.current.respondToApproval(REQUEST_ID, true, "Aprovado");
    });

    expect(success).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "A solicitação mudou durante a decisão. Atualize a fila e tente novamente.",
      { duration: 8000 },
    );
    expect(ops).toHaveLength(1);
    expect(ops[0].table).toBe("respond_discount_approval_transactional");
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Admin rejeita
// ─────────────────────────────────────────────────────────────
describe("E2E: Admin rejeita solicitação", () => {
  it("delega rejeição e notificação ao banco sem escrita duplicada", async () => {
    setUser("admin");

    const { result } = renderHookWithProviders(() => useDiscountApproval());

    let success = false;
    await act(async () => {
      success = await result.current.respondToApproval(REQUEST_ID, false, "Margem insuficiente");
    });

    expect(success).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Desconto rejeitado");

    expect(ops).toEqual([{
      table: "respond_discount_approval_transactional",
      method: "rpc",
      payload: {
        _request_id: REQUEST_ID,
        _approved: false,
        _admin_notes: "Margem insuficiente",
      },
    }]);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. LIVE mode (opcional, contra Supabase real)
// ─────────────────────────────────────────────────────────────

const LIVE_URL = process.env.INTEGRATION_TEST_SUPABASE_URL;
const LIVE_KEY = process.env.INTEGRATION_TEST_SUPABASE_ANON_KEY;
const SELLER_PWD = process.env.INTEGRATION_TEST_SELLER_PASSWORD;
const ADMIN_PWD = process.env.INTEGRATION_TEST_ADMIN_PASSWORD;

const liveDescribe = LIVE_URL && LIVE_KEY && SELLER_PWD && ADMIN_PWD ? describe : describe.skip;

liveDescribe("E2E LIVE: fluxo real contra Supabase", () => {
  it("seed > seller request > admin approve > notification", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(LIVE_URL!, LIVE_KEY!);

    // 1. Login seller
    const sellerLogin = await supa.auth.signInWithPassword({
      email: "seller-test@discount-approval.test",
      password: SELLER_PWD!,
    });
    expect(sellerLogin.error).toBeNull();
    const sellerId = sellerLogin.data.user!.id;

    // 2. Seed roles
    const seedRes = await supa.rpc("seed_discount_test_users");
    expect((seedRes.data as { ok: boolean }).ok).toBe(true);

    // 3. Cleanup
    await supa.rpc("cleanup_discount_test_data");

    // 4. Quote
    const { data: quote, error: qErr } = await supa
      .from("quotes")
      .insert({
        seller_id: sellerId,
        client_name: "Cliente E2E",
        subtotal: 1000,
        total: 850,
        discount_percent: 15,
        real_discount_percent: 15,
        negotiation_markup_percent: 0,
        discount_amount: 150,
        status: "draft",
      })
      .select("id")
      .single();
    expect(qErr).toBeNull();

    // 5. Request transacional; trigger notifica os admins.
    const { data: request, error: reqErr } = await supa.rpc(
      "request_discount_approval_transactional",
      { _quote_id: quote!.id, _seller_notes: "Test E2E" },
    );
    expect(reqErr).toBeNull();

    // 6. Admin login & approve
    await supa.auth.signOut();
    const adminLogin = await supa.auth.signInWithPassword({
      email: "admin-test@discount-approval.test",
      password: ADMIN_PWD!,
    });
    expect(adminLogin.error).toBeNull();
    expect(adminLogin.data.user).toBeTruthy();

    const { error: updErr } = await supa.rpc("respond_discount_approval_transactional", {
      _request_id: (request as { id: string }).id,
      _approved: true,
      _admin_notes: "OK E2E",
    });
    expect(updErr).toBeNull();

    // 7. Verifica notificação criada pelo trigger
    const { data: notifs } = await supa
      .from("workspace_notifications")
      .select("user_id, type, category")
      .eq("user_id", sellerId)
      .eq("category", "quotes")
      .order("created_at", { ascending: false })
      .limit(1);
    expect(notifs?.length).toBeGreaterThan(0);
    expect(notifs![0].type).toBe("success");

    // 8. Cleanup
    await supa.rpc("cleanup_discount_test_data");
  }, 30_000);
});
