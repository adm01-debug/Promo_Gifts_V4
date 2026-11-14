import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  CRM_TABLES,
  OWNERSHIP_RULES,
  buildSellerScopedSelect,
  isRestrictedWriteRole,
  isSellerScopedRole,
  sellerScopeFilter,
  stripInternalRelations,
} from '../../supabase/functions/crm-db-bridge/query-policy';

describe('crm-db-bridge — escopo de vendedor', () => {
  it('define ownership explícito para as nove tabelas permitidas', () => {
    expect(Object.keys(OWNERSHIP_RULES).sort()).toEqual([...CRM_TABLES].sort());
    expect(OWNERSHIP_RULES.customers).toEqual({
      kind: 'direct',
      filterColumn: 'vendedor_id',
    });
    expect(OWNERSHIP_RULES.companies).toMatchObject({
      kind: 'relation',
      relation: 'customers',
    });
    expect(OWNERSHIP_RULES.contacts).toMatchObject({
      kind: 'relation',
      relation: 'companies.customers',
    });
    expect(OWNERSHIP_RULES.contact_emails).toMatchObject({
      kind: 'relation',
      relation: 'contacts.companies.customers',
    });
    expect(OWNERSHIP_RULES.contact_phones).toMatchObject({
      kind: 'relation',
      relation: 'contacts.companies.customers',
    });
    for (const table of [
      'company_addresses',
      'company_social_media',
      'suppliers',
      'carriers',
    ] as const) {
      expect(OWNERSHIP_RULES[table]).toMatchObject({
        kind: 'relation',
        relation: 'companies.customers',
      });
    }
  });

  it('usa customers.vendedor_id diretamente e relações inner nos demais níveis', () => {
    expect(buildSellerScopedSelect('id', 'customers', true)).toBe('id');
    expect(sellerScopeFilter('customers')).toEqual({ column: 'vendedor_id' });
    expect(buildSellerScopedSelect('id', 'companies', true)).toBe(
      'id,__seller_scope:customers!inner(id)',
    );
    expect(sellerScopeFilter('companies')).toEqual({
      column: '__seller_scope.vendedor_id',
      relation: 'customers',
    });
    expect(buildSellerScopedSelect('id,email', 'contact_emails', true)).toBe(
      'id,email,__seller_scope:contacts!inner(companies!inner(customers!inner(id)))',
    );
    expect(sellerScopeFilter('contact_emails')).toEqual({
      column: '__seller_scope.companies.customers.vendedor_id',
      relation: 'contacts.companies.customers',
    });
  });

  it('remove relações internas antes de responder ao cliente', () => {
    expect(
      stripInternalRelations([
        { id: '1', email: 'a@example.test', __seller_scope: { id: 'contact-1' } },
      ]),
    ).toEqual([{ id: '1', email: 'a@example.test' }]);
  });

  it('mapeia e-mail autenticado para users.id do CRM sem confiar em UUIDs entre projetos', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
      'utf8',
    );
    expect(source).toContain('.from("users")');
    expect(source).toContain('.from("crm_seller_identity_links")');
    expect(source.indexOf('.from("crm_seller_identity_links")')).toBeLessThan(
      source.indexOf('if (!userEmail)'),
    );
    expect(source).toContain('.eq("email", userEmail.trim().toLowerCase())');
    expect(source).toContain('.eq("is_active", true)');
    expect(source).toContain('.eq("is_vendedor", true)');
    expect(source).toContain('crmSellerId = sellerMapping.sellerId');
    expect(source).not.toContain('query.eq("owner_id", userId)');
  });

  it('versiona um vínculo 1:1, privado e imutável no banco canônico', () => {
    const migration = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../supabase/migrations/20261107134429_create_crm_seller_identity_links.sql',
      ),
      'utf8',
    );
    expect(migration).toContain('auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id)');
    expect(migration).toContain('crm_seller_id bigint NOT NULL UNIQUE');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain(
      'REVOKE ALL ON TABLE public.crm_seller_identity_links FROM authenticated',
    );
    expect(migration).toContain(
      'GRANT SELECT, INSERT ON TABLE public.crm_seller_identity_links TO service_role',
    );
    expect(migration).not.toMatch(/GRANT[^;]*(UPDATE|DELETE)/);
  });

  it('mantém validação e diagnósticos antes de consumir o probe do circuit breaker', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
      'utf8',
    );
    expect(source.indexOf('if (diagOp === "breaker_status")')).toBeLessThan(
      source.indexOf('if (!breaker.canRequest())'),
    );
    expect(source.indexOf('const parsed = CrmRequestSchema.safeParse(rawBody)')).toBeLessThan(
      source.indexOf('if (!breaker.canRequest())'),
    );
    expect(source).toContain('else breaker.recordSuccess()');
  });

  it('propaga o vendedor CRM e o papel para SELECT, SEARCH e BATCH', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
      'utf8',
    );
    expect(source).toMatch(
      /handleBatch\(crm, body\.queries \|\| \[\], crmSellerId, auth\.userRole\)/,
    );
    expect(source).toMatch(/handleSelect\(crm, body, crmSellerId, auth\.userRole\)/);
    expect(source).toMatch(/handleSearch\(crm, body, crmSellerId, auth\.userRole\)/);
  });

  it('nega roles desconhecidas e aplica o escopo a vendedor e agente', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
      'utf8',
    );
    expect(source).toContain(
      'const ROLE_ORDER = ["dev", "admin", "supervisor", "manager", "coordenador", "vendedor", "agente"]',
    );
    expect(source).toContain('if (!userRole)');
    expect(isSellerScopedRole('vendedor')).toBe(true);
    expect(isSellerScopedRole('agente')).toBe(true);
    expect(isSellerScopedRole('coordenador')).toBe(false);
    expect(isSellerScopedRole('supervisor')).toBe(false);
    expect(isSellerScopedRole('admin')).toBe(false);
    expect(isSellerScopedRole('dev')).toBe(false);
    expect(isRestrictedWriteRole('vendedor')).toBe(true);
    expect(isRestrictedWriteRole('agente')).toBe(true);
    expect(isRestrictedWriteRole('coordenador')).toBe(true);
    expect(isRestrictedWriteRole('supervisor')).toBe(false);
  });

  it('exige AAL2 para mutações e diagnósticos de credenciais', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
      'utf8',
    );
    expect(source).toContain('aal: readJwtAal(token)');
    expect(source).toContain('if (mutatingOperation && auth.aal !== "aal2")');
    expect(source).toContain('if (diagOp === "creds_health" && auth.aal !== "aal2")');
  });

  it('recria o client CRM quando a credencial rotaciona', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
      'utf8',
    );
    expect(source).toContain('cachedCrmCredentialFingerprint');
    expect(source).toContain('crypto.subtle.digest(');
    expect(source).toContain('cachedCrmCredentialFingerprint === fingerprint');
    expect(source).toContain('cachedCrmCredentialFingerprint = fingerprint');
  });
});
