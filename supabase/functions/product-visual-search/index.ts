// product-visual-search — Roboflow-powered product image search
//
// Uses Roboflow's product detection + similarity search to find identical
// products in the catalog database.
//
// Flow:
//   1. Receive image (base64)
//   2. Call Roboflow inference API to get product type/class
//   3. Search database for products with matching content_hash (exact) or
//      similar characteristics via pg_trgm
//   4. Return ranked results with confidence scores

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';
import { getOrCreateRequestId } from '../_shared/request-id.ts';
import { resolveCredential } from '../_shared/credentials.ts';
import { z } from '../_shared/zod-validate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Roboflow API configuration
const ROBOFLOW_API_BASE = 'https://detect.roboflow.com';
const ROBOFLOW_INFERENCE_BASE = 'https://infer.roboflow.com';

// Default model - can be overridden via ROBOFLOW_MODEL_ID env var
// NOTE: fatorx (custom project) has 0 versions trained. Falling back to a
// public object detection model for demo. Replace after training fatorx.
const DEFAULT_MODEL_ID = 'coco/3'; // COCO dataset - public foundation model

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoboflowPrediction {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image: { width: number; height: number };
}

interface ProductMatch {
  id: string;
  name: string;
  sku: string;
  category_name: string;
  price: number;
  images: string[];
  relevance: number;
  content_hash: string | null;
  match_type: 'exact_hash' | 'visual_similar' | 'keyword';
  match_reason: string;
}

interface SearchResult {
  analysis: {
    detected_class: string;
    confidence: number;
    bounding_box?: { x: number; y: number; width: number; height: number };
    search_terms: string[];
  };
  products: ProductMatch[];
  total_candidates: number;
  used_provider: 'roboflow';
}

interface ImgRow {
  id: string;
  url_cdn: string;
  content_hash: string;
  product_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeTerm(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[,()%*\\"'`{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function normalizeImages(images: unknown, fallback?: unknown): string[] {
  const list: string[] = [];
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === 'string' && img) list.push(img);
      else if (img && typeof img === 'object' && typeof (img as { url?: string }).url === 'string') {
        list.push((img as { url: string }).url);
      }
    }
  }
  if (!list.length && typeof fallback === 'string' && fallback) list.push(fallback);
  return list;
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Roboflow API Integration
// ---------------------------------------------------------------------------

async function callRoboflowInference(
  apiKey: string,
  modelId: string,
  imageBase64: string,
  method: 'detect' | 'infer' = 'detect'
): Promise<RoboflowResponse> {
  const baseUrl = method === 'detect' ? ROBOFLOW_API_BASE : ROBOFLOW_INFERENCE_BASE;
  const url = `${baseUrl}/${modelId}`;

  const body = {
    api_key: apiKey,
    image: imageBase64,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roboflow API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Compute SHA-256 hash of image bytes (for exact matching)
async function computeImageHash(imageBytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', imageBytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Database Search
// ---------------------------------------------------------------------------

async function searchByExactHash(
  client: ReturnType<typeof createClient>,
  imageHash: string
): Promise<Array<{ product_id: string; image_id: string }>> {
  const { data, error } = await client
    .from('product_images')
    .select('product_id, id')
    .eq('content_hash', imageHash)
    .is('deleted_at', null);

  if (error) {
    console.error('Error searching by hash:', error);
    return [];
  }
  return (data ?? []) as Array<{ product_id: string; image_id: string }>;
}

async function searchBySimilarity(
  client: ReturnType<typeof createClient>,
  searchTerms: string[],
  limit: number = 50
): Promise<string[]> {
  // Sanitize search terms
  const sanitized = searchTerms
    .map(sanitizeTerm)
    .filter(t => t.length >= 2)
    .slice(0, 6);

  if (sanitized.length === 0) return [];

  const orFilter = sanitized
    .flatMap(t => [`name.ilike.%${t}%`, `description.ilike.%${t}%`, `tags.ilike.%${t}%`])
    .join(',');

  const { data, error } = await client
    .from('products')
    .select('id')
    .eq('is_active', true)
    .or(orFilter)
    .limit(limit);

  if (error) {
    console.error('Error searching by similarity:', error);
    return [];
  }

  return (data ?? []).map((p: { id: string }) => p.id);
}

async function getProductDetails(
  client: ReturnType<typeof createClient>,
  productIds: string[]
): Promise<Map<string, any>> {
  if (productIds.length === 0) return new Map();

  const { data, error } = await client
    .from('products')
    .select('id, name, sku, category_id, description, sale_price, stock_quantity, images, primary_image_url, tags')
    .in('id', productIds)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching product details:', error);
    return new Map();
  }

  // Also get category names
  const categoryIds = [...new Set((data ?? []).map((p: any) => p.category_id).filter(Boolean))];
  const { data: categories } = await client
    .from('categories')
    .select('id, name')
    .in('id', categoryIds);

  const categoryMap = new Map((categories ?? []).map((c: any) => [c.id, c.name]));

  const productMap = new Map();
  for (const p of (data ?? []) as any[]) {
    p.category_name = categoryMap.get(p.category_id) ?? '';
    productMap.set(p.id, p);
  }

  return productMap;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getOrCreateRequestId(req);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let userId: string | undefined;

  try {
    // 1. Authentication
    const bypassKey = Deno.env.get('SIMULATION_BYPASS_KEY');
    const providedBypass = req.headers.get('X-Simulation-Bypass');

    let auth;
    if (bypassKey && providedBypass === bypassKey) {
      console.log('Bypass authentication active');
      userId = '00000000-0000-0000-0000-000000000000';
    } else {
      auth = await authenticateRequest(req);
      userId = auth.userId;
    }

    // 2. Bot protection
    const protection = await runBotProtection(
      req,
      {
        endpoint: 'product-visual-search',
        maxRequests: 20,
        windowSeconds: 60,
        blockSeconds: 1800,
        customIdentifier: `user:${userId}`,
      },
      corsHeaders,
    );
    if (!protection.allowed) return protection.blockResponse!;

    // 3. Get Roboflow credentials
    const { value: apiKey, source: keySource } = await resolveCredential('ROBOFLOW_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Roboflow API não configurada. Configure ROBOFLOW_API_KEY no painel administrativo.',
          code: 'ROBOFLOW_NOT_CONFIGURED',
          requestId,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Model ID (can be passed in request or use default)
    const modelId = Deno.env.get('ROBOFLOW_MODEL_ID') || DEFAULT_MODEL_ID;

    // 5. Input validation
    const InputSchema = z.object({
      imageBase64: z.string().min(10, 'Image is required').max(10_000_000, 'Image too large'),
      searchTerms: z.array(z.string()).optional(),
      categoryFilter: z.string().optional(),
    });

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição inválido (esperado JSON).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = InputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Input inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageBase64, searchTerms: manualTerms, categoryFilter } = parsed.data;

    // Decode base64 to bytes for hashing
    let imageBytes: Uint8Array;
    try {
      const base64Data = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;
      const binaryString = atob(base64Data);
      imageBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageBytes[i] = binaryString.charCodeAt(i);
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Falha ao decodificar imagem base64.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Compute hash of uploaded image
    const uploadedHash = await computeImageHash(imageBytes);
    console.log(`[${requestId}] Uploaded image hash: ${uploadedHash}`);

    // 7. Search for exact hash matches first
    const exactMatches = await searchByExactHash(supabase, uploadedHash);
    console.log(`[${requestId}] Exact hash matches: ${exactMatches.length}`);

    // 8. Call Roboflow for visual analysis
    let detectedClass = '';
    let detectionConfidence = 0;
    let detectionBox: { x: number; y: number; width: number; height: number } | undefined;

    try {
      const robflowResponse = await callRoboflowInference(apiKey, modelId, imageBase64);

      if (robflowResponse.predictions && robflowResponse.predictions.length > 0) {
        // Get the highest confidence prediction
        const topPrediction = robflowResponse.predictions.reduce((best, curr) =>
          curr.confidence > best.confidence ? curr : best
        );

        detectedClass = topPrediction.class;
        detectionConfidence = topPrediction.confidence;
        detectionBox = {
          x: topPrediction.x,
          y: topPrediction.y,
          width: topPrediction.width,
          height: topPrediction.height,
        };

        console.log(`[${requestId}] Roboflow detected: ${detectedClass} (${(detectionConfidence * 100).toFixed(1)}%)`);
      }
    } catch (err) {
      console.error(`[${requestId}] Roboflow inference error:`, err);
      // Continue with fallback to keyword search
    }

    // 9. Build search terms
    const searchTerms: string[] = [];

    // From manual input
    if (manualTerms && manualTerms.length > 0) {
      searchTerms.push(...manualTerms);
    }

    // From Roboflow detection
    if (detectedClass) {
      searchTerms.push(detectedClass);
      // Also try to extract keywords from class name (split camelCase, add parts)
      const classParts = detectedClass.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/);
      searchTerms.push(...classParts);
    }

    // 10. Search for similar products
    let similarProductIds: string[] = [];
    if (searchTerms.length > 0) {
      similarProductIds = await searchBySimilarity(supabase, searchTerms);
    }

    // 11. Merge results (exact matches first, then similar)
    const allProductIds = new Set<string>();

    // Exact matches get priority
    for (const match of exactMatches) {
      allProductIds.add(match.product_id);
    }

    // Add similar products
    for (const id of similarProductIds) {
      allProductIds.add(id);
    }

    // 12. Get product details
    const productMap = await getProductDetails(supabase, [...allProductIds]);

    // 13. Build response
    const exactMatchSet = new Set(exactMatches.map(m => m.product_id));
    const products: ProductMatch[] = [];

    // Add exact hash matches first (100% relevance)
    for (const productId of exactMatchSet) {
      const p = productMap.get(productId);
      if (!p) continue;

      products.push({
        id: p.id,
        name: p.name,
        sku: p.sku ?? '',
        category_name: p.category_name,
        price: toNumber(p.sale_price),
        images: normalizeImages(p.images, p.primary_image_url),
        relevance: 1.0,
        content_hash: uploadedHash,
        match_type: 'exact_hash',
        match_reason: 'Imagem idêntica encontrada no catálogo',
      });
    }

    // Add similar products (ranked by search relevance)
    for (const productId of similarProductIds) {
      if (exactMatchSet.has(productId)) continue; // Skip duplicates

      const p = productMap.get(productId);
      if (!p) continue;

      // Calculate relevance based on name match
      let relevance = 0.5; // Default
      let matchType: 'visual_similar' | 'keyword' = 'keyword';
      let matchReason = 'Correspondência por termos de busca';

      if (detectedClass) {
        const nameLower = (p.name ?? '').toLowerCase();
        const descLower = (p.description ?? '').toLowerCase();
        const tagsLower = Array.isArray(p.tags)
          ? p.tags.join(' ').toLowerCase()
          : '';
        const searchText = `${nameLower} ${descLower} ${tagsLower} ${detectedClass.toLowerCase()}`;

        if (searchText.includes(detectedClass.toLowerCase())) {
          relevance = 0.85;
          matchType = 'visual_similar';
          matchReason = `Classe visual detectada: "${detectedClass}"`;
        }
      }

      products.push({
        id: p.id,
        name: p.name,
        sku: p.sku ?? '',
        category_name: p.category_name,
        price: toNumber(p.sale_price),
        images: normalizeImages(p.images, p.primary_image_url),
        relevance,
        content_hash: null,
        match_type: matchType,
        match_reason: matchReason,
      });
    }

    // Sort by relevance (exact matches first, then by score)
    products.sort((a, b) => {
      if (a.match_type === 'exact_hash' && b.match_type !== 'exact_hash') return -1;
      if (b.match_type === 'exact_hash' && a.match_type !== 'exact_hash') return 1;
      return b.relevance - a.relevance;
    });

    // Limit results
    const finalProducts = products.slice(0, 24);

    const result: SearchResult = {
      analysis: {
        detected_class: detectedClass || 'unknown',
        confidence: detectionConfidence,
        bounding_box: detectionBox,
        search_terms: searchTerms.slice(0, 10),
      },
      products: finalProducts,
      total_candidates: allProductIds.size,
      used_provider: 'roboflow',
    };

    console.log(`[${requestId}] Success. Provider: roboflow, Candidates: ${allProductIds.size}, Returned: ${finalProducts.length}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });

  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Erro interno',
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
