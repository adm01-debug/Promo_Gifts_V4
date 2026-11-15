/**
 * Escopo de ownership do crm-db-bridge — mecanismo CANÔNICO (vínculo fixo de vendedor).
 *
 * HISTÓRIA DESTE ARQUIVO (importante para quem for editar):
 * Até 2026-11-14 este teste fixava o mecanismo ANTIGO, de `ownership.ts`:
 *   - o vendedor era descoberto pelo E-MAIL a cada requisição (`resolveCrmUserId(crm, auth.email)`);
 *   - e `crmOwnerScope` devolvia "os registros DELE **ou** os SEM DONO"
 *     (`ownerOrExpression` → `<coluna>.eq.<valor>,<coluna>.is.null`).
 *
 * As duas coisas foram revogadas por decisão do dono em 2026-11-14, com número medido no CRM:
 * de 48.623 clientes, 13.501 (28%) não tinham vendedor atribuído e apareciam para todos. A decisão
 * foi: **só o vendedor dono vê cada cliente**. E o vínculo passou a ser fixo
 * (`public.crm_seller_identity_links`, 1:1 `auth_user_id` → `crm_seller_id`), para que trocar o
 * e-mail de alguém não transfira carteira.
 *
 * Por isso as asserções sobre `crmOwnerScope` saíram: elas afirmavam a regra revogada, e o módulo
 * que as implementava ficou sem nenhum importador de produção. O que este arquivo faz agora é
 * **mais estrito** do que antes: trava o mecanismo novo E impede a volta do antigo.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  OWNERSHIP_RULES,
  isSellerScopedRole,
  isRestrictedWriteRole,
  isTableSellerScoped,
  sellerScopeFilter,
} from '../../supabase/functions/crm-db-bridge/query-policy';

const BRIDGE_DIR = path.join(process.cwd(), 'supabase/functions/crm-db-bridge');
const indexSrc = fs.readFileSync(path.join(BRIDGE_DIR, 'index.ts'), 'utf8');

describe('crm-db-bridge — resolução de role', () => {
  it('papéis amplos não são tratados como vendedor', () => {
    for (const role of ['admin', 'owner', 'gestor', 'coordenador']) {
      expect(isSellerScopedRole(role)).toBe(false);
    }
  });

  it('vendedor e agente têm escopo por carteira', () => {
    expect(isSellerScopedRole('vendedor')).toBe(true);
    expect(isSellerScopedRole('agente')).toBe(true);
  });

  it('vendedor, agente e coordenador têm escrita restrita', () => {
    for (const role of ['vendedor', 'agente', 'coordenador']) {
      expect(isRestrictedWriteRole(role)).toBe(true);
    }
    expect(isRestrictedWriteRole('admin')).toBe(false);
  });

  it('a role mais ampla vence quando o usuário tem várias (ROLE_ORDER no handler)', () => {
    // O handler resolve pela primeira role de ROLE_ORDER que o usuário tem, então a ordem
    // do array é o contrato: ampla antes de restrita.
    const m = indexSrc.match(/ROLE_ORDER\s*=\s*\[([^\]]*)\]/);
    expect(m, 'ROLE_ORDER não encontrado em index.ts').not.toBeNull();
    const ordem = (m![1].match(/"[^"]+"|'[^']+'/g) ?? []).map((s) => s.slice(1, -1));
    expect(ordem.length).toBeGreaterThan(1);
    // Contrato: toda role ampla precede toda role de escopo restrito, senão um admin que
    // também seja vendedor teria a visão escopada do vendedor.
    const restritas = ordem.filter((r) => isSellerScopedRole(r));
    const amplas = ordem.filter((r) => !isSellerScopedRole(r));
    expect(restritas).toEqual(['vendedor', 'agente']);
    expect(amplas.length).toBeGreaterThan(0);
    const ultimaAmpla = Math.max(...amplas.map((r) => ordem.indexOf(r)));
    const primeiraRestrita = Math.min(...restritas.map((r) => ordem.indexOf(r)));
    expect(ultimaAmpla).toBeLessThan(primeiraRestrita);
    expect(indexSrc).toMatch(/ROLE_ORDER\.find\(/);
  });
});

describe('crm-db-bridge — escopo estrito por vendedor dono (decisão do dono, 2026-11-14)', () => {
  it('as 5 tabelas de dado de cliente são escopadas', () => {
    for (const table of [
      'companies',
      'contacts',
      'contact_emails',
      'contact_phones',
      'customers',
    ] as const) {
      expect(isTableSellerScoped(table)).toBe(true);
      expect(sellerScopeFilter(table)).not.toBeNull();
    }
  });

  it('customers filtra pela coluna real vendedor_id', () => {
    expect(OWNERSHIP_RULES.customers).toEqual({ kind: 'direct', filterColumn: 'vendedor_id' });
    expect(sellerScopeFilter('customers')).toEqual({ column: 'vendedor_id' });
  });

  it('as filhas seguem o dono pela relação, não por coluna própria', () => {
    expect(OWNERSHIP_RULES.contact_emails).toMatchObject({
      kind: 'relation',
      relation: 'contacts.companies.customers',
    });
    expect(OWNERSHIP_RULES.contact_phones).toMatchObject({
      kind: 'relation',
      relation: 'contacts.companies.customers',
    });
  });

  it('o handler aplica o escopo com .eq, não com .or', () => {
    expect(indexSrc).toMatch(/query\s*=\s*query\.eq\(scopeFilter\.column,\s*sellerId\s*\?\?\s*-1\)/);
  });
});

describe('crm-db-bridge — a regra revogada não pode voltar', () => {
  it('nenhum escopo "ou sem dono": sem .or( nem is.null no handler', () => {
    // A regra antiga mostrava ao vendedor os registros sem dono. Reintroduzir qualquer uma
    // destas duas formas devolveria os 13.501 clientes sem vendedor para todo mundo.
    expect(indexSrc).not.toMatch(/\.or\(/);
    expect(indexSrc).not.toMatch(/is\.null/);
    expect(indexSrc).not.toMatch(/ownerOrExpression/);
  });

  it('o vendedor não é mais descoberto pelo e-mail a cada requisição', () => {
    // O e-mail serve APENAS para criar o vínculo na primeira vez (bootstrap). Depois disso,
    // quem decide o escopo é crm_seller_identity_links — senão trocar o e-mail de alguém
    // transferiria a carteira.
    expect(indexSrc).not.toMatch(/resolveCrmUserId/);
    expect(indexSrc).toMatch(/crm_seller_identity_links/);
    expect(indexSrc).toMatch(/resolveCrmSellerId/);
  });

  it('o bootstrap por e-mail grava o vínculo e detecta ambiguidade', () => {
    // Sem a gravação, cada requisição refaria a busca por e-mail e o vínculo nunca fixaria.
    // Sem o limit(2), dois usuários do CRM com o mesmo e-mail passariam silenciosamente.
    const bootstrap = indexSrc.slice(indexSrc.indexOf('async function resolveCrmSellerId'));
    expect(bootstrap).toMatch(/\.from\("crm_seller_identity_links"\)/);
    expect(bootstrap).toMatch(/\.insert\(/);
    expect(bootstrap).toMatch(/link_source/);
    expect(bootstrap).toMatch(/\.limit\(2\)/);
    expect(bootstrap).toMatch(/is_active/);
    expect(bootstrap).toMatch(/is_vendedor/);
  });

  it('sem vendedor resolvido, o escopo não abre: cai em -1, que não casa com nenhum id', () => {
    expect(indexSrc).toMatch(/sellerId\s*\?\?\s*-1/);
  });
});

describe('crm-db-bridge — fornecedor e transportadora não são dado de cliente', () => {
  it('suppliers e carriers ficam sem escopo por vendedor', () => {
    // A decisão de privacidade foi sobre carteira de CLIENTES. Escopar fornecedor e
    // transportadora deixaria o cadastro de produto com a lista vazia para vendedor e
    // agente — e elas não eram escopadas antes desta mudança.
    for (const table of ['suppliers', 'carriers'] as const) {
      expect(OWNERSHIP_RULES[table]).toEqual({ kind: 'none' });
      expect(isTableSellerScoped(table)).toBe(false);
      expect(sellerScopeFilter(table)).toBeNull();
    }
  });
});
