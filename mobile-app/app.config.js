// Adds a safety check on top of app.json for builds made with EAS (preview / store builds).
// A build that doesn't know the live server's address would try to reach the developer's own
// computer and show no businesses, so it is stopped here with a clear message instead.
//
// Set the address once (replace with your server's https address):
//   eas env:set --name EXPO_PUBLIC_API_URL --value https://api.vendora.africa --environment production --environment preview --visibility plaintext
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE; // set by EAS during `eas build`; empty for `npx expo start`
  if (profile === 'production' || profile === 'preview') {
    const api = process.env.EXPO_PUBLIC_API_URL || '';
    if (!/^https:\/\/[^\s/]+/.test(api)) {
      throw new Error(
        `EXPO_PUBLIC_API_URL must be your live server's https address for "${profile}" builds ` +
          `(currently "${api || 'not set'}"). See the comment at the top of mobile-app/app.config.js.`
      );
    }
  }
  return config;
};
