-- Index definitions for Orders table to support Broadcast & Claim system
-- These indexes ensure efficient querying for the new workflow

-- Composite index for finding broadcast orders
-- Used in: /api/driver/available-orders
CREATE INDEX IF NOT EXISTS idx_orders_broadcast_claims 
ON public.orders (status, claimed_by, created_at) 
WHERE status = 'broadcast' AND claimed_by IS NULL;

-- Index for tracking claimed orders by driver
-- Used in Driver Dashboard and order history
CREATE INDEX IF NOT EXISTS idx_orders_driver_status 
ON public.orders (driver_id, status, created_at) 
WHERE driver_id IS NOT NULL;

-- Index for admin dashboard filtering
-- Used in: /app/api/admin/orders/route.ts
CREATE INDEX IF NOT EXISTS idx_orders_admin_filters 
ON public.orders (vendor_id, status, created_at DESC);

-- Index for order claim transaction performance
-- Used in: claim_order function
CREATE INDEX IF NOT EXISTS idx_orders_claim_lock 
ON public.orders (id, status, claimed_by) 
WHERE status = 'broadcast';

-- Index for customer order history
-- Used in Customer Dashboard
CREATE INDEX IF NOT EXISTS idx_orders_customer_history 
ON public.orders (customer_id, status, created_at DESC) 
WHERE customer_id IS NOT NULL;

-- Index for vendor order tracking
-- Used in Vendor Dashboard
CREATE INDEX IF NOT EXISTS idx_orders_vendor_tracking 
ON public.orders (vendor_id, status, broadcast_at DESC, created_at DESC) 
WHERE vendor_id IS NOT NULL;