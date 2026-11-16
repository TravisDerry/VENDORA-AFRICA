// Pay for a month of Vendora listing with Mobile Money (Paystack on the server).
// The price is set by the business category (backend/config/pricing.js); the first month is free.
// Steps: choose business -> network + number -> approve on phone (or enter code) -> done.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../theme';
import { Card, Button, TextField, Touchable, IconTile, useStatusBar } from '../components/ui';
import { API_BASE_URL } from '../config';
import { getLiveOwnedBusinesses, getOwnerKey } from '../utils/ownerKeys';
import {
  readJson, isGhanaMomoNumber, formatGhs, usePaymentConfig, usePaymentFlow,
  NetworkPicker, TestModeNote, PaymentProgress, SuccessCard, momoStyles,
} from '../components/MomoPayment';
import LinkBusiness from '../components/LinkBusiness';
import { ListingStatusCard, shortDate } from '../components/ListingStatus';

const PaymentScreen = ({ route, navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const { config, error: loadError, reload } = usePaymentConfig();
  const flow = usePaymentFlow();

  const [owned, setOwned] = useState(null); // businesses this phone has an owner key for
  const [businessId, setBusinessId] = useState(route.params?.business?.id ? String(route.params.business.id) : null);
  const [info, setInfo] = useState(null); // the selected business from the API, incl. listing status
  const [linking, setLinking] = useState(false);
  const [provider, setProvider] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    getLiveOwnedBusinesses(API_BASE_URL).then((list) => {
      const given = route.params?.business;
      const all = given && !list.some((b) => b.id === String(given.id)) ? [{ id: String(given.id), name: given.name }, ...list] : list;
      setOwned(all);
      setBusinessId((cur) => cur || (all[0] ? all[0].id : null));
    });
  }, [route.params?.business]);

  const loadInfo = async (id) => {
    if (!id) return;
    try {
      const key = await getOwnerKey(id);
      const res = await fetch(`${API_BASE_URL}/api/businesses/${encodeURIComponent(id)}?track=0`, { headers: { 'X-Manage-Key': key || '' } });
      const json = await readJson(res);
      if (res.ok) setInfo(json.business || json);
    } catch (e) {
      // the Pay button stays disabled until the price is known
    }
  };
  useEffect(() => { setInfo(null); loadInfo(businessId); }, [businessId]);
  // After a successful payment, reload to show the new end date
  useEffect(() => { if (flow.step === 'success') loadInfo(businessId); }, [flow.step]); // eslint-disable-line react-hooks/exhaustive-deps

  const business = owned?.find((b) => b.id === businessId);
  const listing = info?.listing;
  const amount = listing?.monthlyPrice;
  const categoryName = config?.pricing?.categories?.find((c) => c.id === info?.category)?.name;

  const pay = async () => {
    flow.setError('');
    if (!isGhanaMomoNumber(phone)) return setPhoneError('Enter your Mobile Money number, e.g. 024 123 4567');
    setPhoneError('');
    const key = await getOwnerKey(businessId);
    if (!key) {
      setLinking(true);
      return;
    }
    flow.start('plan', { businessId, provider, phone }, { 'X-Manage-Key': key });
  };

  const onLinked = (b) => {
    setOwned((list) => [b, ...(list || []).filter((x) => x.id !== b.id)]);
    setBusinessId(b.id);
    setLinking(false);
  };

  const wrap = (children) => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + spacing.xxxl }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (loadError) {
    return wrap(
      <Card style={styles.center}>
        <IconTile icon="cloud-offline-outline" size={56} iconSize={28} />
        <Text style={[type.h3, styles.centerText]}>Can't load payments</Text>
        <Text style={[type.small, styles.centerMuted]}>{loadError}</Text>
        <Button title="Try again" icon="refresh" onPress={reload} style={{ marginTop: spacing.lg }} />
      </Card>
    );
  }
  if (!config || !owned) return wrap(<ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />);
  if (!config.enabled) {
    return wrap(
      <Card style={styles.center}>
        <IconTile icon="time-outline" size={56} iconSize={28} />
        <Text style={[type.h3, styles.centerText]}>Payments are being switched on</Text>
        <Text style={[type.small, styles.centerMuted]}>Mobile Money payments are not available yet. Please check back soon.</Text>
      </Card>
    );
  }

  if (owned.length === 0 || linking) {
    return wrap(
      <>
        <LinkBusiness onLinked={onLinked} onCancel={owned.length > 0 ? () => setLinking(false) : null} />
        {owned.length === 0 ? (
          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <Text style={[type.small, { color: colors.textMuted }]}>Not registered yet? Your first month is free.</Text>
            <Button title="Register your business free" variant="outline" icon="add-circle-outline" onPress={() => navigation.navigate('Main', { screen: 'Register' })} style={{ marginTop: spacing.sm }} />
          </View>
        ) : null}
      </>
    );
  }

  const summary = (
    <Card style={styles.summary}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
          Monthly listing · {config.pricing?.periodDays || 30} days{categoryName ? ` · ${categoryName}` : ''}
        </Text>
        <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>{business?.name || info?.businessName || 'My business'}</Text>
      </View>
      {amount ? <Text style={styles.amount}>{formatGhs(amount)}</Text> : <ActivityIndicator color={colors.primary} />}
    </Card>
  );

  if (flow.step === 'success') {
    return wrap(
      <SuccessCard
        title="Payment received"
        message={
          listing?.endsAt && listing.status !== 'expired'
            ? `${business?.name || 'Your business'} is listed until ${shortDate(listing.endsAt)}.`
            : `One month has been added to ${business?.name || 'your business'}'s listing.`
        }
        payment={flow.payment}
        onDone={() => navigation.goBack()}
      />
    );
  }
  if (flow.step !== 'form') return wrap(<>{summary}<PaymentProgress flow={flow} phone={phone} /></>);

  return wrap(
    <>
      {config.testMode ? <TestModeNote /> : null}

      {owned.length > 1 ? (
        <>
          <Text style={styles.label}>Business</Text>
          <Card padded={false}>
            {owned.map((b, i) => {
              const on = b.id === businessId;
              return (
                <Touchable key={b.id} onPress={() => setBusinessId(b.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.bizRow, i > 0 && styles.divider]}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.borderStrong} />
                  <Text style={[type.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{b.name}</Text>
                </Touchable>
              );
            })}
          </Card>
        </>
      ) : null}

      {listing ? <ListingStatusCard listing={listing} style={{ marginTop: spacing.lg }} /> : null}

      <Touchable onPress={() => setLinking(true)} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: spacing.xs }}>
        <Text style={[type.smallStrong, { color: colors.primary }]}>+ Pay for a different business</Text>
      </Touchable>

      <Text style={styles.label}>Mobile Money network</Text>
      <NetworkPicker providers={config.providers} value={provider} onChange={setProvider} />

      <TextField
        label="Mobile Money number"
        icon="call-outline"
        value={phone}
        onChangeText={(v) => { setPhone(v); if (phoneError) setPhoneError(''); }}
        keyboardType="phone-pad"
        placeholder="024 123 4567"
        error={phoneError}
        hint={config.testMode ? 'Test MTN number: 055 123 4987' : 'The number that will receive the payment prompt'}
        style={{ marginTop: spacing.lg }}
      />

      {summary}
      {flow.error ? <Text style={[type.small, styles.error]}>{flow.error}</Text> : null}
      <Button title={amount ? `Pay ${formatGhs(amount)}` : 'Pay'} icon="lock-closed-outline" loading={flow.busy} disabled={!amount} onPress={pay} style={{ marginTop: spacing.lg }} />
      <Text style={[type.caption, styles.centerMuted]}>
        Pays for {config.pricing?.periodDays || 30} days. Paying before your current month ends adds to the end of it. Secured by Paystack; you approve with your own MoMo PIN.
      </Text>
    </>
  );
};

const styles = StyleSheet.create({
  ...momoStyles,
  container: { flex: 1, backgroundColor: colors.background },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});

export default PaymentScreen;
