import type { ActivityBookingEvent } from '../activity/queries';
import type { BookingWithDetails } from '../bookings/queries';
import type { FinanceSummary } from '../finance/queries';

/**
 * Deterministic, clearly-fake preview content for EXPO_PUBLIC_DEMO_MODE
 * only (src/lib/env.ts) -- shown on the dashboard exclusively when the
 * real fleet is genuinely empty and this flag is set, the same rule
 * src/features/discovery/demoData.ts already follows for Explore/Search.
 * Never rendered when real vehicles exist, and never on by default in
 * any real environment. IDs are recognizable non-UUIDs so nothing could
 * ever accidentally resolve to a real row.
 */
export const DEMO_SUMMARY = {
  availableCount: 2,
  rentedCount: 1,
  awaitingApprovalCount: 1,
  maintenanceCount: 1,
};

export const DEMO_FINANCE_SUMMARY: FinanceSummary = {
  incomeThisMonthLaari: 850000,
  expensesThisMonthLaari: 210000,
  netProfitLaari: 640000,
  incomeChangePercent: 12,
  expensesChangePercent: -4,
  netChangePercent: 18,
};

const DEMO_VEHICLE = {
  id: 'demo-vehicle-1',
  registration_number: 'DEMO-001',
  make: 'Honda',
  model: 'PCX 160',
};

const DEMO_CUSTOMER = {
  full_name: 'Demo Customer',
  phone: null,
  email: null,
};

export const DEMO_BOOKINGS: BookingWithDetails[] = [
  {
    id: 'demo-booking-1',
    organization_id: 'demo-org',
    vehicle_id: DEMO_VEHICLE.id,
    customer_id: 'demo-customer-1',
    status: 'accepted',
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    quote_snapshot: null,
    policy_snapshot: null,
    currency: 'MVR',
    total_amount_laari: 45000,
    payment_status: 'unpaid',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    vehicle: DEMO_VEHICLE,
    customer: DEMO_CUSTOMER,
  },
];

export const DEMO_ACTIVITY: ActivityBookingEvent[] = [
  {
    id: 'demo-event-1',
    booking_id: 'demo-booking-1',
    actor_id: null,
    event_type: 'created',
    from_status: null,
    to_status: 'requested',
    metadata: {},
    created_at: new Date().toISOString(),
    booking: {
      id: 'demo-booking-1',
      organization_id: 'demo-org',
      vehicle: DEMO_VEHICLE,
      customer: DEMO_CUSTOMER,
    },
  },
];
