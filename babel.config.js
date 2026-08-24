// Only needed for the react-native-worklets babel plugin (a peer
// dependency of @expo/ui, used by its gesture-driven components like
// Slider/SwipeActions) -- babel-preset-expo alone was sufficient before
// this and is still applied the same way, just now explicit instead of
// Expo's zero-config default.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
