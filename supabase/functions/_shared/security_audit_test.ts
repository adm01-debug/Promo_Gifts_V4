import {
  buildSecurityEventRow,
  SECURITY_EVENT_TABLE,
  type SecurityEventRow,
  writeSecurityEvent,
} from "./security.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

Deno.test("evento de rate limit usa o contrato live de bot_detection_log", () => {
  const row = buildSecurityEventRow(
    "RATE_LIMIT_EXCEEDED",
    "rate-limit-check",
    "192.0.2.5",
    {
      request_id: "req-local-1",
    },
  );

  assertEquals(row, {
    detection_type: "RATE_LIMIT_EXCEEDED",
    action_taken: "blocked",
    blocked: true,
    ip_address: "192.0.2.5",
    user_agent: null,
    metadata: {
      request_id: "req-local-1",
      endpoint: "rate-limit-check",
    },
  });
});

Deno.test("evento preserva endpoint, contagem e user agent no formato do painel", () => {
  const row = buildSecurityEventRow("RATE_LIMIT_EXCEEDED", "api", "192.0.2.5", {
    count: 101,
    userAgent: "Browser/1.0",
  });

  assertEquals(row.metadata.endpoint, "api");
  assertEquals(row.metadata.request_count, 101);
  assertEquals(row.user_agent, "Browser/1.0");
});

Deno.test("evento de segurança mantém falha de logging fora do caminho principal", async () => {
  let relation = "";
  let inserted: SecurityEventRow | undefined;
  const client = {
    from: (table: string) => {
      relation = table;
      return {
        insert: (row: SecurityEventRow) => {
          inserted = row;
          return Promise.resolve({ error: { message: "audit unavailable" } });
        },
      };
    },
  };

  const written = await writeSecurityEvent(
    client,
    "TEST_EVENT",
    "test",
    "id-1",
  );

  assert(written === false, "erro de log deve ser reportado sem throw");
  assertEquals(relation, SECURITY_EVENT_TABLE);
  assertEquals(inserted?.ip_address, "id-1");
});
