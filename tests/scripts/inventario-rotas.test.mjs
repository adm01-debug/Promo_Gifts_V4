// Contrato de scripts/inventario/gerar-rotas.mjs: extrai rotas de src/routes/*.tsx com guardas
// proprias, de wrapper e herdadas do AppRoutes.tsx; marca harness de dev; acha dados por acesso a tabela.
import { describe, expect, it } from 'vitest';

import { componentesDoLocal, dadosDe, edgesChamadasNoCodigo, extrairRotas, guardasDosGrupos } from '../../scripts/inventario/gerar-rotas.mjs';

const APP = `
export function AppRoutes() {
  return (
    <Routes>
      {publicRoutes}
      {Harness && <Route path="/__visual/x" element={<Harness />} />}
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedAppLayout />}>
          {adminRoutes}
          {quoteRoutes}
        </Route>
      </Route>
      {notFoundRoute}
    </Routes>
  );
}`;

const ADMIN = `
export const adminRoutes = (
  <>
    <Route path="/tendencias" element={<TrendsPage />} />
    <Route element={<AdminRoute />}>
      <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
      <Route element={<DevRoute />}>
        <Route path="/admin/seguranca" element={<SegurancaPage />} />
      </Route>
    </Route>
    <Route path="/magazine/:id" element={<MagazineRoute><MagazineEditorPage /></MagazineRoute>} />
  </>
);`;

describe('guardasDosGrupos', () => {
  it('grupos montados dentro de <ProtectedRoute/> herdam a guarda; layout nao conta', () => {
    const g = guardasDosGrupos(APP);
    expect(g.adminRoutes).toEqual(['ProtectedRoute']);
    expect(g.quoteRoutes).toEqual(['ProtectedRoute']);
    expect(g.publicRoutes).toEqual([]);
    expect(g.notFoundRoute).toEqual([]);
  });
});

describe('extrairRotas', () => {
  const rotas = extrairRotas(ADMIN, { arquivo: 'admin-routes.tsx', guardasDoGrupo: guardasDosGrupos(APP) });
  const por = Object.fromEntries(rotas.map((r) => [r.path, r]));

  it('guardas herdadas + aninhadas', () => {
    expect(por['/tendencias'].guardas).toEqual(['ProtectedRoute']);
    expect(por['/admin/usuarios'].guardas).toEqual(['ProtectedRoute', 'AdminRoute']);
    expect(por['/admin/seguranca'].guardas).toEqual(['ProtectedRoute', 'AdminRoute', 'DevRoute']);
  });

  it('wrapper no element vira guarda e a tela e o componente de dentro', () => {
    expect(por['/magazine/:id'].componente).toBe('MagazineEditorPage');
    expect(por['/magazine/:id'].guardas).toEqual(['ProtectedRoute', 'MagazineRoute']);
    expect(por['/admin/usuarios'].grupo).toBe('adminRoutes');
  });

  it('harness condicional (X && <Route/>) e /__* saem como somente_dev', () => {
    const app = extrairRotas(APP, { arquivo: 'AppRoutes.tsx' });
    expect(app).toHaveLength(1);
    expect(app[0]).toMatchObject({ path: '/__visual/x', componente: 'Harness', somente_dev: true });
    expect(por['/tendencias'].somente_dev).toBe(false);
  });
});

describe('dadosDe', () => {
  it('tabelas (incl. wrappers), buckets, RPCs e edges (SDK, helper com generico e URL)', () => {
    const d = dadosDe(`
      supabase.from('quotes'); untypedFrom<X>('quote_items'); dbInvoke({ table: 'products' });
      supabase.storage.from('avatars'); supabase.rpc('fn_total');
      supabase.functions.invoke('send-email'); invokeEdge('cnpj-lookup'); fetch(\`\${base}/functions/v1/rls-matrix-export\`);
    `);
    expect(d.tabelas).toEqual(['products', 'quote_items', 'quotes']);
    expect(d.buckets).toEqual(['avatars']);
    expect(d.rpcs).toEqual(['fn_total']);
    expect(d.edges).toEqual(['cnpj-lookup', 'rls-matrix-export', 'send-email']);
  });
});

describe('edgesChamadasNoCodigo', () => {
  it('generico em varias linhas, constante, condicional, FUNCTIONS_URL; ignora lista de nomes', () => {
    const nomes = edgesChamadasNoCodigo(`
      const FN = 'intelligence-substitute-applied';
      await invokeEdge<{
        ok: boolean;
        itens: Array<{ id: string }>;
      }>('commemorative-dates', { body: {} });
      supabase.functions.invoke(FN);
      supabase.functions.invoke(mode === 'audit' ? 'audit-suite' : 'simulation-orchestrator', {});
      const READ = \`\${SUPABASE_FUNCTIONS_URL}/magazine-reader-state-read\`;
      const LISTA = ['ai-recommendations', 'outra-edge'];
      await invokeFullScopeFunction({
        functionName: 'mcp-keys-rotate',
        body: { id },
      });
    `);
    expect([...nomes].sort()).toEqual([
      'audit-suite', 'commemorative-dates', 'intelligence-substitute-applied', 'magazine-reader-state-read', 'mcp-keys-rotate',
      'simulation-orchestrator',
    ]);
  });
});

describe('comentarios nao contam como chamada', () => {
  it('chamada removida que ficou so em comentario nao e chamador nem dado', () => {
    const code = `
      // FIX: supabase.functions.invoke('external-db-bridge') removido
      /* antes: supabase.from('tabela_antiga') */
      const url = 'https://exemplo.com/functions/v1/edge-real';
    `;
    expect([...edgesChamadasNoCodigo(code)]).toEqual(['edge-real']);
    expect(dadosDe(code).tabelas).toEqual([]);
  });
});

describe('componentesDoLocal', () => {
  it('wrapper local aponta para o que ele renderiza, nao para o arquivo de rotas', () => {
    const code = `
function KitBuilderRoute() {
  const location = useLocation();
  return <KitBuilderPage key={location.key} />;
}

function KitBuilderLegacyRedirect() {
  return <Navigate to="/montar-kit" replace />;
}
`;
    expect(componentesDoLocal(code, 'KitBuilderRoute')).toEqual(['KitBuilderPage']);
    expect(componentesDoLocal(code, 'KitBuilderLegacyRedirect')).toEqual(['Navigate']);
    expect(componentesDoLocal(code, 'NaoExiste')).toEqual([]);
  });
});
