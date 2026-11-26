/**
 * Contrato da tela /admin/vinculos-vendedor-crm (lib pura).
 *
 * Cobre o que quebra a operação sem barulho:
 *   1. Linhas inválidas da RPC (sem uuid / seller id <= 0) são descartadas.
 *   2. Filtro casa por e-mail, nome, id do CRM e uuid.
 *   3. Resumo separa vínculo manual do bootstrap automático do bridge.
 *   4. Validação do formulário recusa e-mail e id inválidos.
 *   5. Erros do PostgREST viram mensagem de operação (42501/23505/22023).
 *   6. Resultado da RPC de vínculo/desvínculo é interpretado sem `as`.
 */
import { describe, it, expect } from 'vitest';
import {
  describeCrmLinkError,
  filterCrmSellerLinks,
  isManualLink,
  linkActionMessage,
  linkSourceLabel,
  parseCrmSellerLinkResult,
  parseCrmSellerLinkRows,
  parseUnlinkResult,
  summarizeCrmSellerLinks,
  validateLinkInput,
  type CrmSellerLinkRow,
} from '@/lib/crm/seller-links';

const ROW: CrmSellerLinkRow = {
  auth_user_id: '11111111-1111-1111-1111-111111111111',
  crm_seller_id: 777,
  link_source: 'manual',
  created_at: '2026-11-26T11:00:00+00:00',
  full_name: 'Vendedor Um',
  email: 'vendedor1@loja.test',
};

describe('parseCrmSellerLinkRows', () => {
  it('aceita o payload da RPC e normaliza campos', () => {
    const rows = parseCrmSellerLinkRows([ROW, { ...ROW, crm_seller_id: '900', created_at: null }]);
    expect(rows).toHaveLength(2);
    expect(rows[1].crm_seller_id).toBe(900);
    expect(rows[1].created_at).toBeNull();
  });

  it('descarta linha sem uuid e com seller id inválido', () => {
    const rows = parseCrmSellerLinkRows([
      { ...ROW, auth_user_id: '' },
      { ...ROW, crm_seller_id: 0 },
      { ...ROW, crm_seller_id: 'abc' },
      null,
      'lixo',
      ROW,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].crm_seller_id).toBe(777);
  });

  it('devolve lista vazia para payload que não é array', () => {
    expect(parseCrmSellerLinkRows(null)).toEqual([]);
    expect(parseCrmSellerLinkRows({})).toEqual([]);
  });
});

describe('summarizeCrmSellerLinks', () => {
  it('conta manual e bootstrap e acha o vínculo mais recente', () => {
    const summary = summarizeCrmSellerLinks([
      ROW,
      { ...ROW, link_source: 'email_bootstrap', created_at: '2026-11-20T10:00:00+00:00' },
      { ...ROW, link_source: 'outro', created_at: null },
    ]);
    expect(summary).toEqual({
      total: 3,
      manual: 1,
      bootstrap: 1,
      lastLinkedAt: '2026-11-26T11:00:00+00:00',
    });
  });

  it('lista vazia produz resumo zerado', () => {
    expect(summarizeCrmSellerLinks([])).toEqual({
      total: 0,
      manual: 0,
      bootstrap: 0,
      lastLinkedAt: null,
    });
  });
});

describe('filterCrmSellerLinks', () => {
  const rows: CrmSellerLinkRow[] = [
    ROW,
    {
      ...ROW,
      auth_user_id: '22222222-2222-2222-2222-222222222222',
      crm_seller_id: 900,
      email: 'outro@loja.test',
      full_name: 'Vendedor Dois',
      link_source: 'email_bootstrap',
    },
  ];

  it('casa por e-mail sem diferenciar caixa', () => {
    expect(filterCrmSellerLinks(rows, 'VENDEDOR1@')).toEqual([ROW]);
  });

  it('casa por nome, id do CRM e prefixo do uuid', () => {
    expect(filterCrmSellerLinks(rows, 'dois')[0].crm_seller_id).toBe(900);
    expect(filterCrmSellerLinks(rows, '777')[0].crm_seller_id).toBe(777);
    expect(filterCrmSellerLinks(rows, '22222222')[0].crm_seller_id).toBe(900);
  });

  it('busca vazia devolve cópia da lista completa', () => {
    const result = filterCrmSellerLinks(rows, '   ');
    expect(result).toHaveLength(2);
    expect(result).not.toBe(rows);
  });
});

describe('validateLinkInput', () => {
  it('normaliza e-mail e aceita id positivo', () => {
    expect(validateLinkInput('  Vendedor1@Loja.Test ', '777')).toEqual({
      ok: true,
      email: 'vendedor1@loja.test',
      sellerId: 777,
    });
  });

  it('recusa e-mail vazio, e-mail inválido e id inválido', () => {
    expect(validateLinkInput('', '777')).toMatchObject({ ok: false });
    expect(validateLinkInput('sem-arroba', '777')).toMatchObject({ ok: false });
    expect(validateLinkInput('a@b.co', '0')).toMatchObject({ ok: false });
    expect(validateLinkInput('a@b.co', '-3')).toMatchObject({ ok: false });
    expect(validateLinkInput('a@b.co', '1.5')).toMatchObject({ ok: false });
  });
});

describe('parseCrmSellerLinkResult / parseUnlinkResult', () => {
  it('lê o retorno created/updated/unchanged da RPC de vínculo', () => {
    expect(
      parseCrmSellerLinkResult([
        {
          action: 'updated',
          previous_crm_seller_id: 501,
          auth_user_id: ROW.auth_user_id,
          email: 'vendedor1@loja.test',
        },
      ]),
    ).toEqual({
      action: 'updated',
      previous_crm_seller_id: 501,
      auth_user_id: ROW.auth_user_id,
      email: 'vendedor1@loja.test',
    });
  });

  it('rejeita ação desconhecida e payload sem uuid', () => {
    expect(
      parseCrmSellerLinkResult([{ action: 'apagado', auth_user_id: ROW.auth_user_id }]),
    ).toBeNull();
    expect(parseCrmSellerLinkResult([{ action: 'created' }])).toBeNull();
    expect(parseCrmSellerLinkResult(null)).toBeNull();
  });

  it('interpreta o escalar bigint do desvínculo e o nulo idempotente', () => {
    expect(parseUnlinkResult(777)).toBe(777);
    expect(parseUnlinkResult('900')).toBe(900);
    expect(parseUnlinkResult(null)).toBeNull();
  });
});

describe('rótulos e mensagens', () => {
  it('distingue vínculo manual do bootstrap por e-mail', () => {
    expect(isManualLink('manual')).toBe(true);
    expect(isManualLink('email_bootstrap')).toBe(false);
    expect(linkSourceLabel('manual')).toBe('Manual');
    expect(linkSourceLabel('email_bootstrap')).toBe('Automático (e-mail)');
    expect(linkSourceLabel(null)).toBe('Desconhecida');
  });

  it('descreve o efeito de cada ação para o operador', () => {
    expect(linkActionMessage('created', 'a@b.co')).toContain('Vínculo criado');
    expect(linkActionMessage('updated', 'a@b.co')).toContain('corrigido');
    expect(linkActionMessage('unchanged', null)).toContain('Nada mudou');
  });

  it('traduz os SQLSTATE das RPCs preservando a mensagem do banco', () => {
    expect(
      describeCrmLinkError({ code: '23505', message: 'O vendedor 777 já esta vinculado' }),
    ).toContain('Vendedor já vinculado.');
    expect(describeCrmLinkError({ code: '42501', message: 'Acesso restrito' })).toContain(
      'Sem permissão',
    );
    expect(describeCrmLinkError({ code: '22023', message: 'e-mail invalido' })).toContain(
      'Dados inválidos.',
    );
    expect(describeCrmLinkError({ code: 'XX000' })).toContain('Falha ao salvar o vínculo.');
    expect(describeCrmLinkError('boom')).toContain('Falha ao salvar o vínculo.');
  });
});
