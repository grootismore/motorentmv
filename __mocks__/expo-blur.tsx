import { View, type ViewProps } from 'react-native';

/**
 * expo-blur's real BlurView is a class component whose componentDidMount
 * synchronously calls setState to resolve a native blur target id (see
 * node_modules/expo-blur/src/BlurView.tsx) -- a real async React commit on
 * every mount. GlassSurface (src/components/GlassSurface.tsx) now mounts a
 * BlurView on every glass panel across nearly every screen, and exercising
 * dozens of the real native-adapter class components per test intermittently
 * raced React Testing Library's act()/findBy* timing in CI (confirmed via a
 * real failed run, not a hypothetical). Tests render a plain View instead --
 * the blur itself is an iOS-only rendering detail that GlassSurface already
 * falls back away from on Android/Reduce Transparency, and no test asserts
 * on it.
 */
export function BlurView({ children, style, testID }: ViewProps) {
  return (
    <View style={style} testID={testID}>
      {children}
    </View>
  );
}

export function BlurTargetView({ children, style, testID }: ViewProps) {
  return (
    <View style={style} testID={testID}>
      {children}
    </View>
  );
}
