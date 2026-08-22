import { Text, type TextProps } from 'react-native';

import { useTheme } from '../design-system/ThemeProvider';
import type { typography } from '../design-system/tokens';

type Variant = keyof typeof typography.variant;

interface TypographyProps extends TextProps {
  color?: string;
}

/**
 * One factory for every named Ocean Glass type style (LargeTitle,
 * NavigationTitle, SectionTitle, CardTitle, Body, SecondaryBody, Label,
 * Caption, KPIText, PriceText, ButtonLabel) so a screen picks a semantic
 * component instead of hand-assembling fontSize/lineHeight/weight per
 * call site. `allowFontScaling` is left at RN's default (true) so every
 * variant respects the system Dynamic Type setting.
 */
function makeVariant(
  variant: Variant,
  defaultColor: (colors: ReturnType<typeof useTheme>['colors']) => string,
) {
  return function VariantText({ style, color, ...rest }: TypographyProps) {
    const theme = useTheme();
    const variantStyle = theme.typography.variant[variant];
    return (
      <Text
        {...rest}
        style={[
          { fontFamily: theme.typography.fontFamily.regular, color: color ?? defaultColor(theme.colors) },
          variantStyle,
          style,
        ]}
      />
    );
  };
}

// Defaults to textPrimary (most large titles sit on the plain pearl
// background); a screen with an ocean-gradient header (e.g. Explore)
// passes color={theme.colors.textInverse} explicitly.
export const LargeTitle = makeVariant('largeTitle', (c) => c.textPrimary);
export const NavigationTitle = makeVariant('navigationTitle', (c) => c.textPrimary);
export const SectionTitle = makeVariant('sectionTitle', (c) => c.textPrimary);
export const CardTitle = makeVariant('cardTitle', (c) => c.textPrimary);
export const Body = makeVariant('body', (c) => c.textPrimary);
export const SecondaryBody = makeVariant('secondaryBody', (c) => c.textSecondary);
export const Label = makeVariant('label', (c) => c.textSecondary);
export const Caption = makeVariant('caption', (c) => c.textTertiary);
export const KPIText = makeVariant('numericKPI', (c) => c.textPrimary);
export const PriceText = makeVariant('price', (c) => c.lagoonPrimary);
export const ButtonLabel = makeVariant('buttonLabel', (c) => c.textInverse);
