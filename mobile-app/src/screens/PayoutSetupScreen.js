// Business owner: choose the MoMo number that receives customer payments, and see payments received.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, TextField, IconTile, Badge, useStatusBar } from '../components/ui';
import { API_BASE_URL } from '../config';
import { getOwnerKey } from '../utils/ownerKeys';
import {
  readJson, networkMessage, isGhanaMomoNumber, formatGhs, usePaymentConfig,
  NetworkPicker, TestModeNote, NETWORK_STYLE, momoStyles,
} from '../components/MomoPayment';

const when = (d) => {
  try {
    return new Date(d).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

const PayoutSetupScreen = ({ route, navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const { business } = route.params;
  const { config, error: configError, reload } = usePaymentConfig();

  const [key, setKey] = useState(undefined); // undefined = still loading, null = no key on this phone
  const [payout, setPayout] = useState(null); // { enabled, provider, phone, accountName, commissionPercent }
  const [received, setReceived] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);

  const [provider, setProvider] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [accountName, setAccountName] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    const k = await getOwnerKey(business.id);
    setKey(k || null);
    if (!k) return;
    try {
      const headers = { 'X-Manage-Key': k };
      const [pr, rr] = await Promise.all([
        fetch(`${API_BASE_URL}/api/payments/payout/${business.id}`, { headers }),
        fetch(`${API_BASE_URL}/api/payments/received/${business.id}`, { headers }),
      ]);
      const pj = await readJson(pr);
      const rj = await readJson(rr);
      if (!pr.ok) throw new Error(pj.error || 'Could not load payout settings');
      setPayout(pj);
      setReceived(rj.payments || []);
      if (pj.provider) setProvider(pj.provider);
      if (pj.accountName) setAccountName(pj.accountName);
    } catch (e) {
      setLoadError(networkMessage(e));
    }
  }, [business.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Keep the business page in step with the new setting
  const backToBusiness = (enabled) =>
    navigation.popTo('BusinessDetail', { business: { ...business, acceptsPayments: enabled }, tab: 'products' }, { merge: true });

  const save = async () => {
    const e = {};
    if (!isGhanaMomoNumber(phone)) e.phone = 'Enter the MoMo number to receive money, e.g. 024 123 4567';
    if (accountName.trim().length < 2) e.accountName = 'Enter the name registered on this MoMo account';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/payout/${business.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Manage-Key': key },
        body: JSON.stringify({ provider, phone, accountName: accountName.trim() }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || 'Could not save');
      setPayout((p) => ({ ...p, ...json }));
      setEditing(false);
      setPhone('');
    } catch (err) {
      setSaveError(networkMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const turnOff = () => {
    const doIt = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/payout/${business.id}`, { method: 'DELETE', headers: { 'X-Manage-Key': key } });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error || 'Could not update');
        setPayout((p) => ({ ...p, enabled: false }));
      } catch (err) {
        setSaveError(networkMessage(err));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Stop accepting payments in the app?')) doIt();
      return;
    }
    Alert.alert('Stop accepting payments?', 'Customers will no longer see the Pay and Buy buttons on your page.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: doIt },
    ]);
  };

  const wrap = (children) => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + spacing.xxxl }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (configError || loadError) {
    return wrap(
      <Card style={styles.center}>
        <IconTile icon="cloud-offline-outline" size={56} iconSize={28} />
        <Text style={[type.h3, styles.centerText]}>Can't load payments</Text>
        <Text style={[type.small, styles.centerMuted]}>{configError || loadError}</Text>
        <Button title="Try again" icon="refresh" onPress={() => { reload(); load(); }} style={{ marginTop: spacing.lg }} />
      </Card>
    );
  }
  if (key === undefined) return wrap(<ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />);
  if (!key) {
    return wrap(
      <Card style={styles.center}>
        <IconTile icon="key-outline" size={56} iconSize={28} />
        <Text style={[type.h3, styles.centerText]}>Owner key needed</Text>
        <Text style={[type.small, styles.centerMuted]}>Enter your owner key on your business page first.</Text>
        <Button title="Enter owner key" onPress={() => navigation.navigate('AddProduct', { business })} style={{ marginTop: spacing.lg }} />
      </Card>
    );
  }
  if (!config || !payout) return wrap(<ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />);
  if (!config.enabled) {
    return wrap(
      <Card style={styles.center}>
        <IconTile icon="time-outline" size={56} iconSize={28} />
        <Text style={[type.h3, styles.centerText]}>Payments are being switched on</Text>
        <Text style={[type.small, styles.centerMuted]}>Please check back soon.</Text>
      </Card>
    );
  }

  const showForm = editing || !payout.provider;
  const net = NETWORK_STYLE[payout.provider] || NETWORK_STYLE.mtn;
  const total = received.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return wrap(
    <>
      {config.testMode ? <TestModeNote /> : null}

      {/* Status */}
      <Card style={[styles.status, { marginTop: config.testMode ? spacing.lg : 0 }]}>
        <View style={[styles.statusIcon, { backgroundColor: payout.enabled ? colors.successSoft : colors.primarySoft }]}>
          <Ionicons name={payout.enabled ? 'checkmark-circle' : 'wallet-outline'} size={26} color={payout.enabled ? colors.success : colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.title, { color: colors.text }]}>{payout.enabled ? 'Accepting MoMo payments' : 'Not accepting payments yet'}</Text>
          <Text style={[type.small, { color: colors.textMuted, marginTop: 2 }]}>
            {payout.enabled
              ? 'Customers see Pay and Buy buttons on your page.'
              : 'Add the MoMo number where you want to receive money.'}
          </Text>
        </View>
      </Card>

      {!showForm ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[type.caption, { color: colors.textMuted }]}>Money is sent to</Text>
          <View style={styles.payoutRow}>
            <View style={[styles.netBadge, { backgroundColor: net.bg }]}>
              <Text style={{ color: net.fg, fontWeight: '800', fontSize: 11 }}>{net.short}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.bodyStrong, { color: colors.text }]}>{payout.phone}</Text>
              <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{payout.accountName}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <Button title="Change" icon="create-outline" variant="outline" size="md" onPress={() => setEditing(true)} style={{ flex: 1 }} />
            {payout.enabled ? (
              <Button title="Turn off" variant="danger" size="md" onPress={turnOff} style={{ flex: 1 }} />
            ) : (
              <Button title="Turn on" size="md" loading={saving} onPress={() => setEditing(true)} style={{ flex: 1 }} />
            )}
          </View>
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[type.title, { color: colors.text }]}>Where should we send your money?</Text>
          <Text style={[type.small, { color: colors.textMuted, marginTop: 2 }]}>Paystack sends each customer payment to this MoMo wallet.</Text>
          <Text style={styles.label}>Network</Text>
          <NetworkPicker providers={config.providers} value={provider} onChange={setProvider} />
          <TextField
            label="MoMo number to receive money"
            icon="call-outline"
            value={phone}
            onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors((x) => ({ ...x, phone: undefined })); }}
            keyboardType="phone-pad"
            placeholder="024 123 4567"
            error={errors.phone}
            hint={config.testMode ? 'Test MTN number: 055 123 4987' : undefined}
            style={{ marginTop: spacing.lg }}
          />
          <TextField
            label="Name on the MoMo account"
            icon="person-outline"
            value={accountName}
            onChangeText={(v) => { setAccountName(v); if (errors.accountName) setErrors((x) => ({ ...x, accountName: undefined })); }}
            placeholder="e.g. Kwame Mensah"
            error={errors.accountName}
            style={{ marginTop: spacing.md }}
          />
          {saveError ? <Text style={[type.small, styles.error]}>{saveError}</Text> : null}
          <Button title="Save and accept payments" icon="checkmark" loading={saving} onPress={save} style={{ marginTop: spacing.md }} />
          {payout.provider ? <Button title="Cancel" variant="outline" onPress={() => setEditing(false)} style={{ marginTop: spacing.xs }} /> : null}
          <Text style={[type.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
            Paystack's fee is taken from each payment{payout.commissionPercent ? ` plus a ${payout.commissionPercent}% Vendora fee` : ''}. Paystack pays out on its normal settlement schedule.
          </Text>
        </Card>
      )}

      {/* Received */}
      <View style={styles.receivedHead}>
        <Text style={[type.h3, { color: colors.text }]}>Payments received</Text>
        {received.length ? <Badge label={formatGhs(total)} tone="success" /> : null}
      </View>
      {received.length === 0 ? (
        <Card>
          <Text style={[type.small, { color: colors.textMuted, textAlign: 'center' }]}>No payments yet. When customers pay you, you will see their name, what they paid for and any note here.</Text>
        </Card>
      ) : (
        <Card padded={false}>
          {received.map((p, i) => (
            <View key={p.reference} style={[styles.payRow, i > 0 && styles.divider]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>{p.customerName || 'Customer'}</Text>
                <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  {p.productName ? `${p.productName}${p.quantity > 1 ? ` × ${p.quantity}` : ''}` : 'Payment'} · {p.customerPhone} · {when(p.paidAt)}
                </Text>
                {p.note ? <Text style={[type.small, { color: colors.textSecondary, marginTop: 2 }]}>"{p.note}"</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[type.bodyStrong, { color: colors.success }]}>{formatGhs(p.amount)}</Text>
                {p.testMode ? <Text style={[type.caption, { color: colors.warning }]}>Test</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      )}

      <Button title={`Back to ${business.name}`} variant="outline" onPress={() => backToBusiness(!!payout.enabled)} style={{ marginTop: spacing.xl }} />
    </>
  );
};

const styles = StyleSheet.create({
  ...momoStyles,
  container: { flex: 1, backgroundColor: colors.background },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  netBadge: { minWidth: 44, height: 28, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  receivedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.sm },
  payRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});

export default PayoutSetupScreen;
