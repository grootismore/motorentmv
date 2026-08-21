import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../design-system/ThemeProvider';
import { useCreateOrganization } from './queries';

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'business'
  );
}

/**
 * Shown by (renter)/_layout.tsx instead of the tab navigator when a
 * signed-in renter has no organization yet — PRD §6.1: "Create
 * organization and business profile." Currency/timezone are fixed
 * (MVR / Indian/Maldives) per the schema defaults, not collected here.
 */
export function CreateOrganizationScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const createOrganization = useCreateOrganization();

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Enter your business name.');
      return;
    }
    setErrorMessage(undefined);
    createOrganization.mutate(
      {
        name: trimmed,
        slug: `${slugify(trimmed)}-${Date.now().toString(36)}`,
        defaultLocation: location.trim() || undefined,
      },
      { onError: (error) => setErrorMessage(error.message) },
    );
  };

  return (
    <Screen title="Set up your business" description="Create your rental business profile to get started.">
      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="create-org-name"
          label="Business name"
          value={name}
          onChangeText={setName}
          placeholder="Hulhumale Scooters"
          editable={!createOrganization.isPending}
        />
        <TextField
          testID="create-org-location"
          label="Default location (optional)"
          value={location}
          onChangeText={setLocation}
          placeholder="Hulhumale"
          editable={!createOrganization.isPending}
        />
        {errorMessage ? (
          <Text testID="create-org-error" accessibilityRole="alert" style={{ color: theme.colors.danger }}>
            {errorMessage}
          </Text>
        ) : null}
        <Button
          testID="create-org-submit"
          label="Create business"
          onPress={handleCreate}
          loading={createOrganization.isPending}
        />
      </View>
    </Screen>
  );
}
