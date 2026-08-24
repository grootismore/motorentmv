import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { DocumentsSection } from './DocumentsSection';
import type { MyDocument } from './queries';

// jest.mock calls are hoisted above the imports above by
// babel-plugin-jest-hoist regardless of source position -- same reasoning
// as uploads.test.ts's own comment on this.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const mockUploadMutate = jest.fn();
const mockDeleteMutate = jest.fn();
let mockDocuments: MyDocument[] = [];

jest.mock('./queries', () => ({
  useMyDocuments: () => ({
    data: mockDocuments,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUploadMyDocument: () => ({ mutate: mockUploadMutate, isPending: false }),
  useDeleteMyDocument: () => ({ mutate: mockDeleteMutate, isPending: false }),
  DOCUMENT_TYPE_LABEL: { license: "Driver's license", id_card: 'ID card' },
  DOCUMENT_STATUS_LABEL: { pending: 'Pending review', verified: 'Verified', rejected: 'Rejected' },
}));

function documentOf(overrides: Partial<MyDocument>): MyDocument {
  return {
    id: 'doc-1',
    organization_id: null,
    vehicle_id: null,
    booking_id: null,
    profile_id: 'user-1',
    expense_id: null,
    document_type: 'license',
    storage_path: 'user-1/license.jpg',
    status: 'pending',
    expires_at: null,
    uploaded_by: 'user-1',
    verified_by: null,
    verified_at: null,
    created_at: '2026-08-01T00:00:00Z',
    signedUrl: 'https://example.com/signed.jpg',
    ...overrides,
  };
}

afterEach(() => {
  jest.clearAllMocks();
  mockDocuments = [];
});

function renderSection() {
  return render(
    <ThemeProvider>
      <DocumentsSection userId="user-1" />
    </ThemeProvider>,
  );
}

describe('DocumentsSection', () => {
  it('shows "Not uploaded yet" for both document types when none exist', async () => {
    await renderSection();

    expect(await screen.findAllByText('Not uploaded yet.')).toHaveLength(2);
  });

  it("shows an uploaded pending document's status badge and a remove button", async () => {
    mockDocuments = [documentOf({ document_type: 'license', status: 'pending' })];
    await renderSection();

    expect(await screen.findByText('Pending review')).toBeTruthy();
    expect(screen.getByTestId('document-delete-doc-1')).toBeTruthy();
  });

  it('hides the remove button once a document is verified', async () => {
    mockDocuments = [documentOf({ document_type: 'id_card', status: 'verified' })];
    await renderSection();

    expect(await screen.findByText('Verified')).toBeTruthy();
    expect(screen.queryByTestId('document-delete-doc-1')).toBeNull();
  });

  it('uploads a license photo taken with the camera once permission is granted', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://license.jpg', width: 800, height: 600 }],
    });

    await renderSection();
    await fireEvent.press(screen.getByTestId('document-add-camera-license'));

    await waitFor(() =>
      expect(mockUploadMutate).toHaveBeenCalledWith(
        { userId: 'user-1', documentType: 'license', uri: 'file://license.jpg', width: 800, height: 600 },
        expect.objectContaining({ onError: expect.any(Function) }),
      ),
    );
  });

  it('shows a permission error instead of opening the camera when permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    await renderSection();
    await fireEvent.press(screen.getByTestId('document-add-camera-id_card'));

    expect(await screen.findByTestId('documents-error')).toHaveTextContent(
      'Permission is required to add a photo.',
    );
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockUploadMutate).not.toHaveBeenCalled();
  });

  it('deletes a pending document once the native confirmation is accepted', async () => {
    mockDocuments = [documentOf({ document_type: 'license', status: 'pending' })];
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const removeButton = (buttons as { text: string; onPress?: () => void }[]).find(
        (b) => b.text === 'Remove',
      );
      removeButton?.onPress?.();
    });

    await renderSection();
    await fireEvent.press(await screen.findByTestId('document-delete-doc-1'));

    await waitFor(() => expect(mockDeleteMutate).toHaveBeenCalledWith(mockDocuments[0]));
    alertSpy.mockRestore();
  });
});
