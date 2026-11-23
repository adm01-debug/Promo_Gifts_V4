// supabase/functions/_shared/role-rank-parity.test.ts
// Prova que os dois helpers de autorizacao (_shared/authorize.ts e
// _shared/dispatcher-auth.ts) compartilham o MESMO mapa de rank de papel.
//
// ACH-022: os mapas divergiram uma vez — dispatcher-auth.ts nao tinha
// 'vendedor'/'admin', fazendo ROLE_RANK[role] retornar undefined e 403
// 'insufficient_role' para 4 contas admin em producao. Este teste trava a
// divergencia; se um mapa mudar sem o outro, a suite falha.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ROLE_RANK as RANK_AUTHORIZE } from "./authorize.ts";
import { ROLE_RANK as RANK_DISPATCHER } from "./dispatcher-auth.ts";

Deno.test("ROLE_RANK: authorize.ts e dispatcher-auth.ts sao iguais", () => {
  assertEquals(RANK_DISPATCHER, RANK_AUTHORIZE);
});

Deno.test("ROLE_RANK: cobre todos os papeis reais (vendedor, admin, dev)", () => {
  assertEquals(RANK_DISPATCHER["vendedor"], 1);
  assertEquals(RANK_DISPATCHER["agente"], 1);
  assertEquals(RANK_DISPATCHER["supervisor"], 2);
  assertEquals(RANK_DISPATCHER["admin"], 2);
  assertEquals(RANK_DISPATCHER["dev"], 3);
});
