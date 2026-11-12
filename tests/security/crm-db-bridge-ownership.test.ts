import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  crmOwnerScope,
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
    expect(crmOwnerScope('companies', 'vendedor', 'u1')).toEqual({
      kind: 'filter',
      column: 'user_id',
      value: 'u1',
    });
    expect(crmOwnerScope('contacts', 'vendedor', 'u1')).toEqual({
      kind: 'filter',
      column: 'user_id',
      value: 'u1',
    });
  });

  it('e-mails/telefones do contato seguem o dono do contato (regra do dono, 12/11)', () => {
    for (const table of ['contact_emails', 'contact_phones']) {
      expect(crmOwnerScope(table, 'vendedor', 'u1')).toEqual({
        kind: 'via', parent: 'contacts', parentColumn: 'user_id', fk: 'contact_id', value: 'u1',
      });
    }
  });

  it('vendedor em tabela PII sem dono nem pai com dono (customers) é negado (403), não 500', () => {
    expect(crmOwnerScope('customers', 'vendedor', 'u1')).toEqual({ kind: 'deny' });
    expect(crmOwnerScope('contacts', 'vendedor', undefined)).toEqual({ kind: 'deny' });
  });

  it('roles amplas e tabelas sem PII não recebem filtro', () => {
    expect(crmOwnerScope('companies', 'admin', 'u1')).toEqual({ kind: 'none' });
    expect(crmOwnerScope('companies', 'supervisor', 'u1')).toEqual({ kind: 'none' });
    expect(crmOwnerScope('suppliers', 'vendedor', 'u1')).toEqual({ kind: 'none' });
  });

  it('o handler não filtra mais por owner_id', () => {
    expect(bridgeSource).not.toMatch(/\.eq\(\s*["']owner_id["']/);
    expect(bridgeSource).toContain('crmOwnerScope(table, userRole, userId)');
    // o MESMO escopo vale para select, search e batch (antes search/batch devolviam a base inteira)
    expect(bridgeSource.match(/await applyOwnerScope\(/g)?.length).toBe(3);
    expect(bridgeSource).toContain('handleSearch(crm, body, auth.userId ?? undefined, auth.userRole)');
    expect(bridgeSource).toContain('handleBatch(crm, body.queries || [], auth.userId ?? undefined, auth.userRole)');
    expect(bridgeSource).toContain('resolveCrmRole(roles)');
  });
});
