-- Rollback de E042 lote 1: reverte policies de authenticated → public
-- Desfaz as 9 tabelas cobertas por 20261018000042_e042_fix_policies_public_lote1.sql
-- Substitui TO authenticated por TO public em todas as policies recriadas

-- b2b_collection_products
DROP POLICY IF EXISTS "collection_products_delete" ON public.b2b_collection_products;
CREATE POLICY "collection_products_delete"
  ON public.b2b_collection_products FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM b2b_collections c
    WHERE ((c.id = b2b_collection_products.b2b_collection_id)
      AND is_org_owner_or_admin(c.organization_id))));

DROP POLICY IF EXISTS "collection_products_insert" ON public.b2b_collection_products;
CREATE POLICY "collection_products_insert"
  ON public.b2b_collection_products FOR INSERT TO public
  WITH CHECK (EXISTS ( SELECT 1 FROM b2b_collections c
    WHERE ((c.id = b2b_collection_products.b2b_collection_id)
      AND is_org_owner_or_admin(c.organization_id))));

DROP POLICY IF EXISTS "collection_products_select" ON public.b2b_collection_products;
CREATE POLICY "collection_products_select"
  ON public.b2b_collection_products FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM b2b_collections c
    WHERE ((c.id = b2b_collection_products.b2b_collection_id)
      AND user_is_org_member(c.organization_id))));

DROP POLICY IF EXISTS "collection_products_update" ON public.b2b_collection_products;
CREATE POLICY "collection_products_update"
  ON public.b2b_collection_products FOR UPDATE TO public
  USING (EXISTS ( SELECT 1 FROM b2b_collections c
    WHERE ((c.id = b2b_collection_products.b2b_collection_id)
      AND is_org_owner_or_admin(c.organization_id))));

-- b2b_collections
DROP POLICY IF EXISTS "b2b_collections_delete" ON public.b2b_collections;
CREATE POLICY "b2b_collections_delete"
  ON public.b2b_collections FOR DELETE TO public
  USING (is_org_owner_or_admin(organization_id));

DROP POLICY IF EXISTS "b2b_collections_insert" ON public.b2b_collections;
CREATE POLICY "b2b_collections_insert"
  ON public.b2b_collections FOR INSERT TO public
  WITH CHECK (is_org_owner_or_admin(organization_id));

DROP POLICY IF EXISTS "b2b_collections_select" ON public.b2b_collections;
CREATE POLICY "b2b_collections_select"
  ON public.b2b_collections FOR SELECT TO public
  USING (user_is_org_member(organization_id));

DROP POLICY IF EXISTS "b2b_collections_update" ON public.b2b_collections;
CREATE POLICY "b2b_collections_update"
  ON public.b2b_collections FOR UPDATE TO public
  USING (is_org_owner_or_admin(organization_id))
  WITH CHECK (is_org_owner_or_admin(organization_id));

-- kit_comments
DROP POLICY IF EXISTS "Author can delete own comment" ON public.kit_comments;
CREATE POLICY "Author can delete own comment"
  ON public.kit_comments FOR DELETE TO public
  USING ((author_id = ( SELECT auth.uid())) OR is_admin(( SELECT auth.uid())));

DROP POLICY IF EXISTS "Owner or collab can comment" ON public.kit_comments;
CREATE POLICY "Owner or collab can comment"
  ON public.kit_comments FOR INSERT TO public
  WITH CHECK ((author_id = ( SELECT auth.uid()))
    AND (is_kit_owner(kit_id, ( SELECT auth.uid()))
      OR is_kit_collaborator(kit_id, ( SELECT auth.uid()))));

DROP POLICY IF EXISTS "View comments if owner/collab/admin" ON public.kit_comments;
CREATE POLICY "View comments if owner/collab/admin"
  ON public.kit_comments FOR SELECT TO public
  USING (is_kit_owner(kit_id, ( SELECT auth.uid()))
    OR is_kit_collaborator(kit_id, ( SELECT auth.uid()))
    OR is_admin(( SELECT auth.uid())));

DROP POLICY IF EXISTS "Author can edit own comment" ON public.kit_comments;
CREATE POLICY "Author can edit own comment"
  ON public.kit_comments FOR UPDATE TO public
  USING ((author_id = ( SELECT auth.uid())) OR is_admin(( SELECT auth.uid())))
  WITH CHECK ((author_id = ( SELECT auth.uid())) OR is_admin(( SELECT auth.uid())));

-- kit_component_enrichment_raw
DROP POLICY IF EXISTS "kcer_admin_delete" ON public.kit_component_enrichment_raw;
CREATE POLICY "kcer_admin_delete"
  ON public.kit_component_enrichment_raw FOR DELETE TO public
  USING (is_admin_or_above(( SELECT auth.uid())));

DROP POLICY IF EXISTS "kcer_admin_insert" ON public.kit_component_enrichment_raw;
CREATE POLICY "kcer_admin_insert"
  ON public.kit_component_enrichment_raw FOR INSERT TO public
  WITH CHECK (is_admin_or_above(( SELECT auth.uid())));

DROP POLICY IF EXISTS "kcer_read_auth" ON public.kit_component_enrichment_raw;
CREATE POLICY "kcer_read_auth"
  ON public.kit_component_enrichment_raw FOR SELECT TO public
  USING (( SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "kcer_admin_update" ON public.kit_component_enrichment_raw;
CREATE POLICY "kcer_admin_update"
  ON public.kit_component_enrichment_raw FOR UPDATE TO public
  USING (is_admin_or_above(( SELECT auth.uid())))
  WITH CHECK (is_admin_or_above(( SELECT auth.uid())));

-- kit_component_padronizacao
DROP POLICY IF EXISTS "kcpad_admin_delete" ON public.kit_component_padronizacao;
CREATE POLICY "kcpad_admin_delete"
  ON public.kit_component_padronizacao FOR DELETE TO public
  USING (is_admin_or_above(( SELECT auth.uid())));

DROP POLICY IF EXISTS "kcpad_admin_insert" ON public.kit_component_padronizacao;
CREATE POLICY "kcpad_admin_insert"
  ON public.kit_component_padronizacao FOR INSERT TO public
  WITH CHECK (is_admin_or_above(( SELECT auth.uid())));

DROP POLICY IF EXISTS "kcpad_read_auth" ON public.kit_component_padronizacao;
CREATE POLICY "kcpad_read_auth"
  ON public.kit_component_padronizacao FOR SELECT TO public
  USING (( SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "kcpad_admin_update" ON public.kit_component_padronizacao;
CREATE POLICY "kcpad_admin_update"
  ON public.kit_component_padronizacao FOR UPDATE TO public
  USING (is_admin_or_above(( SELECT auth.uid())))
  WITH CHECK (is_admin_or_above(( SELECT auth.uid())));

-- kit_variants
DROP POLICY IF EXISTS "Owner can delete variants" ON public.kit_variants;
CREATE POLICY "Owner can delete variants"
  ON public.kit_variants FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM custom_kits k
    WHERE ((k.id = kit_variants.kit_master_id)
      AND (k.user_id = ( SELECT auth.uid())))));

DROP POLICY IF EXISTS "Owner can insert variants" ON public.kit_variants;
CREATE POLICY "Owner can insert variants"
  ON public.kit_variants FOR INSERT TO public
  WITH CHECK (EXISTS ( SELECT 1 FROM custom_kits k
    WHERE ((k.id = kit_variants.kit_master_id)
      AND (k.user_id = ( SELECT auth.uid())))));

DROP POLICY IF EXISTS "Owner can view variants" ON public.kit_variants;
CREATE POLICY "Owner can view variants"
  ON public.kit_variants FOR SELECT TO public
  USING ((EXISTS ( SELECT 1 FROM custom_kits k
    WHERE ((k.id = kit_variants.kit_master_id)
      AND (k.user_id = ( SELECT auth.uid())))))
    OR is_admin(( SELECT auth.uid())));

DROP POLICY IF EXISTS "Owner can update variants" ON public.kit_variants;
CREATE POLICY "Owner can update variants"
  ON public.kit_variants FOR UPDATE TO public
  USING (EXISTS ( SELECT 1 FROM custom_kits k
    WHERE ((k.id = kit_variants.kit_master_id)
      AND (k.user_id = ( SELECT auth.uid())))))
  WITH CHECK (EXISTS ( SELECT 1 FROM custom_kits k
    WHERE ((k.id = kit_variants.kit_master_id)
      AND (k.user_id = ( SELECT auth.uid())))));

-- notification_preferences
DROP POLICY IF EXISTS "notification_preferences_delete" ON public.notification_preferences;
CREATE POLICY "notification_preferences_delete"
  ON public.notification_preferences FOR DELETE TO public
  USING (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notification_preferences_insert" ON public.notification_preferences;
CREATE POLICY "notification_preferences_insert"
  ON public.notification_preferences FOR INSERT TO public
  WITH CHECK (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notification_preferences_select" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select"
  ON public.notification_preferences FOR SELECT TO public
  USING (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notification_preferences_update" ON public.notification_preferences;
CREATE POLICY "notification_preferences_update"
  ON public.notification_preferences FOR UPDATE TO public
  USING (( SELECT auth.uid()) = user_id)
  WITH CHECK (( SELECT auth.uid()) = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete"
  ON public.push_subscriptions FOR DELETE TO public
  USING (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert"
  ON public.push_subscriptions FOR INSERT TO public
  WITH CHECK (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select"
  ON public.push_subscriptions FOR SELECT TO public
  USING (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "push_subscriptions_update" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update"
  ON public.push_subscriptions FOR UPDATE TO public
  USING (( SELECT auth.uid()) = user_id)
  WITH CHECK (( SELECT auth.uid()) = user_id);

-- recently_viewed_products
DROP POLICY IF EXISTS "Users can delete their own recently viewed products" ON public.recently_viewed_products;
CREATE POLICY "Users can delete their own recently viewed products"
  ON public.recently_viewed_products FOR DELETE TO public
  USING (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own recently viewed products" ON public.recently_viewed_products;
CREATE POLICY "Users can insert their own recently viewed products"
  ON public.recently_viewed_products FOR INSERT TO public
  WITH CHECK (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own recently viewed products" ON public.recently_viewed_products;
CREATE POLICY "Users can view their own recently viewed products"
  ON public.recently_viewed_products FOR SELECT TO public
  USING (( SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own recently viewed products" ON public.recently_viewed_products;
CREATE POLICY "Users can update their own recently viewed products"
  ON public.recently_viewed_products FOR UPDATE TO public
  USING (( SELECT auth.uid()) = user_id)
  WITH CHECK (( SELECT auth.uid()) = user_id);
