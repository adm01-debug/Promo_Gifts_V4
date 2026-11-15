/**
 * Prova do cartão (E-14 / BUG-MAGICUP-TIMEOUT-1): a edge `generate-ad-prompt`
 * chama o provedor com o MESMO tempo limite configurado no `generate-ad-image`,
 * e o estouro devolve erro genérico com `code: "timeout"`.
 *
 * Antes: `callAiWithTracking({...})` não passava `legacyTimeoutMs` (default de
 * 45s no caminho legado) e o cliente (PromptGenerator) chamava com o default de
 * 10s do invokeEdge, enquanto o generate-ad-image já roda com `timeoutMs: 60_000`
 * no cliente. A prova do lado do cliente está em
 * tests/components/magic-up-prompt-generator.timeout.test.tsx.
 *
 * O `index.ts` não é importado (sobe `Deno.serve` + `npm:`); o helper puro é
 * testado de verdade via `./timeout.ts`, e o restante é o contrato do fonte —
 * exatamente o que o cartão mudou.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AI_PROVIDER_TIMEOUT_MS,
  TIMEOUT_ERROR_CODE,
  isProviderTimeoutError,
} from "./timeout.ts";

const ROOT = process.cwd();
const INDEX_SRC = readFileSync(
  path.resolve(ROOT, "supabase/functions/generate-ad-prompt/index.ts"),
  "utf8",
);
const AD_IMAGE_HOOK_SRC = readFileSync(
  path.resolve(ROOT, "src/hooks/intelligence/useMagicUpGeneration.ts"),
  "utf8",
);

function errorNamed(name: string, message = name): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

/** Trecho das opções passadas para `await callAiWithTracking({ ... })`. */
function callAiOptionsBlock(src: string): string {
  const start = src.indexOf("await callAiWithTracking({");
  expect(start, "index.ts deve chamar await callAiWithTracking({").toBeGreaterThan(-1);
  const end = src.indexOf("});", start);
  expect(end, "bloco de callAiWithTracking({...}) não fecha").toBeGreaterThan(start);
  return src.slice(start, end);
}

/** Ramo do catch que trata o estouro de tempo (antes do 500 genérico). */
function timeoutBranchBlock(src: string): string {
  const guard = src.indexOf("if (isProviderTimeoutError(error))");
  expect(guard, "catch deve tratar isProviderTimeoutError(error)").toBeGreaterThan(-1);
  const generic = src.indexOf('console.error("[ad-prompt] Error:", error)', guard);
  expect(generic, "ramo genérico (500) deve continuar existindo").toBeGreaterThan(guard);
  return src.slice(guard, generic);
}

describe("generate-ad-prompt — tempo limite do provedor (E-14)", () => {
  it("usa o MESMO tempo limite do generate-ad-image (valor lido da constante)", () => {
    // O generate-ad-image é invocado com `timeoutMs: 60_000` para cobrir a
    // geração lenta — o teste lê ESSE valor do hook, não o fixa no teste.
    expect(AD_IMAGE_HOOK_SRC).toContain("'generate-ad-image'");
    const match = /\btimeoutMs\s*:\s*([0-9_]+)/.exec(AD_IMAGE_HOOK_SRC);
    expect(match, "timeoutMs do generate-ad-image não encontrado").not.toBeNull();
    const adImageMs = Number((match?.[1] ?? "").replace(/_/g, ""));

    expect(AI_PROVIDER_TIMEOUT_MS).toBe(adImageMs);
    expect(adImageMs).toBeGreaterThanOrEqual(60_000);
  });

  it("a chamada ao provedor passa legacyTimeoutMs lendo a constante (não literal)", () => {
    const options = callAiOptionsBlock(INDEX_SRC);

    expect(options).toContain("legacyTimeoutMs: AI_PROVIDER_TIMEOUT_MS");
    // Prova negativa: sem o fio, o provedor volta ao default e o defeito reaparece.
    expect(options).not.toMatch(/legacyTimeoutMs\s*:\s*[0-9]/);
  });

  it("isProviderTimeoutError reconhece o estouro e ignora falhas comuns", () => {
    // AbortController (ai-usage/ai-router) e mensagem do adapter.
    expect(isProviderTimeoutError(errorNamed("AbortError"))).toBe(true);
    expect(isProviderTimeoutError(errorNamed("TimeoutError"))).toBe(true);
    expect(isProviderTimeoutError(new Error("Timeout após 60000ms"))).toBe(true);
    expect(isProviderTimeoutError(new Error("legacy_gateway_timeout_60000ms"))).toBe(true);

    // Não pode engolir erro alheio como timeout.
    expect(isProviderTimeoutError(new Error("Validation failed"))).toBe(false);
    expect(isProviderTimeoutError(new Error("AI error: 500"))).toBe(false);
    expect(isProviderTimeoutError(null)).toBe(false);
    expect(isProviderTimeoutError(undefined)).toBe(false);
    expect(isProviderTimeoutError({})).toBe(false);
  });

  it("estouro devolve erro genérico com code timeout, nunca a mensagem crua", () => {
    expect(TIMEOUT_ERROR_CODE).toBe("timeout");
    expect(INDEX_SRC).toContain("TIMEOUT_ERROR_CODE");

    const branch = timeoutBranchBlock(INDEX_SRC);
    expect(branch).toMatch(/code:\s*TIMEOUT_ERROR_CODE/);
    expect(branch).toMatch(/status:\s*504/);
    expect(branch).toMatch(/error:\s*"[^"]+"/);
    expect(branch).not.toMatch(/\$\{message\}/);
    expect(branch).not.toMatch(/JSON\.stringify\(\{\s*error:\s*message/);
  });
});
