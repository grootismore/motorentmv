import { View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import type { Database } from '../../lib/database.types';
import { InspectionForm } from './InspectionForm';
import { InspectionSummary } from './InspectionSummary';
import { useInspections } from './queries';

type BookingStatus = Database['public']['Enums']['booking_status'];

interface InspectionSectionProps {
  bookingId: string;
  organizationId: string;
  bookingStatus: BookingStatus;
  /** 'renter' records checklists (org staff); 'customer' only ever reads
   * and, once each is recorded, may acknowledge it. */
  viewerRole: 'renter' | 'customer';
}

const PICKUP_FORM_STATUSES: BookingStatus[] = ['accepted', 'ready'];
const RETURN_FORM_STATUSES: BookingStatus[] = ['active', 'overdue'];

/**
 * Shared by both booking-detail screens (renter and customer): decides,
 * from the booking's current status and who's looking, whether to show a
 * recording form, a read-only summary, or nothing at all for each of the
 * pickup/return inspections. The actual gate that blocks activate/complete
 * without a recorded inspection lives server-side (bookings_guard,
 * 20260821160001) -- this only decides what's useful to show, never what's
 * allowed.
 */
export function InspectionSection({
  bookingId,
  organizationId,
  bookingStatus,
  viewerRole,
}: InspectionSectionProps) {
  const theme = useTheme();
  const inspections = useInspections(bookingId);
  if (!inspections.data) return null;

  const pickup = inspections.data.find((i) => i.inspection_type === 'pickup');
  const returnInspection = inspections.data.find((i) => i.inspection_type === 'return');

  const showPickupForm = viewerRole === 'renter' && !pickup && PICKUP_FORM_STATUSES.includes(bookingStatus);
  const showReturnForm =
    viewerRole === 'renter' && !returnInspection && RETURN_FORM_STATUSES.includes(bookingStatus);

  if (!pickup && !returnInspection && !showPickupForm && !showReturnForm) return null;

  return (
    <View style={{ gap: theme.spacing.lg }} testID="inspection-section">
      {showPickupForm ? (
        <InspectionForm bookingId={bookingId} organizationId={organizationId} inspectionType="pickup" />
      ) : pickup ? (
        <InspectionSummary
          inspection={pickup}
          bookingId={bookingId}
          canAcknowledge={viewerRole === 'customer'}
        />
      ) : null}

      {showReturnForm ? (
        <InspectionForm bookingId={bookingId} organizationId={organizationId} inspectionType="return" />
      ) : returnInspection ? (
        <InspectionSummary
          inspection={returnInspection}
          bookingId={bookingId}
          canAcknowledge={viewerRole === 'customer'}
          pickupInspection={pickup}
        />
      ) : null}
    </View>
  );
}
