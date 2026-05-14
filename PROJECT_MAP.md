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
- `claimed_by` (uuid): Reference to the driver who claimed the order (delivery_drivers.id)

### New Status
- Added `broadcast` status to orders table between `new` and `accepted`

### New Functions
- `claim_order(order_id, driver_id)`: Transaction-safe function for claiming orders with race condition protection
- `log_order_claim()`: Audit logging for claim attempts

### New Views
- `broadcasted_orders`: View of orders available for claiming
- `driver_claimable_orders`: Helper view for RLS policies

### New Indexes
- `idx_orders_broadcast_status`: For querying broadcasted orders
- `idx_orders_claimed_by`: For tracking claimed orders by driver
- Additional composite indexes for efficient queries

## API Changes

### New Endpoints
- `GET /api/driver/available-orders`: Returns all broadcast orders available for claiming
- `POST /api/driver/claim-order`: Allows drivers to claim orders with transaction safety

### Modified Endpoints
- `POST /api/orders`: Now sets status to "broadcast" instead of "new" with current timestamp
- `GET /api/admin/orders`: Includes claim tracking fields in response
- `PATCH /api/admin/orders`: Updated to handle "broadcast" status in allowed statuses

## Frontend Changes

### Driver Components
- `AvailableOrders.tsx`: New component showing broadcast orders drivers can claim
- `DriverHome.tsx`: Updated to include available orders section

### Admin Components
- `OrdersBoard.tsx`: Updated to handle broadcast status and removed driver assignment UI for broadcast orders

## Security & Permissions

### RLS Policies Updated
- `orders_driver_select_assigned_or_broadcast`: Allows drivers to see their assigned orders AND broadcast orders
- Created audit logging system for tracking claim attempts
- Function-level security for claim operations

### Race Condition Protection
- Implemented transaction-based claiming mechanism
- Database locks prevent multiple drivers from claiming the same order
- Clear error messages for failed claim attempts

## Deployment Instructions

### Firebase Configuration
All database changes are handled through Supabase migrations. No Firebase configuration is needed.

### Required Supabase Migrations
1. `migration_022_broadcast_claim_system.sql`
   - Adds new fields to orders table
   - Creates claim_order function
   - Adds status constraint updates

2. `migration_023_broadcast_claim_rls_policies.sql`
   - Updates RLS policies
   - Creates audit log table
   - Adds logging functions

3. `indexes.sql`
   - Creates performance indexes for efficient querying

### CLI Commands to Deploy
```bash
# Apply each migration in Supabase dashboard or via CLI
supabase db push migration_022_broadcast_claim_system.sql
supabase db push migration_023_broadcast_claim_rls_policies.sql
supabase db push indexes.sql
```

### Testing Checklist
1. Verify new orders appear in "broadcast" status
2. Confirm drivers can view available orders
3. Test claiming workflow with multiple drivers
4. Verify race condition protection
5. Check admin dashboard shows proper status
6. Confirm orders are automatically timestamped

## Backward Compatibility
- Existing orders without broadcast fields will continue to work
- The system gracefully handles mixed status orders
- Admin assignment still works for non-broadcast orders if needed

## Monitoring
- Claim attempts are logged in audit_log table
- Error conditions have distinct error codes
- Performance indexes ensure efficient querying at scale

## Future Enhancements
- Driver performance metrics from claim history
- Automatic order timeout system
- Driver reputation-based order prioritization