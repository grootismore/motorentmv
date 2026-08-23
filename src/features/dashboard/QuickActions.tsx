import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { GlassSurface } from '../../components/GlassSurface';
import { Label } from '../../components/Typography';
import { minTouchTarget } from '../../design-system/tokens';
import { useTheme } from '../../design-system/ThemeProvider';

interface QuickAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, onPress, testID }: Omit<QuickAction, 'key'> & { testID: string }) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
    >
      <GlassSurface
        style={{
          minHeight: minTouchTarget + theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.xs,
          paddingVertical: theme.spacing.md,
        }}
      >
        <Ionicons name={icon} size={22} color={theme.colors.lagoonPrimary} />
        <Label style={{ textAlign: 'center' }}>{label}</Label>
      </GlassSurface>
    </Pressable>
  );
}

export function QuickActions({
  onAddVehicle,
  onCreateBooking,
  onRecordIncome,
  onRecordExpense,
}: {
  onAddVehicle: () => void;
  onCreateBooking: () => void;
  onRecordIncome: () => void;
  onRecordExpense: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }} testID="dashboard-quick-actions">
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <QuickActionButton
          testID="quick-action-add-vehicle"
          icon="add-circle-outline"
          label="Add vehicle"
          onPress={onAddVehicle}
        />
        <QuickActionButton
          testID="quick-action-create-booking"
          icon="calendar-outline"
          label="Create booking"
          onPress={onCreateBooking}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <QuickActionButton
          testID="quick-action-record-income"
          icon="trending-up-outline"
          label="Record income"
          onPress={onRecordIncome}
        />
        <QuickActionButton
          testID="quick-action-record-expense"
          icon="trending-down-outline"
          label="Record expense"
          onPress={onRecordExpense}
        />
      </View>
    </View>
  );
}
