const sourceUrl = new URL("./index.ts", import.meta.url);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("mcp-keys-revoke não tenta expor pg_catalog.set_config como RPC", async () => {
  const source = await Deno.readTextFile(sourceUrl);

  assert(
    !/\.rpc\(\s*["']set_config["']/.test(source),
    "set_config não é uma RPC pública e não pode ser chamada pelo handler",
  );
  assert(
    source.includes("user_id: userId"),
    "a autoria deve continuar sendo registrada explicitamente na auditoria",
  );
});
