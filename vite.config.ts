import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * Vite Configuration - Production Ready (perf/deep-optimization-2026)
 *
 * Otimizações aplicadas:
 * - codeSplitting do Rolldown: vendors estáveis sem capturar dependências de rotas lazy
 * - cssCodeSplit habilitado
 * - Oxc/Rolldown com comentários legais removidos e tree-shaking explícito
 * - optimizeDeps.include expandido para pré-bundling mais preciso
 */
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  const config: UserConfig & { test?: any } = {
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      isProd &&
        visualizer({
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },

    build: {
      outDir: 'dist',
      // Não gere source maps órfãos. O plugin de upload foi removido do
      // toolchain, então SENTRY_AUTH_TOKEN sozinho apenas colocava os .map no
      // deploy público e fazia o gate confundir código tree-shaken com runtime.
      // Ao restaurar um uploader, ele deve apagar os mapas após o envio antes
      // de check-production-harnesses e do empacotamento da Vercel.
      sourcemap: false,
      minify: 'oxc',
      target: 'esnext',
      chunkSizeWarningLimit: 2000,
      cssCodeSplit: true,
      reportCompressedSize: false,

      rolldownOptions: {
        // Equivalente semântico do antigo `esbuild.pure`: remove somente as
        // chamadas informativas em produção, preservando warn/error e os
        // efeitos colaterais dos argumentos.
        treeshake: {
          manualPureFunctions: isProd ? ['console.log', 'console.debug', 'console.info'] : [],
        },
        output: {
          comments: { legal: false },
          // Nomes de chunk mais legíveis (sem hash aleatório no nome)
          chunkFileNames: (chunkInfo) => {
            const name = chunkInfo.name || 'chunk';
            return `assets/${name}-[hash].js`;
          },
          // Vite 8 descontinuou a função `manualChunks`. A opção nativa do
          // Rolldown evita que um grupo capture recursivamente React ou o helper
          // de preload e os arraste para o critical path de todas as páginas.
          codeSplitting: {
            includeDependenciesRecursively: false,
            groups: [
              { name: 'runtime-vendor', test: /vite[\\/]preload-helper/, priority: 100 },
              {
                name: 'react-vendor',
                test: /node_modules[\\/](?:\\.deno[\\/][^/]+[\\/]node_modules[\\/])?(?:react|react-dom)[\\/]/,
                priority: 90,
              },
              {
                // Somente os ícones usados pelo shell/login. Agrupá-los evita
                // dezenas de requests de ~500 B sem puxar toda a biblioteca.
                name: 'critical-icons',
                test: /node_modules[\\/](?:\\.deno[\\/][^/]+[\\/]node_modules[\\/])?lucide-react[\\/].*[\\/](?:createLucideIcon|defaultAttributes|Icon|icons[\\/](?:bell|bug|check|chevron-down|chevron-up|circle-alert|copy|file-text|folder-open|heart|house|inbox|package|plus|refresh-cw|rotate-ccw|search|shield-alert|shopping-cart|trash-2|trending-up|triangle-alert|users)|shared[\\/]src[\\/]utils[\\/](?:mergeClasses|toKebabCase|toCamelCase|toPascalCase|hasA11yProp))\.[cm]?[jt]s$/,
                priority: 85,
              },
              {
                name: 'router-vendor',
                test: /node_modules[\\/](?:react-router|react-router-dom)[\\/]/,
                priority: 80,
              },
              { name: 'query-vendor', test: /node_modules[\\/]@tanstack[\\/]/, priority: 70 },
              { name: 'supabase-vendor', test: /node_modules[\\/]@supabase[\\/]/, priority: 70 },
              {
                // Módulos pequenos compartilhados pelo shell e por rotas lazy.
                // Sem este grupo, o preview HTTP/1 do gate abre mais de vinte
                // requests antes do primeiro paint, embora somem poucos KiB.
                name: 'app-shell',
                test: /src[\\/].*[\\/](?:requestId|structuredLogger|sentry|client|logger|chunk-recovery|VisuallyHidden|lazy-client|sanitize-error|sanitize-message|safeAuthCall|supabase-untyped|to-error-message|authService|AuthContext|providers|DevInfraGate|safeToast|rate-limit|auth-utils|post-login-redirect|session-recovery|supabase-direct|supabase-placeholder|useProfileRoles|useAuthMFA|useProductsColorsBatch|useDevGate|DevOnly|utils|skeleton|ModernSkeletons|skeleton\.config|SkeletonMonitor|SkeletonLoaders|ThemeContext|useCloudStatus|useErrorHandler|bridge-status-events|error-reporter|theme-presets|telemetryService|use-overlay-interactivity)\.(?:ts|tsx)$/,
                priority: 65,
              },
              { name: 'ui-vendor', test: /node_modules[\\/](?:@radix-ui|cmdk)[\\/]/, priority: 60 },
              { name: 'date-vendor', test: /node_modules[\\/]date-fns[\\/]/, priority: 50 },
              {
                name: 'charts-vendor',
                test: /node_modules[\\/](?:recharts|d3-[^/]+)[\\/]/,
                priority: 50,
              },
              { name: 'zod-vendor', test: /node_modules[\\/]zod[\\/]/, priority: 50 },
              {
                name: 'form-vendor',
                test: /node_modules[\\/](?:react-hook-form|@hookform)[\\/]/,
                priority: 50,
              },
              { name: 'toast-vendor', test: /node_modules[\\/]sonner[\\/]/, priority: 50 },
              {
                name: 'export-vendor',
                test: /node_modules[\\/](?:jspdf|html2canvas)[\\/]/,
                priority: 40,
              },
              {
                name: 'xlsx-vendor',
                test: /node_modules[\\/](?:@e965[\\/]xlsx|xlsx)[\\/]/,
                priority: 40,
              },
              { name: 'dnd-vendor', test: /node_modules[\\/]@dnd-kit[\\/]/, priority: 40 },
              { name: 'sentry-vendor', test: /node_modules[\\/]@sentry[\\/]/, priority: 40 },
              {
                name: 'markdown-vendor',
                test: /node_modules[\\/](?:react-markdown|remark-[^/]+)[\\/]/,
                priority: 40,
              },
              { name: 'pptx-vendor', test: /node_modules[\\/]pptxgenjs[\\/]/, priority: 40 },
              {
                name: 'utils-vendor',
                test: /node_modules[\\/](?:clsx|tailwind-merge|class-variance-authority)[\\/]/,
                priority: 30,
              },
              { name: 'zustand-vendor', test: /node_modules[\\/]zustand[\\/]/, priority: 30 },
            ],
          },
        },
      },
    },

    server: {
      port: 8080,
      host: '::',
      // Evita CSS/JS cacheado no preview durante o dev: força revalidação a
      // cada request, garantindo que mudanças de width/min-width (e qualquer
      // outro estilo) sejam refletidas imediatamente após o save.
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },

    preview: {
      port: 4173,
      host: true,
    },

    optimizeDeps: {
      // Vite 8 usa Rolldown também no pré-bundle de dependências. Manter o
      // alvo aqui evita o adaptador legado `esbuildOptions` e seu warning.
      rolldownOptions: {
        transform: {
          target: 'esnext',
        },
      },
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-hook-form',
        '@hookform/resolvers/zod',
        '@tanstack/react-query',
        '@tanstack/react-virtual',
        'framer-motion',
        'zustand',
        'sonner',
        'clsx',
        'tailwind-merge',
        'date-fns',
        'lucide-react',
        'zod',
        // Pré-bundlar helpers frequentes
        '@supabase/supabase-js',
        'nprogress',
      ],
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      retry: process.env.CI ? 2 : 0,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'json-summary'],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        include: ['src/components/search/**'],
        exclude: ['src/components/search/__tests__/**'],
      },
    },
  };

  return config;
});
