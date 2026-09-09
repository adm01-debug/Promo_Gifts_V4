import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  importLocalMagazineBatch,
  type LocalMagazineImportPayload,
  type MagazineImportRpcClient,
} from "./logic.ts";

function magazine(localId: string): LocalMagazineImportPayload {
  const localItemId = `item-${localId}`;
  return {
    localId,
    title: `Revista ${localId}`,
    templateId: "editorial-vogue",
    status: "draft",
    pageOrder: {
      version: 2,
      pages: [
        { id: "cover", kind: "cover" },
        { id: "products", kind: "products", itemIds: [localItemId] },
        { id: "contact", kind: "contact" },
      ],
    },
    items: [
      {
        localItemId,
        productId: "10000000-0000-0000-0000-000000000001",
        productSnapshot: { name: "Produto" },
        position: 0,
      },
    ],
  };
}

Deno.test("usa uma única RPC transacional e preserva pageOrder/IDs locais", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client: MagazineImportRpcClient = {
    rpc(name, args) {
      calls.push({ name, args });
      return Promise.resolve({
        data: { magazine_id: "server-1", edit_version: 1, idempotent: false },
        error: null,
      });
    },
  };

  const summary = await importLocalMagazineBatch(client, [magazine("local-1")]);

  assertEquals(summary, {
    results: [
      {
        localId: "local-1",
        newId: "server-1",
        publicToken: null,
        idempotent: false,
      },
    ],
    complete: true,
    success: 1,
    failure: 0,
    successCount: 1,
    failureCount: 0,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0]?.name, "magazine_import_local_v2");
  assertEquals(calls[0]?.args.p_idempotency_key, "local-1");
  const payload = calls[0]?.args.p_payload as Record<string, unknown>;
  assertEquals(payload.pageOrder, magazine("local-1").pageOrder);
  assertEquals(payload.items, magazine("local-1").items);
});

Deno.test("agrega falha parcial sem produzir falso complete", async () => {
  const client: MagazineImportRpcClient = {
    rpc(_name, args) {
      const key = args.p_idempotency_key;
      return Promise.resolve(
        key === "bad"
          ? { data: null, error: { message: "invalid_payload" } }
          : {
            data: { magazine_id: `server-${key}`, idempotent: false },
            error: null,
          },
      );
    },
  };

  const summary = await importLocalMagazineBatch(client, [
    magazine("ok"),
    magazine("bad"),
  ]);
  assertEquals(summary.complete, false);
  assertEquals(summary.success, 1);
  assertEquals(summary.failure, 1);
  assertEquals(summary.successCount, 1);
  assertEquals(summary.failureCount, 1);
  assertEquals(summary.results[1]?.error, "invalid_payload");
});

Deno.test("resposta perdida pode ser repetida com a mesma chave sem duplicar", async () => {
  const keys: string[] = [];
  let attempt = 0;
  const client: MagazineImportRpcClient = {
    rpc(_name, args) {
      keys.push(args.p_idempotency_key);
      attempt += 1;
      if (attempt === 1) return Promise.reject(new Error("response_lost"));
      return Promise.resolve({
        data: { magazine_id: "same-server-id", idempotent: true },
        error: null,
      });
    },
  };

  const first = await importLocalMagazineBatch(client, [
    magazine("stable-local-id"),
  ]);
  const retry = await importLocalMagazineBatch(client, [
    magazine("stable-local-id"),
  ]);

  assertEquals(first.complete, false);
  assertEquals(retry.complete, true);
  assertEquals(retry.results[0]?.newId, "same-server-id");
  assertEquals(retry.results[0]?.idempotent, true);
  assertEquals(keys, ["stable-local-id", "stable-local-id"]);
});
