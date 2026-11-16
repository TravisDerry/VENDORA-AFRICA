// Payments this phone has made to businesses ("My orders").
// Saved only on this phone (iOS Keychain / Android Keystore via expo-secure-store; localStorage on web).
// Only small references are kept here; the details are loaded from the Vendora backend.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'vendora_my_orders';
const MAX = 20; // keep the stored value small

const read = async () => {
  try {
    const raw = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
};

const write = async (list) => {
  try {
    const value = JSON.stringify(list.slice(0, MAX));
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, value);
    else await SecureStore.setItemAsync(KEY, value);
  } catch (e) {
    // storage unavailable: the order still went through, it just won't be listed
  }
};

// Each entry: { r: reference, b: businessId, p: business phone, t: time }
export const getMyOrders = read;

export const addMyOrder = async ({ reference, businessId, businessPhone }) => {
  if (!reference) return;
  const list = await read();
  if (list.some((o) => o.r === reference)) return;
  await write([{ r: reference, b: String(businessId || ''), p: businessPhone || '', t: Date.now() }, ...list]);
};

export const removeMyOrder = async (reference) => {
  await write((await read()).filter((o) => o.r !== reference));
};
