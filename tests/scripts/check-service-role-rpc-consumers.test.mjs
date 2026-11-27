import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  auditServiceRoleConsumers,
  collectSrcRpcConsumers,
  findServiceRoleOnlyFunctions,
  parseFunctionGrants,
} from '../../scripts/check-service-role-rpc-consumers.mjs';

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-service-role-rpc-'));
  temporaryRoots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  return root;
}

const BASELINE = [
  'REVOKE ALL ON FUNCTION "public"."fn_ai_quota_summary"() FROM PUBLIC;',
  'GRANT ALL ON FUNCTION "public"."fn_ai_quota_summary"() TO "service_role";',
  '',
  'REVOKE ALL ON FUNCTION "public"."fn_admin_smoke_tests_dashboard"() FROM PUBLIC;',
  'GRANT ALL ON FUNCTION "public"."fn_admin_smoke_tests_dashboard"() TO "authenticated";',
  'GRANT ALL ON FUNCTION "public"."fn_admin_smoke_tests_dashboard"() TO "service_role";',
  '',
  'REVOKE ALL ON FUNCTION "classification_audit"."apply_high_confidence_suggestions"("_dry_run" boolean) FROM PUBLIC;',
  'GRANT ALL ON FUNCTION "classification_audit"."apply_high_confidence_suggestions"("_dry_run" boolean) TO "service_role";',
  '',
].join('\n');

function baselineFixture(extraFiles = {}) {
  return fixture({
    'supabase/baseline/20260101000000_baseline_schema.sql': BASELINE,
    'supabase/baseline/20260101000000_ledger_versions.json': JSON.stringify({
      baseline_version: '20260101000000',
      versions: ['20260101000000'],
    }),
    ...extraFiles,
  });
}

function rpcReference(name, file, line = 1) {
  return {
    kind: 'rpc',
    classification: 'canonical',
    name,
    file,
    line,
    column: 1,
    receiver: 'supabase',
  };
}

describe('parseFunctionGrants', () => {
  it('agrupa GRANTs por schema.funcao e registra o REVOKE de PUBLIC', () => {
    const grants = parseFunctionGrants(BASELINE);
    const quota = grants.get('public.fn_ai_quota_summary');
    expect([...quota.roles]).toEqual(['service_role']);
    expect(quota.publicRevoked).toBe(true);
    const dashboard = grants.get('public.fn_admin_smoke_tests_dashboard');
    expect([...dashboard.roles].sort()).toEqual(['authenticated', 'service_role']);
  });

  it('nao confunde argumentos com nomes de role nem aceita linha de comentario', () => {
    const grants = parseFunctionGrants(
      [
        '-- GRANT ALL ON FUNCTION "public"."fn_comentada"() TO "service_role";',
        'GRANT ALL ON FUNCTION "public"."fn_com_argumento"("_role" text) TO "service_role";',
      ].join('\n'),
    );
    expect(grants.has('public.fn_comentada')).toBe(false);
    expect(grants.get('public.fn_com_argumento').roles.has('service_role')).toBe(true);
  });
});

describe('findServiceRoleOnlyFunctions', () => {
  it('so devolve public com unico grant service_role', () => {
    const names = [...findServiceRoleOnlyFunctions(parseFunctionGrants(BASELINE)).keys()];
    expect(names).toEqual(['fn_ai_quota_summary']);
  });
});

describe('collectSrcRpcConsumers', () => {
  it('usa apenas referencias canonicas de src/ com nome literal', () => {
    const consumers = collectSrcRpcConsumers({
      references: [
        rpcReference('fn_ai_quota_summary', 'src/pages/admin/ConsumoIaPage.tsx', 12),
        { ...rpcReference('fn_ai_quota_summary', 'supabase/functions/x/index.ts', 3) },
        { ...rpcReference('fn_dinamica', 'src/lib/db/postgrest.ts', 4), name: null },
        {
          ...rpcReference('fn_ai_quota_summary', 'src/lib/supabase-untyped.ts', 8),
          classification: 'generic-wrapper',
        },
      ],
    });
    expect([...consumers.keys()]).toEqual(['fn_ai_quota_summary']);
    expect(consumers.get('fn_ai_quota_summary')).toEqual([
      { file: 'src/pages/admin/ConsumoIaPage.tsx', line: 12 },
    ]);
  });
});

describe('auditServiceRoleConsumers', () => {
  it('acusa consumo em src/ de RPC service_role-only', () => {
    const root = baselineFixture();
    const audit = auditServiceRoleConsumers({
      root,
      references: [
        rpcReference('fn_ai_quota_summary', 'src/pages/admin/ConsumoIaPage.tsx', 12),
        rpcReference('fn_admin_smoke_tests_dashboard', 'src/pages/admin/SmokePage.tsx', 20),
      ],
    });
    expect(audit.violations).toEqual([
      {
        name: 'fn_ai_quota_summary',
        file: 'src/pages/admin/ConsumoIaPage.tsx',
        lines: [12],
        occurrences: 1,
      },
    ]);
    expect(audit.accepted).toEqual([]);
    expect(audit.orphans).toEqual([]);
  });

  it('trata o consumo coberto pela allowlist como aceito, nao como violacao', () => {
    const root = baselineFixture({
      '.security/service-role-rpc-consumers-allowlist.json': JSON.stringify({
        entries: [
          {
            name: 'fn_ai_quota_summary',
            file: 'src/pages/admin/ConsumoIaPage.tsx',
            reason: 'canario',
          },
        ],
      }),
    });
    const audit = auditServiceRoleConsumers({
      root,
      references: [rpcReference('fn_ai_quota_summary', 'src/pages/admin/ConsumoIaPage.tsx', 12)],
    });
    expect(audit.violations).toEqual([]);
    expect(audit.accepted.map((item) => item.name)).toEqual(['fn_ai_quota_summary']);
    expect(audit.unusedAllowlistEntries).toEqual([]);
  });

  it('acusa violacao quando o mesmo nome e consumido por outro arquivo fora da allowlist', () => {
    const root = baselineFixture({
      '.security/service-role-rpc-consumers-allowlist.json': JSON.stringify({
        entries: [
          { name: 'fn_ai_quota_summary', file: 'src/utils/security-audit.ts', reason: 'canario' },
        ],
      }),
    });
    const audit = auditServiceRoleConsumers({
      root,
      references: [rpcReference('fn_ai_quota_summary', 'src/pages/admin/ConsumoIaPage.tsx', 12)],
    });
    expect(audit.violations.map((item) => item.file)).toEqual([
      'src/pages/admin/ConsumoIaPage.tsx',
    ]);
    expect(audit.unusedAllowlistEntries).toEqual([
      { name: 'fn_ai_quota_summary', file: 'src/utils/security-audit.ts' },
    ]);
  });

  it('lista como orfa a funcao service_role-only sem consumidor em src/', () => {
    const root = baselineFixture();
    const audit = auditServiceRoleConsumers({ root, references: [] });
    expect(audit.violations).toEqual([]);
    expect(audit.orphans).toEqual(['fn_ai_quota_summary']);
    expect(audit.serviceRoleOnlyCount).toBe(1);
  });

  it('falha explicitamente quando nao encontra o baseline', () => {
    const root = fixture({ 'README.md': '# sem baseline\n' });
    expect(() => auditServiceRoleConsumers({ root, references: [] })).toThrow(
      /baseline do schema nao encontrado/,
    );
  });
});
