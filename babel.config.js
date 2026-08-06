// Metro applies babel-preset-expo by default even without this file; it exists
// so Jest (which has no Metro) can transform the TypeScript/JSX in tests the
// same way the bundler does. Keep it in sync with the Expo default.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
