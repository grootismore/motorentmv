import Foundation

/// Port of src/features/documents/queries.ts's `hasRequiredDocuments` —
/// the client-side mirror of the server-side gate
/// (20260821220001_booking_requirements.sql) that blocks submitting a
/// booking request without a license and ID/passport photo already on
/// file. This is a UX pre-check only; the RPC re-enforces it server-side
/// regardless of what this returns.
public enum DocumentRequirements {
    public static func hasRequiredDocuments(_ documents: [DocumentRecord]) -> Bool {
        func hasType(_ type: DocumentType) -> Bool {
            documents.contains { $0.documentType == type && $0.status != .rejected }
        }
        return hasType(.license) && hasType(.idCard)
    }
}
