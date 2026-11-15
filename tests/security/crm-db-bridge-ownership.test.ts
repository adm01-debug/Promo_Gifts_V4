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
 * que as implementava ficou sem nenhum importador de produção.
 *
 * REVERSÃO PARCIAL — decisão do dono de 2026-11-15 (vence a de 2026-11-14):
 * o vendedor COM vínculo no CRM passa a ver a carteira dele **MAIS** os clientes sem dono
 * (`vendedor_id IS NULL`). O vínculo fixo continua sendo o único mecanismo (nada de descoberta
 * por e-mail a cada requisição) e **vendedor SEM vínculo continua sem ver nada** (sentinela -1).
 * Logo: este arquivo agora EXIGE o `.or(... .is.null)` no escopo do vendedor com vínculo.
 * Se você chegou aqui achando que isso é regressão da decisão de 2026-11-14: NÃO É, e não
 * "restaure" o `.eq` — a mudança é decisão de negócio do dono, de 2026-11-15, registrada aqui
 * e na guarda de `query-policy.ts`. O que segue proibido é a descoberta do vendedor por e-mail
 * (`resolveCrmUserId`/`ownerOrExpression`) e qualquer abertura do escopo sem vínculo.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  OWNERSHIP_RULES,
  buildSellerScopedSelect,
  isSellerScopedRole,
  isRestrictedWriteRole,
  isTableSellerScoped,
  sellerScopeFilter,
  sellerScopeOrFilter,
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

describe('crm-db-bridge — escopo por vendedor dono (2026-11-14, revisto em 2026-11-15)', () => {
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

  it('o handler aplica o escopo do vendedor COM vínculo pelo .or (decisão de 2026-11-15)', () => {
    // Antes de 2026-11-15 este caso exigia `.eq(scopeFilter.column, sellerId ?? -1)`.
    // A decisão do dono de 2026-11-15 trocou o escopo do vendedor com vínculo por
    // "dele OU sem dono"; o ramo sem vínculo segue no `.eq(..., -1)` (caso adiante).
    expect(indexSrc).toMatch(/sellerScopeOrFilter\(scopeFilter\.column,\s*sellerId\)/);
    expect(indexSrc).toMatch(
      /query\.or\(scopeOr\.filters,\s*\{\s*referencedTable:\s*scopeOr\.referencedTable\s*\}\)/,
    );
    expect(indexSrc).toMatch(/query\.or\(scopeOr\.filters\)/);
  });
});

describe('crm-db-bridge — a regra revogada não pode voltar', () => {
  it('o escopo do vendedor COM vínculo inclui o sem dono nas 4 formas de coluna', () => {
    // Inverso do caso que existia até 2026-11-14 ("sem .or( nem is.null"): a decisão do dono
    // de 2026-11-15 manda o vendedor com vínculo ver a carteira dele MAIS os sem dono. Este
    // caso impede que alguém volte ao `.eq` puro sem uma nova decisão do dono.
    expect(sellerScopeOrFilter('vendedor_id', 7)).toEqual({
      filters: 'vendedor_id.eq.7,vendedor_id.is.null',
    });
    expect(sellerScopeOrFilter('__seller_scope.vendedor_id', 7)).toEqual({
      filters: 'vendedor_id.eq.7,vendedor_id.is.null',
      referencedTable: '__seller_scope',
    });
    expect(sellerScopeOrFilter('__seller_scope.customers.vendedor_id', 7)).toEqual({
      filters: 'vendedor_id.eq.7,vendedor_id.is.null',
      referencedTable: '__seller_scope.customers',
    });
    expect(sellerScopeOrFilter('__seller_scope.companies.customers.vendedor_id', 7)).toEqual({
      filters: 'vendedor_id.eq.7,vendedor_id.is.null',
      referencedTable: '__seller_scope.companies.customers',
    });
    // as 4 formas acima são exatamente as de OWNERSHIP_RULES — se nascer uma quinta, este
    // caso falha e obriga a provar a forma nova antes de ir a produção.
    const formas = new Set(
      (['customers', 'companies', 'contacts', 'company_addresses', 'company_social_media',
        'contact_emails', 'contact_phones'] as const).map((t) => sellerScopeFilter(t)!.column),
    );
    expect([...formas].sort()).toEqual([
      '__seller_scope.companies.customers.vendedor_id',
      '__seller_scope.customers.vendedor_id',
      '__seller_scope.vendedor_id',
      'vendedor_id',
    ]);
    // o que SEGUE revogado: descoberta do dono por e-mail a cada requisição.
    expect(indexSrc).not.toMatch(/ownerOrExpression/);
  });

  it('a querystring enviada ao PostgREST leva o or prefixado pelo caminho do embed', async () => {
    // Prova com o supabase-js REAL (sem mock do client): o "ou sem dono" em coluna embutida
    // só funciona como `<caminho do embed>.or=(coluna.eq.N,coluna.is.null)`. Se a forma
    // mudar, toda leitura de vendedor no CRM passa a dar erro — por isso a URL fica travada.
    const calls: string[] = [];
    const crm = createClient('http://crm.local', 'anon-key-de-teste', {
      global: {
        fetch: (async (input: Request | URL | string) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          calls.push(decodeURIComponent(url).replace('http://crm.local/rest/v1/', ''));
          return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
        }) as typeof fetch,
      },
    });

    const esperado: Record<string, string> = {
      customers: 'customers?select=*&or=(vendedor_id.eq.7,vendedor_id.is.null)',
      companies:
        'companies?select=*,__seller_scope:customers!inner(id)&__seller_scope.or=(vendedor_id.eq.7,vendedor_id.is.null)',
      contacts:
        'contacts?select=*,__seller_scope:companies!inner(customers!inner(id))&__seller_scope.customers.or=(vendedor_id.eq.7,vendedor_id.is.null)',
      contact_emails:
        'contact_emails?select=*,__seller_scope:contacts!inner(companies!inner(customers!inner(id)))&__seller_scope.companies.customers.or=(vendedor_id.eq.7,vendedor_id.is.null)',
    };

    for (const [table, url] of Object.entries(esperado)) {
      const scopeFilter = sellerScopeFilter(table as keyof typeof OWNERSHIP_RULES)!;
      const scopeOr = sellerScopeOrFilter(scopeFilter.column, 7);
      const select = buildSellerScopedSelect(undefined, table as keyof typeof OWNERSHIP_RULES, true);
      const query = crm.from(table).select(select) as unknown as {
        or: (f: string, o?: { referencedTable: string }) => PromiseLike<unknown>;
      };
      calls.length = 0;
      await (scopeOr.referencedTable
        ? query.or(scopeOr.filters, { referencedTable: scopeOr.referencedTable })
        : query.or(scopeOr.filters));
      expect(calls[0], table).toBe(url);
    }
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
    // A decisão de 2026-11-15 abriu o escopo APENAS para vendedor COM vínculo. Sem vínculo,
    // o sentinela FICA: o ramo do .or só existe quando sellerId é número.
    expect(indexSrc).toMatch(/query\.eq\(scopeFilter\.column,\s*-1\)/);
    expect(indexSrc).toMatch(/if\s*\(typeof sellerId === "number"\)/);
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
