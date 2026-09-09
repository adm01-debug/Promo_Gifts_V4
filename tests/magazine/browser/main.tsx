import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import MagazineListPage from '@/pages/magazine/MagazineListPage';
const MagazineEditorPage = React.lazy(() => import('@/pages/magazine/MagazineEditorPage'));
const MagazinePrintPage = React.lazy(() => import('@/pages/magazine/MagazinePrintPage'));
import Gallery from '@/pages/magazine/templates-gallery/MagazineTemplatesGalleryPage';
import { buildMockMagazine } from '@/pages/magazine/templates-gallery/mockMagazine';
import { listTemplates } from '@/pages/magazine/components/templates/TemplateRegistry';
import './index.css';
import './styles/brand-tokens.css';
import './styles/missing-root-tokens.css';
import './styles/diversity-overrides.css';
const fixture = buildMockMagazine('editorial-vogue');
fixture.id = 'audit-magazine';
fixture.ownerId = 'audit-owner';
fixture.title = 'Soluções que aproximam';
fixture.subtitle = 'Descrição exclusiva auditável';
fixture.branding.clientName = 'Alfa Cliente';
fixture.items = fixture.items.map((item, index) => ({
  ...item,
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
}));
window.__products = fixture.items.map((it, i) => ({
  ...it.productSnapshot,
  primary_image_url: it.productSnapshot.image_url,
  category_name: i % 2 ? 'Escritório' : 'Tecnologia',
}));
let stored = structuredClone(fixture);
window.__calls = [];
window.__stored = () => structuredClone(stored);
window.__delay = 0;
window.__service = {
  create: async (input) => {
    window.__calls.push({ method: 'create', input });
    stored = {
      ...structuredClone(fixture),
      id: 'created-audit',
      items: [],
      templateId: input.templateId,
    };
    return structuredClone(stored);
  },
  list: async () =>
    Array.from({ length: 8 }, (_, i) => ({
      ...structuredClone(stored),
      id: i === 0 ? stored.id : `audit-${i}`,
      status: i < 3 ? 'draft' : i < 7 ? 'published' : 'archived',
      templateId: listTemplates()[i].id,
      viewCount: i * 100,
    })),
  get: async () => structuredClone(stored),
  update: async (id, patch) => {
    window.__calls.push({ method: 'update', title: patch.title });
    if (window.__failSave) throw Error('Synthetic save failure');
    Object.assign(stored, structuredClone(patch));
    return structuredClone(stored);
  },
  addProducts: async (id, products) => {
    window.__calls.push({ method: 'addProducts', ids: products.map((p) => p.id) });
    await new Promise((r) => setTimeout(r, window.__delay));
    for (const p of products)
      if (!stored.items.some((i) => i.productId === p.id))
        stored.items.push({
          id: `new-${p.id}`,
          productId: p.id,
          productSnapshot: p,
          position: stored.items.length + 1,
          variantColorName: null,
          overrides: {},
          pageNumber: null,
        });
    return structuredClone(stored);
  },
  removeItem: async (id, itemId) => {
    stored.items = stored.items.filter((i) => i.id !== itemId);
    return structuredClone(stored);
  },
  reorderItems: async (id, orderedIds) => {
    const byId = new Map(stored.items.map((item) => [item.id, item]));
    stored.items = orderedIds.map((itemId, index) => ({ ...byId.get(itemId), position: index }));
    return structuredClone(stored);
  },
  updateItem: async (id, itemId, patch) => {
    Object.assign(
      stored.items.find((i) => i.id === itemId),
      patch,
    );
    return structuredClone(stored);
  },
  publish: async () => {
    stored.status = 'published';
    stored.publicToken = 'audit-only';
    return structuredClone(stored);
  },
  unpublish: async () => {
    stored.status = 'draft';
    stored.publicToken = null;
    return structuredClone(stored);
  },
  reactivate: async () => {
    stored.status = 'draft';
    return structuredClone(stored);
  },
};
window.__reset = (empty = false) => {
  stored = structuredClone(fixture);
  if (empty) stored.items = [];
  window.__calls = [];
};
window.__forceStatus = (status) => {
  stored.status = status;
};
window.__registry = listTemplates().map(({ Component, ...entry }) => entry);
function Controls() {
  window.__navigate = useNavigate();
  return null;
}
createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TooltipProvider>
        <BrowserRouter>
          <Controls />
          <React.Suspense fallback={<p>Carregando...</p>}>
            <Routes>
              <Route path="/magazine" element={<MagazineListPage />} />
              <Route path="/magazine/templates" element={<Gallery />} />
              <Route path="/magazine/:id/print" element={<MagazinePrintPage />} />
              <Route path="/magazine/:id" element={<MagazineEditorPage />} />
            </Routes>
          </React.Suspense>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>,
);
