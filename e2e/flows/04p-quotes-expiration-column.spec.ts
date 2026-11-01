/**
 * Coluna "Expiração" — seed determinístico de 4 cotações com `valid_until`
 * em -1d / hoje / +1d / +7d e validação do texto, da classe de cor e do
 * tooltip "Válido até dd/MM/yyyy".
 *
 * Notas:
 *   • Fuso é forçado para America/Sao_Paulo no context (igual ao app real).
 *     Mockar timezone "exótico" no Chromium não muda a lógica: o componente
 *     usa `new Date(y,m,d).getTime()` (local), então a contagem regressiva
 *     é estável dentro do mesmo fuso. Validamos 0/1/7/-1 dias.
 *   • A lista `QuotesConfigurableList` não tem UI de visibilidade/ordenação
 *     de colunas (colunas são fixas no SSOT `ALL_COLUMNS`). Por isso o
 *     teste de "persistência após reload" reduz-se a recarregar a página
 *     e conferir que a coluna continua presente.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { e2eName } from "../helpers/e2e-resources";
import { requireE2EBaseUrl } from "../helpers/require-env-base-url";
import type { Page } from "@playwright/test";

// Matriz de fusos: a contagem regressiva usa `new Date(y,m,d)` local, então
// validamos em 3 fusos distintos para garantir que 0/1/7/-1 dia continuam
// determinísticos e que o dd/MM/yyyy do tooltip não muda com o fuso.
const TIMEZONES = ["America/Sao_Paulo", "UTC", "Europe/Lisbon"] as const;

const SUPABASE_URL =
  requireE2EBaseUrl();
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

interface ExpirationSeed {
  name: string;
  daysFromToday: number;
  expectedText: RegExp;
  expectedToneClass: RegExp; // classe Tailwind esperada (subset)
  iso: string;
}

function buildTargets(): ExpirationSeed[] {
  const today = new Date();
  // CRÍTICO: construímos a string "YYYY-MM-DD" a partir dos COMPONENTES locais
  // (getFullYear/getMonth/getDate) e nunca via toISOString, que devolveria o
  // dia UTC e quebraria em fusos positivos com horário local 00:00 (ex.: Lisbon
  // verão UTC+1 — local 00:00 = 23:00 UTC do dia anterior).
  const atOffset = (d: number) => {
    const x = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  };
  return [
    { name: e2eName("exp-minus1"), daysFromToday: -1, expectedText: /^Expirado há 1d$/, expectedToneClass: /text-destructive/, iso: atOffset(-1) },
    { name: e2eName("exp-today"),  daysFromToday:  0, expectedText: /^Expira hoje$/,    expectedToneClass: /text-destructive/, iso: atOffset(0)  },
    { name: e2eName("exp-plus1"),  daysFromToday:  1, expectedText: /^1 dia$/,           expectedToneClass: /text-amber-500/,   iso: atOffset(1)  },
    { name: e2eName("exp-plus7"),  daysFromToday:  7, expectedText: /^7 dias$/,          expectedToneClass: /text-amber-400/,   iso: atOffset(7)  },
  ];
}

function formatLocal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/**
 * Fixture local exclusiva do teste de ordem dos headers. Todas as requisições
 * do browser para o host Supabase configurado são interceptadas antes da rede;
 * a lista recebe um único registro sintético e operações de escrita falham.
 */
async function installLayoutSupabaseMock(page: Page) {
  const origin = new URL(SUPABASE_URL).origin;
  const supabaseHost = new URL(SUPABASE_URL).hostname;
  const intercepted: string[] = [];
  const unexpected: string[] = [];
  const websocketOrigins: string[] = [];
  const userId = "00000000-0000-0000-0000-e2e0e2e0e2e0";
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "e2e-mock@promogifts.local",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { e2e_mock: true },
    identities: [],
  };
  const quote = {
    id: "11111111-1111-4111-8111-111111111111",
    quote_number: "E2E-LAYOUT-01",
    client_name: "Cliente sintético",
    client_company: "Cliente sintético",
    seller_id: userId,
    status: "draft",
    subtotal: 100,
    discount_percent: 0,
    discount_amount: 0,
    total: 100,
    created_at: "2026-10-31T12:00:00.000Z",
    updated_at: "2026-10-31T12:00:00.000Z",
    valid_until: "2026-11-30",
  };
  const corsHeaders = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "apikey, authorization, content-type, prefer, x-client-info",
    "access-control-expose-headers": "content-range, x-total-count",
  };

  await page.route((url) => url.origin === origin, async (route, request) => {
    const url = new URL(request.url());
    const method = request.method();
    intercepted.push(`${method} ${url.pathname}`);

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }

    if (url.pathname === "/auth/v1/user" && method === "GET") {
      await route.fulfill({ status: 200, headers: corsHeaders, json: user });
      return;
    }
    if (url.pathname === "/auth/v1/token" && method === "POST") {
      const now = Math.floor(Date.now() / 1000);
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        json: {
          access_token: "e2e-layout-mock-token",
          refresh_token: "e2e-layout-mock-refresh",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: now + 3600,
          user,
        },
      });
      return;
    }
    if (url.pathname.startsWith("/auth/v1/") && method === "POST") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }

    if (url.pathname === "/functions/v1/get-visitor-info" && method === "POST") {
      await route.fulfill({ status: 200, headers: corsHeaders, json: { ip: "127.0.0.1" } });
      return;
    }

    if (method === "POST" && url.pathname.startsWith("/rest/v1/rpc/")) {
      // RPCs invoked during app bootstrap are read-only; empty results are
      // sufficient for this layout-only test and remain fully local.
      await route.fulfill({ status: 200, headers: corsHeaders, json: [] });
      return;
    }
    if (
      method === "POST" &&
      (url.pathname === "/rest/v1/user_onboarding" || url.pathname === "/rest/v1/frontend_telemetry")
    ) {
      // App-shell side effects are acknowledged only inside the browser mock;
      // they never reach a Supabase project.
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }

    if (method !== "GET") {
      unexpected.push(`${method} ${url.pathname}`);
      await route.fulfill({ status: 405, headers: corsHeaders, json: { error: "Somente leitura no mock E2E" } });
      return;
    }

    if (url.pathname === "/rest/v1/quotes") {
      await route.fulfill({
        status: 200,
        headers: { ...corsHeaders, "content-range": "0-0/1" },
        json: [quote],
      });
      return;
    }
    if (
      url.pathname === "/rest/v1/quote_items" ||
      url.pathname === "/rest/v1/personalization_techniques" ||
      url.pathname === "/rest/v1/system_settings"
    ) {
      await route.fulfill({ status: 200, headers: corsHeaders, json: [] });
      return;
    }

    // App shell/bootstrap pode consultar outras tabelas de leitura. Mantemos
    // resposta vazia para elas, preservando o isolamento sem acoplar o teste a
    // detalhes de módulos alheios à ordem das colunas.
    await route.fulfill({ status: 200, headers: corsHeaders, json: [] });
  });

  // Intercepta também referências Supabase inesperadas (incluindo um fallback
  // acidental ao projeto canônico) e mantém a conexão Realtime dentro do mock.
  await page.route(
    (url) => url.hostname.endsWith(".supabase.co") && url.origin !== origin,
    async (route, request) => {
      unexpected.push(`${request.method()} ${new URL(request.url()).origin}`);
      await route.fulfill({ status: 599, body: "Host Supabase fora do mock E2E" });
    },
  );
  await page.routeWebSocket(
    (url) =>
      (url.hostname === supabaseHost || url.hostname.endsWith(".supabase.co")) &&
      url.pathname.startsWith("/realtime/v1/"),
    (socket) => {
      // Não encaminha para a rede: o socket termina no mock do Playwright.
      const socketUrl = new URL(socket.url());
      websocketOrigins.push(socketUrl.hostname);
      if (socketUrl.hostname !== supabaseHost) {
        unexpected.push(`WS ${socketUrl.hostname}${socketUrl.pathname}`);
      }
      socket.onMessage(() => {});
    },
  );

  return {
    assertIsolated: () => {
      expect(intercepted.some((call) => call.endsWith("/rest/v1/quotes"))).toBe(true);
      expect(websocketOrigins.every((value) => value === supabaseHost)).toBe(true);
      expect(unexpected, `requisições fora do mock isolado: ${unexpected.join(", ")}`).toEqual([]);
    },
  };
}

for (const tz of TIMEZONES) {
  test.describe(`Cotações · coluna Expiração [tz=${tz}]`, () => {
    test.use({ timezoneId: tz, locale: "pt-BR" });
    test.beforeEach(() => requireAuth());

    test(`renderiza dias restantes, tom e tooltip por caso-limite [${tz}]`, async ({ page }) => {
      const targets = buildTargets();
      await gotoAndSettle(page, "/orcamentos");

      const seed = await page.evaluate(
        async ({ url, anonKey, targets }) => {
          let jwt = "";
          let sellerId = "";
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)!;
            if (!k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            jwt = parsed?.access_token ?? "";
            sellerId = parsed?.user?.id ?? "";
            if (jwt) break;
          }
          if (!jwt || !sellerId) return { skipped: "no-jwt" as const, created: 0 };
          const headers = {
            apikey: anonKey,
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          };
          let created = 0;
          for (const t of targets) {
            const r = await fetch(`${url}/rest/v1/quotes`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                seller_id: sellerId,
                client_name: t.name,
                status: "draft",
                total: 100,
                valid_until: t.iso,
                notes: "e2e-seed-expiration",
              }),
            });
            if (r.ok) created += 1;
          }
          return { skipped: null as null, created };
        },
        { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, targets },
      );

      test.skip(seed.skipped === "no-jwt", "Sem JWT no localStorage para seed.");
      if (seed.created === 0) { test.skip(true, "Nenhuma quote criada — sem acesso ao banco (no-org)."); }
      expect(seed.created).toBeGreaterThan(0);

      await gotoAndSettle(page, "/orcamentos");
      await expect(page.getByTestId("quotes-col-header-expiration")).toBeVisible({ timeout: 10_000 });

      for (const t of targets) {
        const row = page.locator('[data-testid^="quote-row-"]').filter({ hasText: t.name }).first();
        const cell = row.locator('[data-testid="quote-expiration-cell"]').first();
        await expect(cell, `texto ${t.daysFromToday}d @${tz}`).toHaveText(t.expectedText);
        await expect(cell, `tom ${t.daysFromToday}d @${tz}`).toHaveClass(t.expectedToneClass);

        const expectedDate = formatLocal(t.iso);
        // Tooltip DEVE ser exatamente "Válido até dd/MM/yyyy" — não pode variar por locale do navegador.
        await expect(cell).toHaveAttribute("aria-label", new RegExp(`Válido até ${expectedDate}$`));

        await cell.focus();
        const tip = page.getByRole("tooltip", { name: new RegExp(`^Válido até ${expectedDate}$`) }).first();
        await expect(tip, `tooltip exato @${tz}`).toBeVisible({ timeout: 3_000 });
        await page.keyboard.press("Escape");
      }
    });
  });
}

// Regressão de layout: coluna continua no lugar correto após reload e
// navegação fora→volta. Posição é validada via ordem dos headers.
test.describe("Cotações · coluna Expiração — regressão de layout", () => {
  test.use({ timezoneId: "America/Sao_Paulo", locale: "pt-BR" });
  test.beforeEach(() => requireAuth());

  test("ordem Status → Expiração → Nº Orçamento sobrevive a reload e navegação", async ({ page }) => {
    const supabaseMock = await installLayoutSupabaseMock(page);
    await gotoAndSettle(page, "/orcamentos");

    const expectOrder = async (label: string) => {
      const ids = await page
        .locator('[data-testid^="quotes-col-header-"]')
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-testid")?.replace("quotes-col-header-", "") ?? ""),
        );
      const iStatus = ids.indexOf("status");
      const iExp = ids.indexOf("expiration");
      const iNum = ids.indexOf("quote_number");
      expect(iStatus, `status presente em ${label}`).toBeGreaterThanOrEqual(0);
      expect(iExp, `expiration presente em ${label}`).toBeGreaterThan(iStatus);
      expect(iNum, `quote_number presente em ${label}`).toBeGreaterThan(iExp);
    };

    await expect(page.getByTestId("quotes-col-header-status")).toBeVisible({ timeout: 10_000 });
    await expectOrder("primeiro acesso");

    await page.reload();
    await expect(page.getByTestId("quotes-col-header-expiration")).toBeVisible({ timeout: 10_000 });
    await expectOrder("após reload");

    await gotoAndSettle(page, "/");
    await gotoAndSettle(page, "/orcamentos");
    await expect(page.getByTestId("quotes-col-header-expiration")).toBeVisible({ timeout: 10_000 });
    await expectOrder("após navegação fora→volta");
    supabaseMock.assertIsolated();
  });
});

