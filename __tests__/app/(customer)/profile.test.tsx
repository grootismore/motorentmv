import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ThemeProvider } from '../../../src/design-system/ThemeProvider';
import CustomerProfile from '../../../app/(customer)/(tabs)/profile/index';

jest.mock('expo-router', () => ({
  Link: ({ children }: PropsWithChildren) => children,
}));

const mockUseAuth = jest.fn();
jest.mock('../../../src/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockSetIntent = jest.fn();
jest.mock('../../../src/features/auth/experience-intent', () => ({
  useExperienceIntent: () => ({ intent: null, setIntent: mockSetIntent }),
}));

jest.mock('../../../src/features/auth/session', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

// DocumentsSection has its own dedicated test suite
// (src/features/documents/DocumentsSection.test.tsx) -- stubbed here so
// this screen's test doesn't also need to drive its image-picker/upload
// dependency chain just to prove the screen wires a userId into it.
jest.mock('../../../src/features/documents/DocumentsSection', () => ({
  DocumentsSection: ({ userId }: { userId: string }) => {
    const { Text } = require('react-native');
    return <Text testID="documents-section-stub">{userId}</Text>;
  },
}));

const mockUpdateMutate = jest.fn();
let mockProfileData: { full_name: string | null; phone: string | null } | undefined;

jest.mock('../../../src/features/profile/queries', () => ({
  useMyProfile: () => ({ data: mockProfileData, isLoading: false }),
  useUpdateMyProfile: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

afterEach(() => {
  jest.clearAllMocks();
  mockProfileData = undefined;
});

function renderProfile() {
  return render(
    <ThemeProvider>
      <CustomerProfile />
    </ThemeProvider>,
  );
}

describe('CustomerProfile', () => {
  it('shows a sign-in prompt when signed out', async () => {
    mockUseAuth.mockReturnValue({ session: null });
    await renderProfile();

    expect(await screen.findByTestId('profile-auth-prompt')).toBeTruthy();
  });

  it('prefills the name/phone fields from the loaded profile', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    mockProfileData = { full_name: 'Aisha Rasheed', phone: '+9607771234' };
    mockUpdateMutate.mockImplementation((_input, { onSuccess }) => onSuccess());
    await renderProfile();

    // TextField's value now lives inside @expo/ui's native TextInput as
    // an observable bound by native object identity (see jest.setup.ts's
    // ExpoUI mock), not a plain string prop -- there's no rendered prop
    // left to read the field's current text from, on a real device or in
    // this test. Pressing Save without editing anything and checking
    // what it submits is a behavioral proof of the same thing: it only
    // matches the profile's loaded values if the fields were genuinely
    // seeded with them.
    await screen.findByTestId('profile-save');
    await fireEvent.press(screen.getByTestId('profile-save'));

    await waitFor(() =>
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { userId: 'user-1', fullName: 'Aisha Rasheed', phone: '+9607771234' },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      ),
    );
  });

  it('saves edited name/phone and shows a confirmation', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    mockProfileData = { full_name: null, phone: null };
    mockUpdateMutate.mockImplementation((_input, { onSuccess }) => onSuccess());
    await renderProfile();

    await fireEvent.changeText(screen.getByTestId('profile-full-name'), 'Aisha Rasheed');
    await fireEvent.changeText(screen.getByTestId('profile-phone'), '+9607771234');
    await fireEvent.press(screen.getByTestId('profile-save'));

    await waitFor(() =>
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { userId: 'user-1', fullName: 'Aisha Rasheed', phone: '+9607771234' },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      ),
    );
    expect(await screen.findByTestId('profile-save-message')).toHaveTextContent('Saved.');
  });

  it('renders the documents section for the signed-in user', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    await renderProfile();

    expect(await screen.findByTestId('documents-section-stub')).toHaveTextContent('user-1');
  });
});
