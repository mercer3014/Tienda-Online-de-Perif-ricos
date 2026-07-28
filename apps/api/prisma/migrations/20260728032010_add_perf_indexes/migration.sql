-- CreateIndex
CREATE INDEX "product_events_product_id_event_type_session_id_created_at_idx" ON "product_events"("product_id", "event_type", "session_id", "created_at");

-- CreateIndex
CREATE INDEX "product_variants_price_idx" ON "product_variants"("price");
