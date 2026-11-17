// Where the backend API lives.
//
// During development the backend runs on the same computer as the Expo dev server,
// so we reuse that computer's address instead of hard-coding an IP that changes
// every time you switch Wi-Fi / hotspot:
//   - Web (browser): the page's own host (localhost or your PC's IP)
//   - Phone (Expo Go): the IP Expo is serving the app from
// To point at a deployed backend instead, set EXPO_PUBLIC_API_URL
// (e.g. EXPO_PUBLIC_API_URL=https://api.vendora.africa) before `npm start`.
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 5000;

const detectDevHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) return hostUri.split(':')[0];
  return 'localhost';
};

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || `http://${detectDevHost()}:${API_PORT}`
).replace(/\/$/, '');
