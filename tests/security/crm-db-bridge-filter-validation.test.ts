import { describe, expect, it } from 'vitest';
import {
  addCompanyAddressFilterSelect,
  hasMutationTarget,
  splitCompanyAddressFilters,
  validateFilters,
  validateQueryColumns,
  validateSelect,
} from '../../supabase/functions/crm-db-bridge/query-policy';

describe('crm-db-bridge — validação de campos', () => {
  it('aceita os campos reais usados por empresas e rejeita aliases inexistentes', () => {
    expect(validateSelect('id,razao_social,ramo_atividade,nicho_cliente', 'companies')).toBeNull();
    expect(validateSelect('id,ramo,nicho', 'companies')).toBe(
      "Coluna 'ramo' não existe em 'companies'",
    );
    expect(validateFilters({ deleted_at: null, is_customer: true }, 'companies')).toBeNull();
    expect(validateFilters({ owner_id: 'user' }, 'companies')).toBe(
      "Coluna 'owner_id' não é filtrável em 'companies'",
    );
  });

  it('traduz cidade e estado para a relação de endereços sem expor embedding do caller', () => {
    expect(validateFilters({ cidade: 'Curitiba', estado: 'PR' }, 'companies')).toBeNull();
    const split = splitCompanyAddressFilters({
      is_customer: true,
      cidade: 'Curitiba',
      estado: 'PR',
    });
    expect(split).toEqual({
      direct: { is_customer: true },
      address: { cidade: 'Curitiba', estado: 'PR' },
    });
    expect(addCompanyAddressFilterSelect('id', split.address)).toBe(
      'id,__address_filter:company_addresses!inner(id)',
    );
  });

  it('rejeita filtros e colunas de busca/ordenação desconhecidos antes do PostgREST', () => {
    expect(validateFilters({ id: { raw: 'or true' } }, 'companies')).toBe(
      "Operador de filtro inválido para 'id'",
    );
    expect(validateFilters({ id: { in: [] } }, 'companies')).toBe("Filtro 'in' inválido para 'id'");
    expect(
      validateQueryColumns(
        { search: { column: 'owner_id', term: 'x' }, orderBy: 'razao_social asc' },
        'companies',
      ),
    ).toBe("Coluna 'owner_id' não existe em 'companies'");
    expect(validateQueryColumns({ orderBy: 'owner_id desc' }, 'companies')).toBe(
      "Coluna de ordenação 'owner_id' não existe em 'companies'",
    );
  });

  it('rejeita arrays fora de in, operandos estruturados e payloads excessivos', () => {
    expect(validateFilters({ id: ['a', 'b'] }, 'companies')).toBe(
      "Valor de filtro inválido para 'id'",
    );
    expect(validateFilters({ id: { eq: { nested: true } } }, 'companies')).toBe(
      "Operando 'eq' inválido para 'id'",
    );
    expect(validateFilters({ id: { in: [{ nested: true }] } }, 'companies')).toBe(
      "Filtro 'in' inválido para 'id'",
    );
    expect(validateFilters({ razao_social: { ilike: 'x'.repeat(501) } }, 'companies')).toBe(
      "Filtro 'ilike' inválido para 'razao_social'",
    );
  });

  it('valida returning com a mesma allowlist de select', () => {
    expect(validateQueryColumns({ returning: 'id,razao_social' }, 'companies')).toBeNull();
    expect(validateQueryColumns({ returning: 'id,users(password_hash)' }, 'companies')).toBe(
      "Coluna 'users(password_hash)' não existe em 'companies'",
    );
  });

  it('impede UPDATE e DELETE sem predicado efetivo', () => {
    expect(hasMutationTarget(undefined, undefined)).toBe(false);
    expect(hasMutationTarget(undefined, {})).toBe(false);
    expect(hasMutationTarget(undefined, { id: [] })).toBe(true);
    expect(hasMutationTarget('f77f789c-5bed-4cf5-949d-9eed9ac1582d', undefined)).toBe(true);
    expect(hasMutationTarget(undefined, { id: { eq: 'customer-1' } })).toBe(true);
  });

  it('valida campos reais nas tabelas filhas', () => {
    expect(
      validateQueryColumns(
        {
          select: 'contact_id,email',
          filters: { contact_id: { in: ['a', 'b'] } },
          orderBy: { column: 'created_at', ascending: false },
        },
        'contact_emails',
      ),
    ).toBeNull();
    expect(validateSelect('contact_id,phone', 'contact_phones')).toBe(
      "Coluna 'phone' não existe em 'contact_phones'",
    );
  });
});
