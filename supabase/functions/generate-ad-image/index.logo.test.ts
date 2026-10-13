/**
 * generate-ad-image — teto de tamanho e formatos aceitos do logo inline (F pergunta 7).
 *
 * Critério do cartão: `logoBase64` não tinha limite — um logo gigante fica na memória
 * do isolate e é reenviado inteiro ao provedor (custo por imagem). Mesmo padrão do
 * generate-mockup: até 10 MB decodificados, formatos PNG, JPG ou WebP.
 *
 * O teste importa o handler REAL (`./index.ts`) e exercita a guarda exportada:
 *   1. payload base64 que decodifica acima de 10 MB → recusa (413);
 *   2. tipo fora de PNG/JPG/WebP                    → recusa;
 *   3. logo válido (≤ 10 MB, PNG/JPG/WebP)          → segue para o provedor (null).
 * O import é dinâmico porque `index.ts` chama `Deno.serve` no topo do módulo: o teste
 * stuba `Deno.serve` para poder importar. Reimplementar a regra aqui (em vez de
 * importar) faria o teste seguir verde com o defeito de volta.
 *
 * Rodar: deno test --config supabase/functions/deno.json --allow-env --allow-net \
 *   supabase/functions/generate-ad-image/index.logo.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// `index.ts` chama `Deno.serve` no topo do módulo e o handler não pode subir servidor
// dentro do `deno test` — o stub é o que permite importar o código REAL (reimplementar
// a regra aqui deixaria o teste verde até com o defeito de volta).
const originalServe = Deno.serve;
Object.defineProperty(Deno, "serve", {
  value: () => ({ finished: Promise.resolve(), shutdown: () => Promise.resolve() }),
  configurable: true,
  writable: true,
});

const { rejectLogoBase64 } = await import("./index.ts");

Object.defineProperty(Deno, "serve", {
  value: originalServe,
  configurable: true,
  writable: true,
});

if (typeof rejectLogoBase64 !== "function") {
  throw new Error(
    "index.ts não exporta rejectLogoBase64 — a guarda de tamanho/formato do logo não existe",
  );
}

/** Limite do cartão: 10 MB decodificados. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Tamanho decodificado de um payload base64 (aritmética, sem decodificar). */
function decodedBytes(payload: string): number {
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

/** Data URL cujo payload base64 decodifica para pelo menos `bytes` bytes. */
function dataUrlOfDecodedBytes(mime: string, bytes: number): string {
  return `data:${mime};base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;
}

Deno.test("base64 que decodifica acima de 10 MB é recusado com 413", () => {
  const dataUrl = dataUrlOfDecodedBytes("image/png", MAX_BYTES + 1);
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  // Sanidade da fixture: sem isto o teste passaria com um payload pequeno.
  assertEquals(decodedBytes(payload), MAX_BYTES + 1);

  const rejection = rejectLogoBase64(dataUrl);
  assertEquals(rejection?.status, 413);
  assertEquals(rejection?.code, "logo_too_large");
});

Deno.test("data URL de 10 MB exatos (teto inclusivo) segue para o provedor", () => {
  const dataUrl = dataUrlOfDecodedBytes("image/png", MAX_BYTES);
  assertEquals(decodedBytes(dataUrl.slice(dataUrl.indexOf(",") + 1)), MAX_BYTES);

  assertEquals(rejectLogoBase64(dataUrl), null);
});

Deno.test("tipo fora de PNG/JPG/WebP é recusado", () => {
  const rejected = [
    "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    "data:image/avif;base64,AAAAHGZ0eXBhdmlm",
    "data:text/plain;base64,aGk=",
    "data:application/pdf;base64,JVBERi0=",
    // Sem prefixo `data:` (base64 cru) não há tipo declarado → recusa.
    "aGVsbG8gd29ybGQ=",
  ];

  for (const dataUrl of rejected) {
    const rejection = rejectLogoBase64(dataUrl);
    assertEquals(rejection?.status, 415, `esperava recusa para ${dataUrl.slice(0, 32)}`);
    assertEquals(rejection?.code, "logo_type_not_allowed");
  }
});

Deno.test("PNG, JPG e WebP dentro do limite seguem para o provedor", () => {
  const accepted = [
    "data:image/png;base64,iVBORw0KGgo=",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    "data:image/jpg;base64,/9j/4AAQSkZJRg==",
    "data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAv",
    // MIME em maiúsculas e com parâmetro extra continuam válidos.
    "data:image/PNG;charset=utf-8;base64,iVBORw0KGgo=",
  ];

  for (const dataUrl of accepted) {
    assertEquals(rejectLogoBase64(dataUrl), null, `esperava aceite para ${dataUrl.slice(0, 32)}`);
  }
});

Deno.test("sem logoBase64 (caminho logoUrl) a guarda não interfere", () => {
  assertEquals(rejectLogoBase64(undefined), null);
  assertEquals(rejectLogoBase64(""), null);
});
