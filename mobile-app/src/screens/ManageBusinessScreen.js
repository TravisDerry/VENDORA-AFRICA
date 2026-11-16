// "Manage my business" (Account tab): owners find their business, enter the owner key once,
// and jump straight to their owner tools. Customers never need this screen.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, Touchable, IconButton, useStatusBar } from '../components/ui';
import { API_BASE_URL } from '../config';
import { getOwnedBusinesses, getLiveOwnedBusinesses, removeOwnerKey, getOwnerKey } from '../utils/ownerKeys';
import { normalizeBusiness } from '../utils/businesses';
import { readJson, networkMessage } from '../components/MomoPayment';
import LinkBusiness from '../components/LinkBusiness';
import { OwnerKeyCard } from '../components/OwnerKeyCard';

const ManageBusinessScreen = ({ route, navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const fromBusiness = route.params?.business; // opened from "Is this your business?" on a business page
  const [owned, setOwned] = useState(null);
  const [adding, setAdding] = useState(!!fromBusiness);
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState('');
  const [shownKey, setShownKey] = useState(null); // { id, name, key }
  const toggleKey = async (b) => {
    if (shownKey?.id === b.id) return setShownKey(null);
    const key = await getOwnerKey(b.id);
    if (key) setShownKey({ id: b.id, name: b.name, key });
  };

  useFocusEffect(useCallback(() => { getLiveOwnedBusinesses(API_BASE_URL).then(setOwned); }, []));

  const openOwnerTools = async (b) => {
    setError('');
    setOpening(b.id);
    try {
      const key = await getOwnerKey(b.id);
      const res = await fetch(`${API_BASE_URL}/api/businesses/${encodeURIComponent(b.id)}?track=0`, { headers: { 'X-Manage-Key': key || '' } });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || 'Could not open this business');
      navigation.navigate('BusinessDetail', { business: normalizeBusiness(json.business || json, 0), tab: 'products' });
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setOpening(null);
    }
  };

  const onLinked = (b) => {
    setAdding(false);
    if (fromBusiness) {
      // Back to the page they came from; it switches to owner tools when it regains focus
      navigation.popTo('BusinessDetail', { tab: 'products' }, { merge: true });
      return;
    }
    openOwnerTools(b);
  };

  const forget = (b) => {
    const doIt = async () => { await removeOwnerKey(b.id); setOwned(await getOwnedBusinesses()); };
    const msg = `This phone will stop managing ${b.name}. You can add it again later with the owner key.`;
    if (Platform.OS === 'web') { if (window.confirm(msg)) doIt(); return; }
    Alert.alert('Remove from this phone?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doIt },
    ]);
  };

  if (!owned) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + spacing.xxxl }} keyboardShouldPersistTaps="handled">
        <Text style={[type.small, { color: colors.textMuted, marginBottom: spacing.md }]}>
          Business owners: add products, receive MoMo payments and pay your monthly listing. You need the owner key for your business.
        </Text>

        {owned.length > 0 && !adding ? (
          <>
            <Text style={styles.label}>Businesses you manage on this phone</Text>
            <Card padded={false}>
              {owned.map((b, i) => (
                <View key={b.id} style={[styles.row, i > 0 && styles.divider]}>
                  <Touchable onPress={() => openOwnerTools(b)} accessibilityRole="button" accessibilityLabel={`Manage ${b.name}`} style={styles.rowMain}>
                    <View style={styles.rowIcon}>
                      <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>{b.name}</Text>
                      <Text style={[type.caption, { color: colors.textMuted }]}>Products, payments and listing</Text>
                    </View>
                    {opening === b.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />}
                  </Touchable>
                  <IconButton icon="key-outline" size={16} color={colors.primary} background={colors.primarySoft} accessibilityLabel={`Show owner key for ${b.name}`} onPress={() => toggleKey(b)} />
                  <View style={{ width: spacing.xs }} />
                  <IconButton icon="close" size={16} color={colors.textMuted} background={colors.background} accessibilityLabel={`Remove ${b.name} from this phone`} onPress={() => forget(b)} />
                </View>
              ))}
            </Card>
            {shownKey ? <OwnerKeyCard businessName={shownKey.name} ownerKey={shownKey.key} style={{ marginTop: spacing.md }} /> : null}
            {error ? <Text style={[type.small, styles.error]}>{error}</Text> : null}
            <Button title="Add another business" icon="add" variant="outline" onPress={() => setAdding(true)} style={{ marginTop: spacing.lg }} />
          </>
        ) : (
          <>
            <LinkBusiness
              initialBusiness={fromBusiness}
              title="Find your business"
              submitLabel="Open owner tools"
              onLinked={onLinked}
              onCancel={owned.length > 0 || fromBusiness ? () => (fromBusiness ? navigation.goBack() : setAdding(false)) : null}
            />
            {error ? <Text style={[type.small, styles.error]}>{error}</Text> : null}
            <View style={styles.help}>
              <Ionicons name="help-circle-outline" size={18} color={colors.textMuted} />
              <Text style={[type.caption, { color: colors.textMuted, flex: 1 }]}>
                Don't have your owner key? It was shown when you registered. Lost it? Contact Vendora support to get a new one.
              </Text>
            </View>
            {owned.length === 0 && !fromBusiness ? (
              <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
                <Text style={[type.small, { color: colors.textMuted }]}>Not on Vendora yet?</Text>
                <Button title="Register your business free" variant="outline" icon="add-circle-outline" onPress={() => navigation.navigate('Main', { screen: 'Register' })} style={{ marginTop: spacing.sm }} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { ...type.smallStrong, color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.md },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  help: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xs },
});

export default ManageBusinessScreen;
