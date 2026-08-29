import { describe, expect, it } from "vitest";
import { maskUrl } from "../../scripts/check-result-contract.mjs";

describe("check-result-contract", () => {
  it("mascara project refs sem ocultar endpoints locais de fixture", () => {
    expect(maskUrl("https://doufsxqlfjyuvxuezpln.supabase.co")).toBe(
      "https://dou***pln.supabase.co",
    );
    expect(maskUrl("http://127.0.0.1:9123")).toBe("http://127.0.0.1:9123");
    expect(maskUrl("http://localhost:4173")).toBe("http://localhost:4173");
  });

  it("não reflete uma URL inválida potencialmente sensível no log", () => {
    expect(maskUrl("https://user:secret@[malformed")).toBe("[invalid-url]");
  });
});
