// Stores the owner ("manage") key for each business this device manages.
// Phones: iOS Keychain / Android Keystore via expo-secure-store.
// Web preview: falls back to localStorage (fine for testing, not a secure store).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const storageKey = (businessId) => `vendora_owner_key_${String(businessId).replace(/[^A-Za-z0-9._-]/g, '_')}`;

export const getOwnerKey = async (businessId) => {
  if (!businessId) return null;
  try {
    if (Platform.OS === 'web') return window.localStorage.getItem(storageKey(businessId));
    return await SecureStore.getItemAsync(storageKey(businessId));
  } catch (e) {
    return null;
  }
};

// List of businesses this device holds a key for ({ id, name }), so screens like
// Plans & pricing know which business is paying. Holds no secrets.
const INDEX_KEY = 'vendora_owned_businesses';
const readRaw = async (k) => (Platform.OS === 'web' ? window.localStorage.getItem(k) : SecureStore.getItemAsync(k));
const writeRaw = async (k, v) => (Platform.OS === 'web' ? window.localStorage.setItem(k, v) : SecureStore.setItemAsync(k, v));

export const getOwnedBusinesses = async () => {
  try {
    const list = JSON.parse((await readRaw(INDEX_KEY)) || '[]');
    return Array.isArray(list) ? list.filter((b) => b && b.id) : [];
  } catch (e) {
    return [];
  }
};

const updateIndex = async (fn) => {
  try {
    await writeRaw(INDEX_KEY, JSON.stringify(fn(await getOwnedBusinesses())));
  } catch (e) {
    // ignore
  }
};

export const saveOwnerKey = async (businessId, key, businessName) => {
  if (!businessId || !key) return;
  try {
    await writeRaw(storageKey(businessId), key);
  } catch (e) {
    // Storage unavailable (e.g. private browsing): the owner can re-enter the key later
    return;
  }
  await updateIndex((list) => [
    { id: String(businessId), name: businessName || list.find((b) => b.id === String(businessId))?.name || 'My business' },
    ...list.filter((b) => b.id !== String(businessId)),
  ]);
};

export const removeOwnerKey = async (businessId) => {
  try {
    if (Platform.OS === 'web') window.localStorage.removeItem(storageKey(businessId));
    else await SecureStore.deleteItemAsync(storageKey(businessId));
  } catch (e) {
    // ignore
  }
  await updateIndex((list) => list.filter((b) => b.id !== String(businessId)));
};

// Forget businesses that no longer exist on the server (e.g. deleted), so the phone
// stops showing them. Only a definite "not found" removes one; network errors keep it.
export const getLiveOwnedBusinesses = async (apiBaseUrl) => {
  const list = await getOwnedBusinesses();
  const checks = await Promise.all(list.map(async (b) => {
    try {
      // send the owner key so a business that is still waiting for approval is found too
      const key = await getOwnerKey(b.id);
      const res = await fetch(`${apiBaseUrl}/api/businesses/${encodeURIComponent(b.id)}?track=0`, { headers: { 'X-Manage-Key': key || '' } });
      return res.status === 404 ? null : b;
    } catch (e) {
      return b;
    }
  }));
  const gone = list.filter((b, i) => checks[i] === null);
  for (const b of gone) await removeOwnerKey(b.id);
  return checks.filter(Boolean);
};
