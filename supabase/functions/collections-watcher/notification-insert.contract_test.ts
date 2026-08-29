// Contrato offline do collections-watcher.
//
// Não importamos index.ts: ele registra Deno.serve e importa o client remoto.
// O teste faz uma caracterização do contrato observável no fonte e simula o
// retorno normal do Supabase ({ error }), que não é uma Promise rejeitada.

type InsertResult = { error: { message: string } | null };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertRejects(
  action: () => Promise<unknown>,
  expected: RegExp,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error,
      "a falha deve ser convertida em Error observável",
    );
    assert(expected.test(error.message), `erro inesperado: ${error.message}`);
    return;
  }
  throw new Error("esperava rejeição");
}

async function insertThenCount(
  insertResult: Promise<InsertResult>,
  increment: () => void,
): Promise<void> {
  const { error: notificationError } = await insertResult;
  if (notificationError) {
    throw new Error(
      `[collections-watcher] workspace_notifications insert failed: ${notificationError.message}`,
    );
  }
  increment();
}

Deno.test("collections-watcher: o fonte verifica o erro do insert antes de incrementar users_notified", async () => {
  const source = await Deno.readTextFile(
    new URL("./index.ts", import.meta.url),
  );
  const insertStart = source.indexOf(
    'const { error: notificationError } = await service.from("workspace_notifications").insert({',
  );
  const failureCheck = source.indexOf("if (notificationError)", insertStart);
  const counter = source.indexOf("notified++;", insertStart);

  assert(
    insertStart >= 0,
    "o insert de workspace_notifications deve capturar seu retorno de erro",
  );
  assert(
    failureCheck > insertStart,
    "o erro do insert deve ser verificado após a gravação",
  );
  assert(
    counter > failureCheck,
    "users_notified só pode ser incrementado após a verificação",
  );
  assert(
    source.slice(failureCheck, counter).includes("throw new Error"),
    "a falha do insert deve interromper o handler para que o cron possa repetir a tentativa",
  );
});

Deno.test("collections-watcher: erro retornado pelo Supabase não incrementa users_notified", async () => {
  let usersNotified = 0;

  await assertRejects(
    () =>
      insertThenCount(
        Promise.resolve({ error: { message: "RLS denied" } }),
        () => usersNotified++,
      ),
    /workspace_notifications insert failed: RLS denied/,
  );

  assert(
    usersNotified === 0,
    `contador não pode avançar em falha; recebeu ${usersNotified}`,
  );
});

Deno.test("collections-watcher: insert bem-sucedido incrementa users_notified uma vez", async () => {
  let usersNotified = 0;
  await insertThenCount(
    Promise.resolve({ error: null }),
    () => usersNotified++,
  );
  assert(usersNotified === 1, `contador esperado 1; recebeu ${usersNotified}`);
});
