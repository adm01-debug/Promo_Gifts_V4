import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const audit = fileURLToPath(new URL('.', import.meta.url));
const server = await createServer({
  root, configFile: false, cacheDir: fs.mkdtempSync(join(tmpdir(), 'magazine-vite-')),
  plugins: [{name:'audit-local-fixtures', enforce:'pre',
    load(id) {
      if (id === root + '/src/main.tsx') return fs.readFileSync(audit + '/main.tsx','utf8');
      if (id === root + '/src/contexts/AuthContext.tsx') return 'export const useAuth = () => ({user:{id:"audit-owner"}});';
      if (id === root + '/src/hooks/products/useProducts.ts') return 'export const useProducts = (options) => ({data:window.__products.filter(p => !options.search || p.name.toLowerCase().includes(options.search.toLowerCase()) || p.sku.includes(options.search)),isLoading:false});';
      if (id === root + '/src/lib/crm-db.ts') return 'export const selectCrm = async () => [{id:"client-a",razao_social:"Alfa Cliente",cnpj:"12345678000100",is_customer:true},{id:"client-b",razao_social:"Beta Cliente",cnpj:"98765432000100",is_customer:true}];';
      if (id === root + '/src/pages/magazine/hooks/useMagazineGoldImport.ts') return 'export const useMagazineGoldImport = () => ({});';
      if (id === root + '/src/services/magazineService.ts') return 'export const productToSnapshot = (p) => p; export const magazineService = new Proxy({}, {get:(_,method)=>(...args)=>window.__service[method](...args)});';
    }
  },react()],
  resolve:{alias:{'@':root+'/src'},dedupe:['react','react-dom']},
  server:{host:'127.0.0.1',port:8098,strictPort:true,fs:{allow:[root,audit]}},
});
await server.listen();
console.log('Audit fixture server: http://127.0.0.1:8098 — synthetic data only');
