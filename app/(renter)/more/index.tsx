import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';

export default function More() {
  return (
    <Screen title="More" description="Customers, finances, reports, staff and settings.">
      <EmptyState
        title="Sections coming in later phases"
        message="Customers and staff arrive with renter onboarding (Prompt 3); finances and reports with the expense/reporting phase (Prompt 7)."
      />
    </Screen>
  );
}
