// "My orders": payments this phone has made to businesses.
// The phone keeps only the references (utils/myOrders); details and status come from the backend.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Linking, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, Badge, EmptyState, IconButton, useStatusBar } from '../components/ui';
import { API_BASE_URL } from '../config';
import { getMyOrders, removeMyOrder } from '../utils/myOrders';
import { readJson, formatGhs } from '../components/MomoPayment';

const STATUS = {
  success: { label: 'Paid', tone: 'success', icon: 'checkmark-circle' },
  pending: { label: 'Waiting', tone: 'warning', icon: 'time' },
  failed: { label: 'Not completed', tone: 'danger', icon: 'close-circle' },
};

const when = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

const MyOrdersScreen = ({ navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState(null); // [{ local, payment | null }]
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    const local = await getMyOrders();
    let failedFetches = 0;
    const rows = await Promise.all(local.map(async (o) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/${encodeURIComponent(o.r)}`);
        const json = await readJson(res);
        if (res.status === 404) return { local: o, payment: null, missing: true };
        if (!res.ok) throw new Error();
        return { local: o, payment: json.payment };
      } catch (e) {
        failedFetches += 1;
        return { local: o, payment: null };
      }
    }));
    setOffline(local.length > 0 && failedFetches === local.length);
    setOrders(rows.filter((x) => !x.missing));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const phoneDigits = (p) => String(p || '').replace(/[^\d+]/g, '');
  const open = (url) => Linking.openURL(url).catch(() => Alert.alert('Unavailable', 'This is not supported on this device.'));

  const message = (row) => {
    const p = row.payment;
    const text = `Hello ${p?.businessName || ''}, I paid ${p ? formatGhs(p.amount) : ''}${p?.productName ? ` for ${p.productName}` : ''} on Vendora Africa (ref ${row.local.r}).`;
    open(`sms:${phoneDigits(row.local.p)}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`);
  };

  const hide = (row) => {
    const doIt = async () => { await removeMyOrder(row.local.r); load(); };
    if (Platform.OS === 'web') { if (window.confirm('Remove this from My orders? (The payment itself is not affected.)')) doIt(); return; }
    Alert.alert('Remove from list?', 'This only removes it from this phone. The payment itself is not affected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doIt },
    ]);
  };

  if (!orders) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      {offline ? (
        <View style={styles.note}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
          <Text style={[type.smallStrong, { color: colors.warning, flex: 1 }]}>Can't reach Vendora right now. Pull down to try again.</Text>
        </View>
      ) : null}

      {orders.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title="No orders yet"
            message="When you pay a business with Mobile Money in the app, it shows up here."
            actionLabel="Explore businesses"
            onAction={() => navigation.navigate('Main', { screen: 'Browse' })}
          />
        </Card>
      ) : (
        <>
          <Text style={[type.small, { color: colors.textMuted, marginBottom: spacing.md }]}>
            Payments made from this phone. Contact the seller to arrange pickup or delivery.
          </Text>
          {orders.map((row) => {
            const p = row.payment;
            const st = STATUS[p?.status] || null;
            return (
              <Card key={row.local.r} style={styles.order}>
                <View style={styles.top}>
                  <View style={[styles.icon, { backgroundColor: p?.status === 'success' ? colors.successSoft : colors.primarySoft }]}>
                    <Ionicons name="bag-handle-outline" size={20} color={p?.status === 'success' ? colors.success : colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>{p?.businessName || 'Business'}</Text>
                    <Text style={[type.small, { color: colors.textSecondary }]} numberOfLines={2}>
                      {p ? (p.productName ? `${p.productName}${p.quantity > 1 ? ` × ${p.quantity}` : ''}` : 'Payment') : 'Details unavailable offline'}
                    </Text>
                    <Text style={[type.caption, { color: colors.textMuted, marginTop: 2 }]}>{when(p?.paidAt || p?.createdAt || row.local.t)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {p ? <Text style={[type.bodyStrong, { color: colors.text }]}>{formatGhs(p.amount)}</Text> : null}
                    {st ? <Badge label={st.label} tone={st.tone} icon={st.icon} /> : null}
                  </View>
                </View>
                <Text style={[type.caption, { color: colors.textMuted, marginTop: spacing.sm }]} selectable>
                  Ref: {row.local.r}{p?.testMode ? '  ·  Test payment' : ''}
                </Text>
                <View style={styles.actions}>
                  {row.local.p ? (
                    <>
                      <Button title="Call" icon="call-outline" size="sm" variant="outline" onPress={() => open(`tel:${phoneDigits(row.local.p)}`)} style={{ flex: 1 }} />
                      <Button title="Message" icon="chatbubble-ellipses-outline" size="sm" variant="secondary" onPress={() => message(row)} style={{ flex: 1 }} />
                    </>
                  ) : <View style={{ flex: 1 }} />}
                  <IconButton icon="trash-outline" size={18} color={colors.textMuted} background={colors.background} accessibilityLabel="Remove from list" onPress={() => hide(row)} />
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  order: { marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    marginBottom: spacing.md,
  },
});

export default MyOrdersScreen;
