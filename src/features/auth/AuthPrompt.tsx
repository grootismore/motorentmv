import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { GlassSurface } from '../../components/GlassSurface';
import { SecondaryBody, SectionTitle } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { InlineAuthGate } from './InlineAuthGate';

interface AuthPromptProps {
  icon: keyof typeof Ionicons.glyphMap;
  heading: string;
  message: string;
  gateTitle?: string;
  gateDescription?: string;
  testID?: string;
}

/**
 * Compact, contextual sign-in prompt for a signed-out Bookings/Profile
 * screen. Both screens already share the same InlineAuthGate for the
 * actual OTP flow (not literally duplicated code) — the reported "large
 * duplicated form" problem was that InlineAuthGate always rendered its
 * full email field immediately. This wraps it with progressive
 * disclosure: an icon, a short heading, and one button; the real form
 * only appears once that button is pressed.
 */
export function AuthPrompt({ icon, heading, message, gateTitle, gateDescription, testID }: AuthPromptProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return <InlineAuthGate title={gateTitle} description={gateDescription} />;
  }

  return (
    <GlassSurface
      testID={testID}
      tone="strong"
      style={{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.glassSurface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={theme.colors.lagoonPrimary} />
      </View>
      <View style={{ gap: theme.spacing.xs, alignItems: 'center' }}>
        <SectionTitle style={{ textAlign: 'center' }}>{heading}</SectionTitle>
        <SecondaryBody style={{ textAlign: 'center' }}>{message}</SecondaryBody>
      </View>
      <Button
        testID={testID ? `${testID}-sign-in` : undefined}
        label="Sign in"
        onPress={() => setExpanded(true)}
      />
    </GlassSurface>
  );
}
