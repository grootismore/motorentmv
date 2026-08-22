import { useEffect, useState } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, useReduceMotion } from '../design-system/ThemeProvider';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A single shimmering placeholder block. Screens compose several of these
 * into a shape that resembles their own final layout (Ocean Glass spec:
 * "Skeletons should resemble the final layout" — never a generic centered
 * spinner). Respects Reduce Motion: the shimmer loop is skipped and a
 * flat static tone is shown instead.
 */
export function Skeleton({ width = '100%', height = 16, radius, style, testID }: SkeletonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.duration.skeleton / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: theme.motion.duration.skeleton / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion, theme.motion.duration.skeleton]);

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radii.control,
          backgroundColor: theme.colors.divider,
          opacity: reduceMotion ? 0.7 : opacity,
        },
        style,
      ]}
    />
  );
}
