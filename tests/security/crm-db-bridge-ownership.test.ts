import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  crmOwnerScope, ownerOrExpression,
  resolveCrmRole,
} from '../../supabase/functions/crm-db-bridge/ownership';

const bridgeSource = fs.readFileSync(
  path.resolve(__dirname, '../../supabase/functions/crm-db-bridge/index.ts'),
  'utf-8',
);
const crmTypes = fs.readFileSync(path.resolve(__dirname, '../../src/types/crm.ts'), 'utf-8');

/** Corpo de uma interface de src/types/crm.ts (schema mapeado do CRM externo). */
function interfaceBody(name: string): string {
  const start = crmTypes.indexOf(`export interface ${name} {`);
  expect(start).toBeGreaterThan(-1);
  return crmTypes.slice(start, crmTypes.indexOf('\n}', start));
}

describe('crm-db-bridge — resolução de role (E083/E081)', () => {
  it.each(['dev', 'admin', 'supervisor', 'manager'])(
    "'%s' tem leitura ampla (não cai no fallback vendedor)",
    (role) => {
      expect(resolveCrmRole([role])).not.toBe('vendedor');
    },
  );

  it.each([['vendedor'], ['agente'], ['coordenador'], []])('%j é tratado como vendedor', (...roles) => {
    expect(resolveCrmRole(roles.filter(Boolean) as string[])).toBe('vendedor');
  });

  it('a role mais ampla vence quando o usuário tem várias', () => {
    expect(resolveCrmRole(['vendedor', 'admin'])).toBe('admin');
  });
});

describe('crm-db-bridge — escopo de ownership usa a coluna real do CRM', () => {
  it('companies.owner_id não existe no CRM; a coluna de dono é user_id', () => {
    const company = interfaceBody('CrmCompany');
    expect(company).not.toMatch(/\bowner_id\b/);
    expect(company).toMatch(/\buser_id: string \| null;/);
    expect(interfaceBody('CrmContact')).toMatch(/\buser_id: string \| null;/);
  });

  it('vendedor em companies/contacts filtra por user_id', () => {
    expect(crmOwnerScope('companies', 'vendedor', '11111111-1111-4111-8111-111111111111')).toEqual({
      kind: 'filter',
      column: 'user_id',
      value: '11111111-1111-4111-8111-111111111111',
    });
    expect(crmOwnerScope('contacts', 'vendedor', '11111111-1111-4111-8111-111111111111')).toEqual({
      kind: 'filter',
      column: 'user_id',
      value: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('e-mails/telefones do contato seguem o dono do contato (regra do dono, 12/11)', () => {
    for (const table of ['contact_emails', 'contact_phones']) {
      expect(crmOwnerScope(table, 'vendedor', '11111111-1111-4111-8111-111111111111')).toEqual({
        kind: 'via', parent: 'contacts', parentColumn: 'user_id', fk: 'contact_id', value: '11111111-1111-4111-8111-111111111111',
      });
    }
  });

  it('customers: vendedor filtra pela coluna real vendedor_id (FK → users.id do CRM)', () => {
    expect(crmOwnerScope('customers', 'vendedor', '11111111-1111-4111-8111-111111111111')).toEqual({ kind: 'filter', column: 'vendedor_id', value: '11111111-1111-4111-8111-111111111111' });
  });

  it('vendedor sem vínculo com o CRM vê só os SEM dono (regra do dono, 13/11)', () => {
    expect(crmOwnerScope('contacts', 'vendedor', undefined)).toEqual({ kind: 'filter', column: 'user_id', value: null });
    expect(crmOwnerScope('contact_emails', 'vendedor', undefined)).toEqual({
      kind: 'via', parent: 'contacts', parentColumn: 'user_id', fk: 'contact_id', value: null,
    });
  });

  it('id do CRM que não é uuid nunca é interpolado no filtro (vira "sem vínculo")', () => {
    expect(crmOwnerScope('companies', 'vendedor', 'x,user_id.not.is.null')).toEqual({ kind: 'filter', column: 'user_id', value: null });
    expect(ownerOrExpression('user_id', 'x),or(id.not.is.null')).toBe('user_id.is.null');
    expect(ownerOrExpression('user_id', '11111111-1111-4111-8111-111111111111')).toBe(`user_id.eq.${'11111111-1111-4111-8111-111111111111'},user_id.is.null`);
    expect(ownerOrExpression('vendedor_id', null)).toBe('vendedor_id.is.null');
  });

  it('roles amplas e tabelas sem PII não recebem filtro', () => {
    expect(crmOwnerScope('companies', 'admin', 'u1')).toEqual({ kind: 'none' });
    expect(crmOwnerScope('companies', 'supervisor', 'u1')).toEqual({ kind: 'none' });
    expect(crmOwnerScope('suppliers', 'vendedor', 'u1')).toEqual({ kind: 'none' });
  });

  it('o handler não filtra mais por owner_id', () => {
    expect(bridgeSource).not.toMatch(/\.eq\(\s*["']owner_id["']/);
    // o MESMO escopo vale para select, search e batch (antes search/batch devolviam a base inteira)
    expect(bridgeSource.match(/= applyOwnerScope\(crm, /g)?.length).toBe(3);
    // o dono no CRM é o usuário do CRM com o mesmo e-mail, não o auth.uid do app
    expect(bridgeSource).toContain('resolveCrmUserId(crm, auth.email)');
    expect(bridgeSource).toContain('handleSearch(crm, body, crmOwnerId, auth.userRole)');
    expect(bridgeSource).toContain('handleBatch(crm, body.queries || [], crmOwnerId, auth.userRole)');
    // batch bloqueia embedding no select (vazamento comprovado na 5ª revisão)
    expect(bridgeSource).toMatch(/q\.select && !SELECT_SAFE_RE\.test\(q\.select\)/);
    expect(bridgeSource).toContain('resolveCrmRole(roles)');
  });
});
