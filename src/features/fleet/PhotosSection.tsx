import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { useDeleteVehiclePhoto, useUploadVehiclePhoto, useVehiclePhotos, type VehiclePhoto } from './photos';

interface PhotosSectionProps {
  vehicleId: string;
  organizationId: string;
}

export function PhotosSection({ vehicleId, organizationId }: PhotosSectionProps) {
  const theme = useTheme();
  const photos = useVehiclePhotos(vehicleId);
  const upload = useUploadVehiclePhoto();
  const deletePhoto = useDeleteVehiclePhoto(vehicleId);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const pickAndUpload = async (source: 'library' | 'camera') => {
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
      { vehicleId, organizationId, uri: asset.uri, width: asset.width, height: asset.height },
      { onError: (error) => setErrorMessage(error.message) },
    );
  };

  const confirmDelete = (photo: VehiclePhoto) => {
    // Deleting a photo is irreversible, so it goes through the OS's own
    // native confirmation dialog (UIAlertController on iOS, an
    // AlertDialog on Android) rather than deleting on the first tap or
    // recreating a confirmation sheet out of arbitrary Views.
    Alert.alert('Remove photo?', 'This photo will be permanently removed from the vehicle.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deletePhoto.mutate(photo) },
    ]);
  };

  return (
    <View style={{ gap: theme.spacing.md }} testID="photos-section">
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button
          testID="photos-add-library"
          label="Choose photo"
          variant="secondary"
          onPress={() => pickAndUpload('library')}
          loading={upload.isPending}
        />
        <Button
          testID="photos-add-camera"
          label="Take photo"
          variant="secondary"
          onPress={() => pickAndUpload('camera')}
          loading={upload.isPending}
        />
      </View>

      {errorMessage ? (
        <Caption testID="photos-error" accessibilityRole="alert" color={theme.colors.destructive}>
          {errorMessage}
        </Caption>
      ) : null}

      {photos.isLoading ? <LoadingState label="Loading photos…" /> : null}
      {photos.isError ? <ErrorState message={photos.error.message} onRetry={() => photos.refetch()} /> : null}
      {photos.data && photos.data.length === 0 ? <EmptyState title="No photos yet" /> : null}

      {photos.data && photos.data.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="photos-list">
          {photos.data.map((photo: VehiclePhoto) => (
            <View key={photo.id} style={[styles.photoWrap, { marginEnd: theme.spacing.sm }]}>
              {photo.signedUrl ? (
                <Image
                  source={{ uri: photo.signedUrl }}
                  style={styles.photo}
                  contentFit="cover"
                  accessibilityLabel="Vehicle photo"
                />
              ) : (
                <View style={[styles.photo, { backgroundColor: theme.colors.glassSurfaceStrong }]} />
              )}
              <Button
                testID={`photo-delete-${photo.id}`}
                label="Remove"
                variant="danger"
                onPress={() => confirmDelete(photo)}
                loading={deletePhoto.isPending}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photoWrap: {
    width: 140,
    gap: 8,
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 16,
  },
});
