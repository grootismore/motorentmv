import { createContext, useContext, type PropsWithChildren } from 'react';

import type { Database } from '../../lib/database.types';
import type { Membership } from './queries';

interface CurrentOrganizationState {
  organizationId: string;
  organization: Database['public']['Tables']['organizations']['Row'];
  role: Database['public']['Enums']['org_role'];
}

const CurrentOrganizationContext = createContext<CurrentOrganizationState | null>(null);

/**
 * Only ever mounted once (renter)/_layout.tsx has confirmed a membership
 * exists — every fleet/staff screen underneath reads the org id/role from
 * here instead of re-querying membership itself.
 */
export function CurrentOrganizationProvider({
  membership,
  children,
}: PropsWithChildren<{ membership: Membership }>) {
  return (
    <CurrentOrganizationContext.Provider
      value={{
        organizationId: membership.organization_id,
        organization: membership.organizations,
        role: membership.role,
      }}
    >
      {children}
    </CurrentOrganizationContext.Provider>
  );
}

export function useCurrentOrganization(): CurrentOrganizationState {
  const ctx = useContext(CurrentOrganizationContext);
  if (!ctx) {
    throw new Error('useCurrentOrganization must be used within a CurrentOrganizationProvider');
  }
  return ctx;
}
