import { View } from 'react-native';

import { KPITile } from '../../components/KPITile';
import { useTheme } from '../../design-system/ThemeProvider';

interface SummaryCardsProps {
  availableCount: number;
  rentedCount: number;
  awaitingApprovalCount: number;
  maintenanceCount: number;
}

/**
 * "Maintenance due" is defined here as vehicles currently `status =
 * 'maintenance'` -- the only structured maintenance signal this schema
 * has today. There is no scheduled-service date or odometer-interval
 * concept anywhere in the database (confirmed against every migration),
 * so this deliberately does NOT claim to predict an upcoming due date;
 * it counts vehicles already flagged, which is the honest reading of
 * this card given what data actually exists. See the Prompt 7 delivery
 * report's Known limitations for what a real due-date feature would need.
 */
export function SummaryCards({
  availableCount,
  rentedCount,
  awaitingApprovalCount,
  maintenanceCount,
}: SummaryCardsProps) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }} testID="dashboard-summary-cards">
      <KPITile
        testID="summary-available"
        icon="checkmark-circle-outline"
        tone="success"
        value={availableCount}
        label="Available"
      />
      <KPITile testID="summary-rented" icon="key-outline" tone="lagoon" value={rentedCount} label="Rented" />
      <KPITile
        testID="summary-awaiting-approval"
        icon="hourglass-outline"
        tone="information"
        value={awaitingApprovalCount}
        label="Awaiting approval"
      />
      <KPITile
        testID="summary-maintenance"
        icon="construct-outline"
        tone="overdue"
        value={maintenanceCount}
        label="Maintenance due"
      />
    </View>
  );
}
