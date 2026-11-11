import { describe, expect, it } from "vitest";
import { errorEnvelopeSchema } from "../edge-functions/live/_schemas";
import { FAIL_CLOSED_WHEN_UNCONFIGURED, isDestructive, LENIENT_BODY } from "../edge-functions/live/_authz";

describe("suíte live de edge — contratos determinísticos", () => {
  it("envelope aceita fields no formato zod.flatten().fieldErrors (mcp-keys-*)", () => {
    expect(errorEnvelopeSchema.safeParse({ error: "validation_failed", fields: { name: ["Required"] } }).success).toBe(true);
    expect(errorEnvelopeSchema.safeParse({ code: "x", fields: [{ path: "a", message: "b" }] }).success).toBe(true);
    // continua exigindo um identificador de erro
    expect(errorEnvelopeSchema.safeParse({ fields: { name: ["Required"] } }).success).toBe(false);
    // e rejeita formatos arbitrários em fields
    expect(errorEnvelopeSchema.safeParse({ error: "x", fields: { name: "Required" } }).success).toBe(false);
  });

  it("funções destrutivas tolerantes a corpo inválido nunca recebem JWT no teste de input inválido", () => {
    for (const fn of ["test-cart-concurrency", "test-cart-limit", "test-cart-rls"]) {
      expect(isDestructive(fn)).toBe(true);
      expect(LENIENT_BODY.has(fn)).toBe(true);
    }
  });

  it("mcp-keys-* validam o corpo de verdade: continuam testadas autenticadas", () => {
    for (const fn of ["mcp-keys-issue", "mcp-keys-revoke", "mcp-keys-rotate", "mcp-keys-update"]) expect(LENIENT_BODY.has(fn)).toBe(false);
    expect([...FAIL_CLOSED_WHEN_UNCONFIGURED]).toEqual(["test-contract-orchestrator"]);
  });
});
