import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { GroupedRow, GroupedSection } from '../../components/GroupedSection';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Body, Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import type { StatusTone } from '../bookings/status';
import { StatusBadge } from '../bookings/StatusBadge';
import {
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  useDeleteMyDocument,
  useMyDocuments,
  useUploadMyDocument,
  type MyDocument,
  type MyDocumentType,
} from './queries';

const DOCUMENT_STATUS_TONE: Record<MyDocument['status'], StatusTone> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
};

const DOCUMENT_TYPES: MyDocumentType[] = ['license', 'id_card'];

interface DocumentsSectionProps {
  userId: string;
}

/**
 * A customer's own license/ID uploads (PRD §6.1/§6.5/§7's "Profile/
 * documents" screen) -- profile-scoped, not booking-scoped, so one upload
 * covers every future booking rather than re-uploading per rental. See
 * 20260821210001_customer_documents_storage.sql: nobody but the customer
 * themselves can ever see these, so there's no renter-facing verification
 * UI to build here yet -- `status` stays 'pending' until that exists.
 */
export function DocumentsSection({ userId }: DocumentsSectionProps) {
  const theme = useTheme();
  const documents = useMyDocuments(userId);
  const upload = useUploadMyDocument();
  const deleteDocument = useDeleteMyDocument(userId);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const pickAndUpload = async (documentType: MyDocumentType, source: 'library' | 'camera') => {
    setErrorMessage(undefined);
    const permission =
      source === 'library'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Permission is required to add a photo.');
      return;
    }

    const result =
      source === 'library'
        ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchCameraAsync({ quality: 0.7 });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    upload.mutate(
      { userId, documentType, uri: asset.uri, width: asset.width, height: asset.height },
      { onError: (error) => setErrorMessage(error.message) },
    );
  };

  const confirmDelete = (document: MyDocument) => {
    Alert.alert('Remove document?', 'This document will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteDocument.mutate(document) },
    ]);
  };

  return (
    <GroupedSection title="Documents" testID="documents-section">
      {errorMessage ? (
        <Caption testID="documents-error" accessibilityRole="alert" color={theme.colors.destructive}>
          {errorMessage}
        </Caption>
      ) : null}
      {documents.isLoading ? <LoadingState label="Loading documents…" /> : null}
      {documents.isError ? (
        <ErrorState message={documents.error.message} onRetry={() => documents.refetch()} />
      ) : null}

      {documents.data
        ? DOCUMENT_TYPES.map((documentType, index) => {
            const existing = documents.data!.filter((d) => d.document_type === documentType);
            return (
              <GroupedRow
                key={documentType}
                testID={`document-row-${documentType}`}
                isLast={index === DOCUMENT_TYPES.length - 1}
              >
                <View style={{ gap: theme.spacing.sm }}>
                  <Body style={{ fontWeight: '600' }}>{DOCUMENT_TYPE_LABEL[documentType]}</Body>

                  {existing.length === 0 ? (
                    <Caption>Not uploaded yet.</Caption>
                  ) : (
                    <View style={{ gap: theme.spacing.sm }}>
                      {existing.map((document) => (
                        <View
                          key={document.id}
                          style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}
                        >
                          {document.signedUrl ? (
                            <Image
                              source={{ uri: document.signedUrl }}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: theme.radii.control,
                                borderWidth: StyleSheet.hairlineWidth,
                                borderColor: theme.colors.imageOutline,
                              }}
                              contentFit="cover"
                              accessibilityLabel={`${DOCUMENT_TYPE_LABEL[documentType]} photo`}
                            />
                          ) : null}
                          <View style={{ flex: 1, gap: theme.spacing.xs }}>
                            <StatusBadge
                              label={DOCUMENT_STATUS_LABEL[document.status]}
                              tone={DOCUMENT_STATUS_TONE[document.status]}
                            />
                          </View>
                          {document.status === 'pending' ? (
                            <Button
                              testID={`document-delete-${document.id}`}
                              label="Remove"
                              variant="tertiary"
                              onPress={() => confirmDelete(document)}
                              loading={deleteDocument.isPending}
                            />
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                    <Button
                      testID={`document-add-camera-${documentType}`}
                      label="Take photo"
                      variant="secondary"
                      onPress={() => pickAndUpload(documentType, 'camera')}
                      loading={upload.isPending}
                    />
                    <Button
                      testID={`document-add-library-${documentType}`}
                      label="Choose photo"
                      variant="secondary"
                      onPress={() => pickAndUpload(documentType, 'library')}
                      loading={upload.isPending}
                    />
                  </View>
                </View>
              </GroupedRow>
            );
          })
        : null}
    </GroupedSection>
  );
}
