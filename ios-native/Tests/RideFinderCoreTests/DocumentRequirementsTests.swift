import Foundation
import Testing

@testable import RideFinderCore

// Mirrors src/features/documents/queries.test.ts's hasRequiredDocuments
// cases exactly.
@Suite struct DocumentRequirementsTests {
    private static func document(type: DocumentType, status: DocumentStatus = .pending) -> DocumentRecord {
        DocumentRecord(
            id: UUID(),
            organizationId: nil,
            vehicleId: nil,
            bookingId: nil,
            profileId: UUID(),
            expenseId: nil,
            documentType: type,
            storagePath: "user-1/\(type.rawValue).jpg",
            status: status,
            expiresAt: nil,
            uploadedBy: UUID(),
            verifiedBy: nil,
            verifiedAt: nil,
            createdAt: Date()
        )
    }

    @Test func isFalseWithNoDocumentsAtAll() {
        #expect(!DocumentRequirements.hasRequiredDocuments([]))
    }

    @Test func isFalseWithOnlyALicense() {
        #expect(!DocumentRequirements.hasRequiredDocuments([Self.document(type: .license)]))
    }

    @Test func isFalseWithOnlyAnIdCard() {
        #expect(!DocumentRequirements.hasRequiredDocuments([Self.document(type: .idCard)]))
    }

    @Test func isTrueOnceBothALicenseAndAnIdCardAreOnFile() {
        #expect(DocumentRequirements.hasRequiredDocuments([Self.document(type: .license), Self.document(type: .idCard)]))
    }

    @Test func doesNotCountARejectedDocumentTowardTheRequirement() {
        let documents = [Self.document(type: .license), Self.document(type: .idCard, status: .rejected)]
        #expect(!DocumentRequirements.hasRequiredDocuments(documents))
    }

    @Test func countsAVerifiedOrStillPendingDocument() {
        let documents = [Self.document(type: .license, status: .verified), Self.document(type: .idCard, status: .pending)]
        #expect(DocumentRequirements.hasRequiredDocuments(documents))
    }
}
