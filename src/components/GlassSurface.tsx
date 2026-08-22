import { BlurView } from 'expo-blur';
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
 * The one place in the app that renders a blurred/translucent surface.
 * Every "flat glass panel" in the Ocean Glass reference — search panels,
 * KPI tiles, grouped sections, the floating tab bar — renders through
 * this component rather than each screen reaching for BlurView directly.
 *
 * iOS: a real blur (BlurView) with a thin token-colored tint layered on
 * top, so the frosted panel always resolves to the same glassSurface/
 * glassSurfaceStrong color regardless of what's behind it.
 *
 * Android: expo-blur's blur is off by default there (BlurMethod defaults
 * to 'none', and the opt-in native blur methods are explicitly documented
 * as "may lead to decreased performance" — see expo-blur's own types) and
 * visually inconsistent across OEM skins. Rather than fight that, Android
 * always renders the flat opaque/semi-opaque fallback: same border,
 * radius, spacing and color token, no blur. This is also what iOS uses
 * when the user has Reduce Transparency on (useReduceTransparency),
 * satisfying the "Increased Contrast compatibility" requirement without
 * a second code path.
 */
export function GlassSurface({ tone = 'default', style, children, testID }: GlassSurfaceProps) {
  const theme = useTheme();
  const reduceTransparency = useReduceTransparency();
  const backgroundColor = tone === 'strong' ? theme.colors.glassSurfaceStrong : theme.colors.glassSurface;

  const baseStyle: ViewStyle = {
    borderRadius: theme.radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    overflow: 'hidden',
  };

  const useBlur = Platform.OS === 'ios' && !reduceTransparency;

  if (!useBlur) {
    return (
      <View testID={testID} style={[baseStyle, { backgroundColor }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View testID={testID} style={[baseStyle, style]}>
      <BlurView
        tint={theme.scheme === 'dark' ? 'dark' : 'light'}
        intensity={tone === 'strong' ? 70 : 40}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
      {children}
    </View>
  );
}
