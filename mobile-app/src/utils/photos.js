// Business and product photos: turning stored URLs into image sources, picking photos from the
// phone, and uploading them to the Vendora backend.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_BASE_URL } from '../config';

// Stored URLs are either full links (https://..., e.g. Cloudinary) or files on our server (/uploads/...)
export const resolvePhoto = (url) => {
  if (typeof url !== 'string' || !url) return null;
  if (/^https?:\/\//i.test(url)) return { uri: url };
  if (url.startsWith('/uploads/')) return { uri: `${API_BASE_URL}${url}` };
  return null;
};

// The business's own cover photo, or null (then the app shows a plain branded cover)
export const businessPhoto = (business = {}) => resolvePhoto(business.image || business.coverImage || business.logo);

// Let the owner choose a photo. source: 'library' or 'camera'. Returns the picked asset or null.
export const pickPhoto = async (source = 'library', aspect = [16, 10]) => {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && Platform.OS !== 'web') {
    throw new Error(source === 'camera'
      ? 'Allow camera access in your phone settings to take a photo.'
      : 'Allow photo access in your phone settings to choose a photo.');
  }
  const options = { mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.7 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets || !result.assets[0]) return null;
  return toJpeg(result.assets[0]);
};

const MAX_WIDTH = 1600;

// Phones often save photos as HEIC (iPhone) or very large files. Convert every photo to a JPG of
// at most 1600px wide before uploading, so any phone's photo works and uploads stay small.
export const toJpeg = async (asset) => {
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width && asset.width > MAX_WIDTH) ctx.resize({ width: MAX_WIDTH });
    const image = await ctx.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    return { uri: saved.uri, width: saved.width, height: saved.height, mimeType: 'image/jpeg', fileName: 'photo.jpg', base64: saved.base64 };
  } catch (e) {
    // The phone/browser couldn't read this photo (e.g. an iPhone HEIC photo in a non-Apple browser)
    const type = String(asset.mimeType || asset.fileName || asset.uri || '').toLowerCase();
    if (/jpe?g|png|webp/.test(type)) return asset;
    throw new Error("This photo's format isn't supported here. Choose a different photo, or take a screenshot of it and choose the screenshot.");
  }
};

// Upload a picked photo to /api/businesses/<id>/<path> ('photo' for the cover, 'uploads' for products)
export const uploadPhoto = async (businessId, path, asset, ownerKey) => {
  const url = `${API_BASE_URL}/api/businesses/${encodeURIComponent(businessId)}/${path}`;
  // Normal case: the converted JPG is sent as base64 text in a JSON request. This works the same on
  // iPhone, Android and web (Expo 58's fetch can't send React Native style file attachments).
  if (asset.base64) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Manage-Key': ownerKey || '' },
      body: JSON.stringify({ photo: asset.base64 }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Could not upload the photo');
    return json;
  }
  if (Platform.OS !== 'web') {
    throw new Error("This photo's format isn't supported here. Choose a different photo, or take a screenshot of it and choose the screenshot.");
  }
  // Web fallback: a normal file upload
  const form = new FormData();
  const mime = asset.mimeType || 'image/jpeg';
  const name = asset.fileName || `photo.${mime.split('/')[1] || 'jpg'}`;
  const blob = asset.file || (await (await fetch(asset.uri)).blob());
  form.append('photo', blob, name);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Manage-Key': ownerKey || '' },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Could not upload the photo');
  return json;
};
