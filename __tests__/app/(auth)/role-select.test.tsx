import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../../src/design-system/ThemeProvider';
import { ExperienceIntentProvider, useExperienceIntent } from '../../../src/features/auth/experience-intent';
import RoleSelect from '../../../app/(auth)/role-select';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function IntentProbe({ onIntent }: { onIntent: (intent: string | null) => void }) {
  const { intent } = useExperienceIntent();
  onIntent(intent);
  return null;
}

function renderRoleSelect(onIntent: (intent: string | null) => void) {
  return render(
    <ThemeProvider>
      <ExperienceIntentProvider>
        <RoleSelect />
        <IntentProbe onIntent={onIntent} />
      </ExperienceIntentProvider>
    </ThemeProvider>,
  );
}

describe('RoleSelect', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records renter intent and navigates to sign-in when "manage a rental business" is tapped', async () => {
    const onIntent = jest.fn();
    await renderRoleSelect(onIntent);

    await fireEvent.press(screen.getByTestId('role-select-renter'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/sign-in', params: { role: 'renter' } });
    expect(onIntent).toHaveBeenLastCalledWith('renter');
  });

  it('records customer intent and navigates to sign-in when "rent a motorcycle" is tapped', async () => {
    const onIntent = jest.fn();
    await renderRoleSelect(onIntent);

    await fireEvent.press(screen.getByTestId('role-select-customer'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/sign-in', params: { role: 'customer' } });
    expect(onIntent).toHaveBeenLastCalledWith('customer');
  });
});
