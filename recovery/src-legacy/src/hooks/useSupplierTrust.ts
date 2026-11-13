/**
 * Hook to fetch real supplier trust data for badges.
 * Sources: variant_supplier_sources (lead_time_days) + suppliers (active flag).
 * Keeps trust unknown when no real data is available; demo data stays in test fixtures.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db/bridge';
import { type SupplierTrustData } from '@/components/common/SocialProof';
import { logger } from '@/lib/logger';

interface VSSRecord {
  id: string;
  supplier_id: string;
  lead_time_days: number | null;
  is_preferred: boolean;
  is_active: boolean;
}

interface SupplierRecord {
  id: string;
  name: string;
  active: boolean | null;
}

/**
 * Fetches real supplier trust data for a product.
 * Returns unknown trust as fallback if no real data is found.
 */
export function useSupplierTrust(productId?: string) {
  return useQuery({
    queryKey: ['supplier-trust', productId],
    queryFn: async (): Promise<SupplierTrustData> => {
      if (!productId) return { isVerified: false, deliveryDays: null, avgRating: null };

      try {
        // 1. Get variant IDs for this product first
        const variantResult = await invokeExternalDb<{ id: string }>({
          table: 'product_variants',
          operation: 'select',
          select: 'id',
          filters: { product_id: productId, is_active: true },
          limit: 10,
          countMode: 'none',
        });

        const variantIds = variantResult.records.map((v) => v.id);
        if (!variantIds.length) {
          return { isVerified: false, deliveryDays: null, avgRating: null };
        }

        // 2. Get preferred supplier source using variant_id
        const vssResult = await invokeExternalDb<VSSRecord>({
          table: 'variant_supplier_sources',
          operation: 'select',
          select: 'id,supplier_id,lead_time_days,is_preferred,is_active',
          filters: { variant_id: variantIds[0], is_active: true },
          orderBy: { column: 'is_preferred', ascending: false },
          limit: 5,
          countMode: 'none',
        });

        const sources = vssResult.records;
        if (!sources.length) {
          // No real data — trust remains unknown
          return { isVerified: false, deliveryDays: null, avgRating: null };
        }

        // Use preferred source, or first active one
        const preferred = sources.find((s) => s.is_preferred) ?? sources[0];
        const leadTimeDays = preferred.lead_time_days;

        // 2. Check if supplier is "verified" (active in suppliers table)
        let isVerified = false;
        if (preferred.supplier_id) {
          try {
            const supplierResult = await invokeExternalDb<SupplierRecord>({
              table: 'suppliers',
              operation: 'select',
              select: 'id,name,active',
              filters: { id: preferred.supplier_id },
              limit: 1,
              countMode: 'none',
            });
            if (supplierResult.records.length) {
              isVerified = supplierResult.records[0].active === true;
            }
          } catch {
            // Supplier lookup failed — mark as not verified
            isVerified = false;
          }
        }

        // 3. No ratings source exists yet; never present demo ratings as real.
        const avgRating = null; // Will be replaced when ratings table exists

        return {
          isVerified,
          deliveryDays: leadTimeDays,
          avgRating,
        };
      } catch (err) {
        logger.warn('[useSupplierTrust] Failed to fetch real data; trust is unknown:', err);
        return { isVerified: false, deliveryDays: null, avgRating: null };
      }
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
}
