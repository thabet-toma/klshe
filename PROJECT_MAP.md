# Broadcast & Claim System Implementation

This document outlines the implementation of the new order assignment flow that migrates from "Admin Assigned" to "Broadcast & Claim" system.

## Overview

### Current Behavior (Deprecated)
- Admins manually assign orders to drivers through the admin dashboard
- Drivers can only see orders that have been assigned to them

### New Behavior (Implemented)
- New orders are automatically set to status "broadcast" and visible to all active drivers
- The first driver to accept an order claims it through a transaction-safe API endpoint
- Admins can still view order details but cannot manually assign broadcast orders
- Race conditions are prevented through database transactions

## Database Changes

### New Fields in orders table
- `broadcast_at` (timestamptz): Timestamp when the order was broadcasted to drivers
- `claimed_at` (timestamptz): Timestamp when order was claimed by a driver
- `claimed_by` (text): Reference to the driver who claimed the order (delivery_drivers.id)
- `prep_status` (text): Preparation status — pending | preparing | ready
- `accepted_at` (timestamptz): When the order was accepted
- `ready_at` (timestamptz): When preparation was completed
- `picked_at` (timestamptz): When the driver picked up the order
- `delivered_at` (timestamptz): When the order was delivered
- `cancellation_reason` (text): Reason for cancellation
- `eta_minutes` (integer): Estimated time of arrival in minutes

### New Status
- Added `broadcast` status to orders table between `new` and `accepted`
- Full status cycle: new → broadcast → accepted → preparing → ready → dispatched → on_way → delivered
- Alternative: rejected, cancelled

### New Functions
- `claim_order(order_id, driver_id)`: Transaction-safe function for claiming orders with race condition protection
- `is_driver_assigned(target_driver_id)`: Checks if driver belongs to current user
- `on_order_delivered(order_id)`: Finalizes delivered order (sales invoice + vendor balance with commission)
- `trg_on_order_delivered()`: Trigger that auto-calls on_order_delivered when status becomes 'delivered'

### New Indexes
- `idx_orders_broadcast`: Partial index on broadcast_at where status='broadcast' and claimed_by is null
- `idx_orders_claimed_by`: Index on claimed_by
- `idx_orders_driver`: Index on driver_id

## API Changes

### New Endpoints
- `GET /api/driver/available-orders`: Returns all broadcast orders available for claiming
- `POST /api/driver/claim-order`: Allows drivers to claim orders with transaction safety

### Modified Endpoints
- `POST /api/orders`: Now sets status to "broadcast" with broadcast_at timestamp
- `PATCH /api/vendor/orders/[id]`: Updated for hybrid cycle (accept/reject/preparing/ready)
- `GET /api/admin/orders`: Includes claim tracking fields in response

## Frontend Changes

### Driver Components
- `AvailableOrders.tsx`: Component showing broadcast orders drivers can claim with real-time updates
- `DriverHome.tsx`: Updated to include available orders section

### Admin Components
- `OrdersBoard.tsx`: Updated to handle broadcast status and removed driver assignment UI for broadcast orders

## Security & Permissions

### RLS Policies Updated
- `orders_driver_select_assigned_or_broadcast`: Allows drivers to see their assigned orders AND broadcast orders
- `orders_customer_select_own`: Customers see only their own orders
- `orders_vendor_rw_own`: Vendors can read/write their own orders
- `orders_platform_admin_all`: Platform admins have full access

### Race Condition Protection
- Implemented transaction-based claiming mechanism via `claim_order()` RPC function
- Database locks (FOR UPDATE) prevent multiple drivers from claiming the same order
- Clear error messages for failed claim attempts

## Deployment Instructions

### Required Supabase Migrations
1. `migration_002→019` (base migrations, if not already applied)
2. **`migration_024_broadcast_claim_fixed.sql`** — THE authoritative migration (supersedes 022/023)
   - Do NOT apply 022/023 — they are broken and superseded by 024
   - migration_024 drops and recreates all objects from 022/023

### CLI Commands to Deploy
```bash
# Apply via Supabase Dashboard SQL Editor or CLI
# migration_024 is idempotent — safe to run multiple times
```

### Testing Checklist
1. Verify new orders appear in "broadcast" status
2. Confirm drivers can view available orders
3. Test claiming workflow with multiple drivers
4. Verify race condition protection
5. Check admin dashboard shows proper status
6. Confirm orders are automatically timestamped
7. Verify commission calculation on delivery (commission_pct from platform_settings)

## Backward Compatibility
- Existing orders without broadcast fields will continue to work
- The system gracefully handles mixed status orders
- Admin assignment still works for non-broadcast orders if needed

## Monitoring
- Claim attempts return distinct error codes (DRIVER_NOT_FOUND_OR_INACTIVE, ORDER_NOT_AVAILABLE_FOR_CLAIM, etc.)
- Performance indexes ensure efficient querying at scale
- Realtime publication on orders and order_items tables

## M0 Phase Status
- [x] T0.1: migration_024_broadcast_claim_fixed.sql created
- [x] T0.3: on_order_delivered() commission fix included in migration_024
- [x] T0.4: lib/supabase/types.ts updated; as any removed from orders route; typecheck passes
- [ ] T0.2: Apply migrations to live Supabase (MANUAL — requires owner action)

## M1 Phase Status
- [x] T1.1: Removed duplicate `<AvailableOrders/>` in DriverHome.tsx
- [x] T1.2: Realtime channel name now unique per mount (`crypto.randomUUID()`)
- [x] T1.3: Order creation includes `accepted_at` + `prep_status: "pending"`
- [x] T1.4: Vendor actions updated for hybrid cycle (accept/reject/preparing/ready)
- [x] T1.5: DriverHome uses real API data (`GET /api/driver/orders`) instead of mock
- [x] T1.6: GET /api/driver/orders returns active tasks filtered by driver_id
- [x] T1.7: Middleware is fast-path redirect; API routes enforce actual security boundary
- [x] T1.8: Webhook idempotency (stripe_session_id check + 5min expiry + transaction insert)
- [x] T1.9: Schema enforces `z.number().int().nonnegative()` for all amounts

## M2 Phase Status
- [x] T2.1: `skipVendorAuthBecauseDemo` / `skipAdminAuthBecauseDemo` now require `DEMO_MODE==='true'` AND `NODE_ENV !== 'production'`
- [x] T2.2: Vendor summary pending filter updated to `['broadcast', 'dispatched', 'on_way']`
- [x] T2.3: `driver_id`/`claimed_by` already typed as `text` in types + handled correctly in admin PATCH
- [x] T2.4: OrderTrackingView rating error handling + CheckoutStepper loading guards (addressesLoading + estimating)
- [x] T2.5: `lib/order-status.ts` = المصدر الوحيد. `lib/types.OrderStatus` و`lib/mock` يعيدان التصدير منه؛ هُجّرت OrderTrackingView/OrdersList/DriverOrdersList/DriverOrderDetails/AdminDashboard/OrdersBoard كلها إليه (لا خريطة حالة مكرّرة)
- [x] T2.6: CORS allowlist logged at startup; rate-limit added to `/api/driver/claim-order`, `/api/payments/stripe/create-session`, `/api/auth/session`
- [x] T2.7: خصم مخزون **ذرّي** عبر `migration_025` RPC `decrement_inventory` (تحديث شرطي `stock >= qty` يمنع السالب/التسابق) — استُبدل منطق read-then-write

## M3 Phase Status
- [x] T3.1: OrdersList skeleton loading (3 بطاقات متحركة أثناء الجلب)
- [x] T3.2: ProductCard منع نقر مزدوج (`if (pulse) return` في handleAdd)
- [x] T3.3: product_name snapshot في order_items يحمي من حذف المنتج — OrderTrackingView reorder يستخدم `it.products?.unit/image ?? fallback`
- [x] T3.4: formatPrice (lib/currency.ts) هو المصدر الوحيد لعرض الأسعار — لا حساب يدوي ÷100 في العرض
- [x] T3.5: migration_022/023 وُسما بـ DEPRECATED header؛ مسار app/ خالٍ تماماً من استيراد lib/mock (AdminDashboard كان يستخدم `require()` — استُبدل بـ placeholder نظيف لإصلاح خطأ lint `no-require-imports`)

> مراجعة M3: T3.2/T3.3 صحيحان كما نُفِّذا. T3.4 سليم للعرض (بقي تحويلان agorot→shekel في حقول إدخال فقط لا عرض). الإصلاح الوحيد: `require("@/lib/mock")` في AdminDashboard كسر lint → placeholder فارغ. typecheck + build نظيفان.

## Future Enhancements
- Driver performance metrics from claim history
- Automatic order timeout system
- Driver reputation-based order prioritization
