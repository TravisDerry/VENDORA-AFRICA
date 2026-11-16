import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, TextField, IconTile, Touchable, useStatusBar } from '../components/ui';
import { pickPhoto, uploadPhoto } from '../utils/photos';
import { API_BASE_URL } from '../config';
import { getOwnerKey, saveOwnerKey, removeOwnerKey } from '../utils/ownerKeys';
import { normalizeProducts } from '../utils/products';

const EMPTY = { name: '', price: '', category: '', description: '', imageUrl: '', inStock: true };

const readJson = async (response) => {
  const ct = response.headers.get('content-type') || '';
  return ct.includes('application/json') ? response.json().catch(() => ({})) : {};
};

const networkMessage = (error) =>
  /Failed to fetch|Network request failed/i.test(error?.message || '')
    ? 'Cannot reach the Vendora server. Check your internet connection and try again.'
    : error?.message || 'Something went wrong. Please try again.';

const AddProductScreen = ({ route, navigation }) => {
  const { business } = route.params;
  const insets = useSafeAreaInsets();
  useStatusBar('dark');

  const [ownerKey, setOwnerKey] = useState(null);
  const [checkingKey, setCheckingKey] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getOwnerKey(business.id).then((k) => {
      setOwnerKey(k);
      setCheckingKey(false);
    });
  }, [business.id]);

  const set = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // ---- Step 1: owner key ----
  const verifyKey = async () => {
    const key = keyInput.trim();
    if (!key) return setKeyError('Enter the owner key for this business.');
    setSaving(true);
    setKeyError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${business.id}/verify-key`, {
        method: 'POST',
        headers: { 'X-Manage-Key': key },
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || 'That key is not valid for this business.');
      await saveOwnerKey(business.id, key, business.name);
      setOwnerKey(key);
    } catch (error) {
      setKeyError(networkMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // ---- Step 2: product form ----
  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter a product name (at least 2 characters).';
    const price = form.price.replace(/,/g, '').trim();
    if (price && !(Number(price) >= 0)) e.price = 'Enter a price in numbers, e.g. 250 or 12.50';
    if (photoBusy) e.imageUrl = 'Wait for the photo to finish uploading.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Product photo: pick from the gallery/camera, upload straight away, keep the returned link
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const uploadFrom = async (source) => {
    try {
      const asset = await pickPhoto(source, [1, 1]);
      if (!asset) return;
      setPhotoPreview(asset.uri);
      setPhotoBusy(true);
      setErrors((x) => ({ ...x, imageUrl: undefined }));
      const { url } = await uploadPhoto(business.id, 'uploads', asset, ownerKey);
      set('imageUrl')(url);
    } catch (e) {
      setPhotoPreview(null);
      set('imageUrl')('');
      setErrors((x) => ({ ...x, imageUrl: networkMessage(e) }));
    } finally {
      setPhotoBusy(false);
    }
  };
  const choosePhoto = () => {
    if (Platform.OS === 'web') return uploadFrom('library');
    Alert.alert('Product photo', undefined, [
      { text: 'Choose from gallery', onPress: () => uploadFrom('library') },
      { text: 'Take a photo', onPress: () => uploadFrom('camera') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${business.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Manage-Key': ownerKey },
        body: JSON.stringify({
          name: form.name.trim(),
          price: form.price.replace(/,/g, '').trim() || undefined,
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
          imageUrl: form.imageUrl.trim() || undefined,
          inStock: form.inStock,
        }),
      });
      const result = await readJson(response);
      if (response.status === 401 || response.status === 403) {
        await removeOwnerKey(business.id);
        setOwnerKey(null);
        throw new Error('Your owner key is no longer valid. Please enter it again.');
      }
      if (!response.ok) throw new Error(result.errors?.[0]?.msg || result.error || 'Could not add the product.');

      navigation.popTo('BusinessDetail', { business: { ...business, products: normalizeProducts(result.products) }, tab: 'products' }, { merge: true });
    } catch (error) {
      setFormError(networkMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (checkingKey) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.businessRow}>
          <IconTile icon="business-outline" />
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: colors.textMuted }]}>Adding to</Text>
            <Text style={[type.h3, { color: colors.text }]} numberOfLines={2}>{business.name}</Text>
          </View>
        </View>

        {!ownerKey ? (
          <Card>
            <View style={styles.cardTitleRow}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
              <Text style={[type.h3, { color: colors.text, flex: 1 }]}>Confirm you own this business</Text>
            </View>
            <Text style={[type.small, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              Enter your owner key. Businesses registered in this app already have it saved on the phone they registered with. You only need to do this once on this phone.
            </Text>
            <TextField
              label="Owner key"
              icon="key-outline"
              value={keyInput}
              onChangeText={(t) => { setKeyInput(t); setKeyError(''); }}
              placeholder="Paste your owner key"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              error={keyError}
              returnKeyType="done"
              onSubmitEditing={verifyKey}
            />
            <Button title="Continue" icon="lock-open-outline" onPress={verifyKey} loading={saving} style={{ marginTop: spacing.sm }} />
          </Card>
        ) : (
          <Card>
            <Text style={[type.h3, { color: colors.text, marginBottom: spacing.lg }]}>Product details</Text>
            <TextField label="Product name *" icon="pricetag-outline" value={form.name} onChangeText={set('name')} placeholder="e.g. Jasmine rice 5kg" error={errors.name} maxLength={100} />
            <TextField
              label="Price (GHS)"
              icon="cash-outline"
              value={form.price}
              onChangeText={set('price')}
              placeholder="e.g. 185"
              keyboardType="decimal-pad"
              error={errors.price}
              hint="Leave empty to show “Price on request”."
            />
            <TextField label="Category" icon="pricetags-outline" value={form.category} onChangeText={set('category')} placeholder="e.g. Grains, Smartphones, Dresses" maxLength={50} />
            <TextField
              label="Description"
              value={form.description}
              onChangeText={set('description')}
              placeholder="Size, colour, condition, what's included…"
              multiline
              maxLength={500}
            />
            <Text style={styles.photoLabel}>Photo</Text>
            {photoPreview ? (
              <View style={styles.photoRow}>
                <View>
                  <Image source={{ uri: photoPreview }} style={styles.photo} resizeMode="cover" accessibilityLabel="Product photo" />
                  {photoBusy ? (
                    <View style={styles.photoBusy}><ActivityIndicator color="#FFFFFF" /></View>
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <Text style={[type.small, { color: photoBusy ? colors.textMuted : colors.success }]}>{photoBusy ? 'Uploading photo…' : 'Photo added'}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Button title="Change" size="sm" variant="outline" fullWidth={false} disabled={photoBusy} onPress={choosePhoto} />
                    <Button title="Remove" size="sm" variant="danger" fullWidth={false} disabled={photoBusy} onPress={() => { setPhotoPreview(null); set('imageUrl')(''); }} />
                  </View>
                </View>
              </View>
            ) : (
              <Touchable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel="Add a product photo" style={styles.addPhoto}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
                <Text style={[type.bodyStrong, { color: colors.primary }]}>Add photo</Text>
                <Text style={[type.caption, { color: colors.textMuted }]}>Optional, but products with photos sell better</Text>
              </Touchable>
            )}
            {errors.imageUrl ? <Text style={[type.caption, { color: colors.danger, marginTop: spacing.xs }]}>{errors.imageUrl}</Text> : null}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyStrong, { color: colors.text }]}>In stock</Text>
                <Text style={[type.caption, { color: colors.textMuted }]}>Turn off if customers can't buy it right now.</Text>
              </View>
              <Switch
                value={form.inStock}
                onValueChange={set('inStock')}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel="In stock"
              />
            </View>
            {formError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[type.small, { color: colors.danger, flex: 1 }]}>{formError}</Text>
              </View>
            ) : null}
            <Button title="Add product" icon="add-circle-outline" onPress={submit} loading={saving} style={{ marginTop: spacing.lg }} />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  photoLabel: { ...type.smallStrong, color: colors.textSecondary, marginBottom: spacing.sm },
  addPhoto: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primarySoft,
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photo: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  photoBusy: { ...StyleSheet.absoluteFillObject, borderRadius: radius.md, backgroundColor: 'rgba(11,38,56,0.45)', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.gutter, gap: spacing.lg },
  businessRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
});

export default AddProductScreen;
