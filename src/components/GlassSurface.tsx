import { GlassEffectContainer, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import { glassEffect } from '@expo/ui/swift-ui/modifiers';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, useReduceTransparency } from '../design-system/ThemeProvider';

export type GlassTone = 'default' | 'strong';

interface GlassSurfaceProps {
  tone?: GlassTone;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * The one place in the app that renders a translucent surface. Every "glass
 * panel" in the app — search panels, KPI tiles, grouped sections, result
 * cards — renders through this component rather than each screen reaching
 * for a blur/material API directly.
 *
 * iOS: real Liquid Glass (SwiftUI's `.glassEffect()`, @expo/ui's
 * `glassEffect` modifier on a native `Group`) wrapping the RN content via
 * `RNHostView`, not a BlurView tinted to approximate one — AGENTS.md's
 * native-first rule calls out exactly that substitution. `RNHostView` is
 * always `matchContents`: its default sizes it to the *parent* SwiftUI
 * view instead of the RN content it's hosting, and there is no parent
 * size to inherit here (this is the seam between the two trees, same
 * lesson as GroupedSection's own `RNHostView`) — every card would render
 * at zero height without it.
 *
 * Android and iOS with Reduce Transparency on: no native glass material
 * exists on Android (forcing iOS's Liquid Glass there would be exactly
 * the "force iOS visual behavior onto Android" AGENTS.md rules out), and
 * Reduce Transparency asks iOS itself to stop showing translucency — both
 * fall back to the same flat, opaque token surface, with an explicit
 * hairline border a real material supplies for itself and this fallback
 * doesn't.
 */
export function GlassSurface({ tone = 'default', style, children, testID }: GlassSurfaceProps) {
  const theme = useTheme();
  const reduceTransparency = useReduceTransparency();

  const baseStyle: ViewStyle = {
    borderRadius: theme.radii.card,
    overflow: 'hidden',
  };

  const useNativeGlass = Platform.OS === 'ios' && !reduceTransparency;

  if (!useNativeGlass) {
    const backgroundColor = tone === 'strong' ? theme.colors.glassSurfaceStrong : theme.colors.glassSurface;
    return (
      <View
        testID={testID}
        style={[
          baseStyle,
          { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.glassBorder, backgroundColor },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Liquid Glass tinted with the app's own accent, at low opacity so the
  // material itself still reads through — the same distinction `tone` drew
  // between BlurView intensities before, now drawn with a tint instead
  // (`.glassEffect()` has no intensity parameter of its own).
  const tintColor = tone === 'strong' ? theme.colors.glassTintStrong : theme.colors.glassTint;

  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <GlassEffectContainer>
        <Group
          modifiers={[
            glassEffect({
              glass: { variant: 'regular', tint: tintColor },
              shape: 'roundedRectangle',
              cornerRadius: theme.radii.card,
            }),
          ]}
        >
          <RNHostView matchContents>
            <View testID={testID} style={style}>
              {children}
            </View>
          </RNHostView>
        </Group>
      </GlassEffectContainer>
    </Host>
  );
}
