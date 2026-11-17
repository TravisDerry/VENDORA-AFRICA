// A customer pays a business with Mobile Money: for a listed product, or an amount agreed with the seller.
// Money is settled by Paystack straight to the business's own MoMo number.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, TextField, Touchable, IconTile, useStatusBar } from '../components/ui';
import { ProductPhoto } from '../components/BusinessCover';
import { addMyOrder } from '../utils/myOrders';
import {
  isGhanaMomoNumber, formatGhs, usePaymentConfig, usePaymentFlow,
  NetworkPicker, TestModeNote, PaymentProgress, SuccessCard, momoStyles,
} from '../components/MomoPayment';

const PayBusinessScreen = ({ route, navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const { business, product } = route.params;
  const { config, error: loadError, reload } = usePaymentConfig();
  const flow = usePaymentFlow();

  // Remember this payment on the phone for "My orders" (not if it failed straight away)
  const ref = flow.payment?.reference;
  useEffect(() => {
    if (ref && flow.payment?.purpose === 'order' && flow.payment?.step !== 'failed') {
      addMyOrder({ reference: ref, businessId: business.id, businessPhone: business.phone });
    }
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps

  const [quantity, setQuantity] = useState(1);
  const [amountText, setAmountText] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [provider, setProvider] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});

  const unitPrice = product?.priceValue;
  const amount = product ? Math.round(unitPrice * quantity * 100) / 100 : Number(amountText.replace(/,/g, '')) || 0;

  const pay = () => {
    const e = {};
    if (!product && !(amount >= 1 && amount <= 10000)) e.amount = 'Enter an amount between GHS 1 and GHS 10,000';
    if (name.trim().length < 2) e.name = 'Enter your name so the seller knows who paid';
    if (!isGhanaMomoNumber(phone)) e.phone = 'Enter your Mobile Money number, e.g. 024 123 4567';
    setErrors(e);
    if (Object.keys(e).length) return;
    flow.start('order', {
      businessId: business.id,
      provider,
      phone,
      customerName: name.trim(),
      note: note.trim() || undefined,
      ...(product ? { productId: product.id, quantity } : { amount }),
    });
  };

  const clear = (field) => errors[field] && setErrors((x) => ({ ...x, [field]: undefined }));

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
  if (!config) return wrap(<ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxxl }} />);
  if (!config.enabled) {
    return wrap(
      <Card style={styles.center}>
        <IconTile icon="time-outline" size={56} iconSize={28} />
        <Text style={[type.h3, styles.centerText]}>Payments are being switched on</Text>
        <Text style={[type.small, styles.centerMuted]}>Call or message {business.name} to arrange payment for now.</Text>
      </Card>
    );
  }

  const summary = (
    <Card style={styles.summary}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {product ? `${product.name}${quantity > 1 ? ` × ${quantity}` : ''}` : 'Payment to'}
        </Text>
        <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>{business.name}</Text>
      </View>
      <Text style={styles.amount}>{formatGhs(amount)}</Text>
    </Card>
  );

  if (flow.step === 'success') {
    return wrap(
      <SuccessCard
        title="Payment sent"
        message={`${formatGhs(flow.payment.amount)} was paid to ${business.name}${flow.payment.productName ? ` for ${flow.payment.productName}` : ''}. The seller can see your name and note. Contact them to arrange pickup or delivery.`}
        payment={flow.payment}
        doneLabel={`Back to ${business.name}`}
        onDone={() => navigation.goBack()}
        extra={<Button title="View my orders" variant="outline" icon="receipt-outline" onPress={() => navigation.navigate('MyOrders')} style={{ marginTop: spacing.sm }} />}
      />
    );
  }
  if (flow.step !== 'form') return wrap(<>{summary}<PaymentProgress flow={flow} phone={phone} /></>);

  return wrap(
    <>
      {config.testMode ? <TestModeNote /> : null}

      {product ? (
        <Card style={[styles.product, { marginTop: config.testMode ? spacing.lg : 0 }]}>
          <ProductPhoto product={product} business={business} style={styles.productImage} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.title, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
            <Text style={[type.bodyStrong, { color: colors.primary, marginTop: 2 }]}>{formatGhs(unitPrice)}</Text>
          </View>
          <View style={styles.stepper}>
            <Touchable onPress={() => setQuantity((q) => Math.max(1, q - 1))} accessibilityRole="button" accessibilityLabel="Fewer" style={styles.stepBtn}>
              <Ionicons name="remove" size={18} color={colors.primary} />
            </Touchable>
            <Text style={[type.bodyStrong, { color: colors.text, minWidth: 22, textAlign: 'center' }]}>{quantity}</Text>
            <Touchable onPress={() => setQuantity((q) => Math.min(50, q + 1))} accessibilityRole="button" accessibilityLabel="More" style={styles.stepBtn}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </Touchable>
          </View>
        </Card>
      ) : (
        <TextField
          label={`Amount to pay ${business.name}`}
          icon="cash-outline"
          value={amountText}
          onChangeText={(v) => { setAmountText(v); clear('amount'); }}
          keyboardType="decimal-pad"
          placeholder="e.g. 150"
          error={errors.amount}
          hint="Pay only an amount you have agreed with the seller."
          style={{ marginTop: config.testMode ? spacing.lg : 0 }}
        />
      )}

      <TextField label="Your name" icon="person-outline" value={name} onChangeText={(v) => { setName(v); clear('name'); }} placeholder="So the seller knows who paid" error={errors.name} style={{ marginTop: spacing.lg }} />
      <TextField label="Note for the seller (optional)" icon="chatbox-outline" value={note} onChangeText={setNote} placeholder="e.g. size, colour, delivery area" maxLength={200} style={{ marginTop: spacing.md }} />

      <Text style={styles.label}>Mobile Money network</Text>
      <NetworkPicker providers={config.providers} value={provider} onChange={setProvider} />

      <TextField
        label="Your Mobile Money number"
        icon="call-outline"
        value={phone}
        onChangeText={(v) => { setPhone(v); clear('phone'); }}
        keyboardType="phone-pad"
        placeholder="024 123 4567"
        error={errors.phone}
        hint={config.testMode ? 'Test MTN number: 055 123 4987' : 'You will get a prompt on this phone to approve'}
        style={{ marginTop: spacing.lg }}
      />

      {summary}
      {flow.error ? <Text style={[type.small, styles.error]}>{flow.error}</Text> : null}
      <Button title={amount > 0 ? `Pay ${formatGhs(amount)}` : 'Pay'} icon="lock-closed-outline" loading={flow.busy} onPress={pay} style={{ marginTop: spacing.lg }} />
      <View style={styles.safety}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={[type.caption, { color: colors.textMuted, flex: 1 }]}>
          Paid through Paystack straight to {business.name}'s Mobile Money. Only pay sellers you trust; Vendora does not hold the money or handle refunds.
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  ...momoStyles,
  container: { flex: 1, backgroundColor: colors.background },
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  productImage: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  safety: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

export default PayBusinessScreen;
