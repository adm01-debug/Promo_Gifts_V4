import { describe, expect, it } from "vitest";

import { rewriteCiSharedIpLockout } from "../../e2e/helpers/ci-auth-lockout";

describe("rewriteCiSharedIpLockout", () => {
  it("seleciona apenas o lockout exato em uma matriz de 180 cenários", () => {
    const statuses = [0, 199, 200, 201, 204, 299, 300, 401, 429, 500];
    const payloads: unknown[] = [
      null,
      [],
      "too_many_attempts",
      {},
      { allowed: true, reason: "too_many_attempts" },
      { allowed: false, reason: "ip_not_whitelisted" },
      { allowed: false, reason: "city_not_whitelisted" },
      { allowed: false, reason: "TOO_MANY_ATTEMPTS" },
      { allowed: false, reason: "too_many_attempts" },
    ];
    let selected = 0;

    for (const enabled of [false, true]) {
      for (const status of statuses) {
        for (const [payloadIndex, payload] of payloads.entries()) {
          const result = rewriteCiSharedIpLockout(enabled, status, payload);
          const expected =
            enabled && [200, 201, 204, 299].includes(status) && payloadIndex === 8;
          expect(Boolean(result)).toBe(expected);
          if (result) selected += 1;
        }
      }
    }

    expect(selected).toBe(4);
  });

  it("preserva os detalhes de auditoria sem alterar o payload original", () => {
    const payload = {
      allowed: false,
      reason: "too_many_attempts",
      details: { attempts: 8, lockout_minutes: 30 },
    };

    expect(rewriteCiSharedIpLockout(true, 200, payload)).toEqual({
      ...payload,
      allowed: true,
      ciSharedIpLockoutBypass: true,
    });
    expect(payload.allowed).toBe(false);
  });
});
