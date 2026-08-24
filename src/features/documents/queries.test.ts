import { hasRequiredDocuments, type MyDocument, type MyDocumentType } from './queries';

// Same reasoning as notifications/queries.test.ts: only the pure helper
// below is exercised here, but this module also exports hooks that pull in
// the real Supabase client at import time.
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({}),
}));

function documentOf(documentType: MyDocumentType, status: MyDocument['status'] = 'pending'): MyDocument {
  return {
    id: `${documentType}-${status}`,
    organization_id: null,
    vehicle_id: null,
    booking_id: null,
    profile_id: 'user-1',
    expense_id: null,
    document_type: documentType,
    storage_path: `user-1/${documentType}.jpg`,
    status,
    expires_at: null,
    uploaded_by: 'user-1',
    verified_by: null,
    verified_at: null,
    created_at: '2026-08-01T00:00:00Z',
    signedUrl: null,
  };
}

describe('hasRequiredDocuments', () => {
  it('is false with no documents at all', () => {
    expect(hasRequiredDocuments([])).toBe(false);
  });

  it('is false with only a license', () => {
    expect(hasRequiredDocuments([documentOf('license')])).toBe(false);
  });

  it('is false with only an ID card', () => {
    expect(hasRequiredDocuments([documentOf('id_card')])).toBe(false);
  });

  it('is true once both a license and an ID card are on file', () => {
    expect(hasRequiredDocuments([documentOf('license'), documentOf('id_card')])).toBe(true);
  });

  it('does not count a rejected document toward the requirement', () => {
    expect(hasRequiredDocuments([documentOf('license'), documentOf('id_card', 'rejected')])).toBe(false);
  });

  it('counts a verified or still-pending document', () => {
    expect(hasRequiredDocuments([documentOf('license', 'verified'), documentOf('id_card', 'pending')])).toBe(
      true,
    );
  });
});
