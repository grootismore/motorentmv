import type { VehicleSearchResult } from './queries';

/**
 * Deterministic, clearly-fake preview content for EXPO_PUBLIC_DEMO_MODE
 * only (see src/lib/env.ts) -- never real production database records,
 * and never rendered unless the real search genuinely returns nothing.
 * `vehicle_id`/`organization_id` are recognizable non-UUIDs on purpose:
 * VehicleResultItem's `demo` prop disables navigation entirely for these,
 * so nothing ever tries to fetch a listing that doesn't exist.
 */
export const DEMO_VEHICLES: VehicleSearchResult[] = [
  {
    vehicle_id: 'demo-1',
    organization_id: 'demo-org',
    organization_name: 'Demo Preview',
    registration_number: 'DEMO-001',
    make: 'Honda',
    model: 'PCX 160',
    year: 2024,
    category: 'Scooter',
    transmission: 'automatic',
    color: 'Red',
    location: 'Hulhumalé',
    deposit_amount_laari: 200000,
    daily_rate_laari: 45000,
    hourly_rate_laari: null,
  },
  {
    vehicle_id: 'demo-2',
    organization_id: 'demo-org',
    organization_name: 'Demo Preview',
    registration_number: 'DEMO-002',
    make: 'Yamaha',
    model: 'NMAX 155',
    year: 2023,
    category: 'Scooter',
    transmission: 'automatic',
    color: 'Blue',
    location: 'Malé',
    deposit_amount_laari: 200000,
    daily_rate_laari: 42000,
    hourly_rate_laari: null,
  },
];
