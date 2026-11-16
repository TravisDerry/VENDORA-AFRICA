// Shared Mobile Money pieces used by the plan payment and "pay a business" screens:
// network picker, the approve-on-phone / OTP / failed steps, and the polling logic.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, TextField, Touchable } from './ui';
import { API_BASE_URL } from '../config';

export const NETWORK_STYLE = {
  mtn: { bg: '#FFCC00', fg: '#1A1A1A', short: 'MTN' },
  telecel: { bg: '#E30613', fg: '#FFFFFF', short: 'Telecel' },
  airteltigo: { bg: '#0A3D91', fg: '#FFFFFF', short: 'AT' },
};
const POLL_MS = 4000;
const POLL_LIMIT_MS = 3 * 60 * 1000;

export const readJson = async (response) => {
  const ct = response.headers.get('content-type') || '';
  return ct.includes('application/json') ? response.json().catch(() => ({})) : {};
};

export const networkMessage = (error) =>
  /Failed to fetch|Network request failed|aborted/i.test(error?.message || '')
    ? 'Cannot reach the Vendora server. Check your internet connection and try again.'
    : error?.message || 'Something went wrong. Please try again.';

export const isGhanaMomoNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return (digits.length === 10 && digits.startsWith('0')) || (digits.length === 12 && digits.startsWith('233'));
};

export const formatGhs = (n) => `GHS ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

// Loads /api/payments/config ({ enabled, testMode, providers, plans })
export const usePaymentConfig = () => {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/config`);
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || 'Could not load payment options');
      setConfig(json);
    } catch (e) {
      setError(networkMessage(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { config, error, reload: load };
};

// Starts a payment and follows it to success / failure.
// start(path, body, headers) posts to /api/payments/<path>.
export const usePaymentFlow = () => {
  const [payment, setPayment] = useState(null); // server record + step: approve | otp | success | failed | timeout
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pollStarted = useRef(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const checkStatus = useCallback(async (reference) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${encodeURIComponent(reference)}`);
      const json = await readJson(res);
      if (res.ok && json.payment) {
        setPayment(json.payment);
        return json.payment.step;
      }
    } catch (e) {
      // keep waiting; network blips are common on mobile data
    }
    return 'approve';
  }, []);

  const schedulePoll = useCallback((reference) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const s = await checkStatus(reference);
      if (s !== 'approve') return;
      if (Date.now() - pollStarted.current > POLL_LIMIT_MS) {
        setPayment((p) => ({ ...p, step: 'timeout' }));
        return;
      }
      schedulePoll(reference);
    }, POLL_MS);
  }, [checkStatus]);

  const onStep = (p) => {
    setPayment(p);
    if (p.step === 'approve') {
      pollStarted.current = Date.now();
      schedulePoll(p.reference);
    }
  };

  const start = async (path, body, headers = {}) => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
      const json = await readJson(res);
      if (json.payment) onStep(json.payment);
      else throw new Error(json.error || 'Payment could not be started');
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (otp) => {
    if (!/^\d{4,8}$/.test(String(otp).trim())) return setError('Enter the code sent to your phone.');
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${encodeURIComponent(payment.reference)}/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: String(otp).trim() }),
      });
      const json = await readJson(res);
      if (!res.ok || !json.payment) throw new Error(json.error || 'That code did not work');
      onStep(json.payment);
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const checkNow = async () => {
    setBusy(true);
    const s = await checkStatus(payment.reference);
    setBusy(false);
    if (s === 'approve' || s === 'timeout') setError('Not confirmed yet. Approve the prompt on your phone, then check again.');
    else setError('');
  };

  const restart = () => {
    clearTimeout(timer.current);
    setPayment(null);
    setError('');
  };

  return { payment, step: payment?.step || 'form', busy, error, setError, start, submitOtp, checkNow, restart };
};

// Row of network choices (MTN / Telecel / AirtelTigo)
export const NetworkPicker = ({ providers, value, onChange }) => (
  <View style={styles.row}>
    {providers.map((p) => {
      const on = value === p.id;
      const net = NETWORK_STYLE[p.id] || NETWORK_STYLE.mtn;
      return (
        <Touchable key={p.id} onPress={() => onChange(p.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={p.name} style={[styles.choice, on && styles.choiceOn]}>
          <View style={[styles.netBadge, { backgroundColor: net.bg }]}>
            <Text style={{ color: net.fg, fontWeight: '800', fontSize: 11 }}>{net.short}</Text>
          </View>
          <Text style={[type.caption, { color: on ? colors.primary : colors.text, fontWeight: '700', textAlign: 'center' }]} numberOfLines={2}>{p.name}</Text>
        </Touchable>
      );
    })}
  </View>
);

export const TestModeNote = () => (
  <View style={styles.note}>
    <Ionicons name="flask-outline" size={18} color={colors.warning} />
    <Text style={[type.smallStrong, { color: colors.warning, flex: 1 }]}>Test mode: no real money will be taken.</Text>
  </View>
);

// Approve-on-phone, OTP, failed and timeout steps. Success is drawn by each screen.
export const PaymentProgress = ({ flow, phone }) => {
  const [otp, setOtp] = useState('');
  const { payment, step, busy, error } = flow;
  const net = NETWORK_STYLE[payment.provider] || NETWORK_STYLE.mtn;

  if (step === 'failed' || step === 'timeout') {
    const failed = step === 'failed';
    return (
      <Card style={[styles.center, { marginTop: spacing.lg }]}>
        <View style={[styles.bigIcon, { backgroundColor: failed ? colors.dangerSoft : colors.warningSoft }]}>
          <Ionicons name={failed ? 'close-circle' : 'time'} size={48} color={failed ? colors.danger : colors.warning} />
        </View>
        <Text style={[type.h3, styles.centerText]}>{failed ? 'Payment not completed' : 'Still waiting for approval'}</Text>
        <Text style={[type.small, styles.centerMuted]}>
          {failed
            ? payment.message || 'The payment was declined or cancelled. No money was taken.'
            : 'We have not received confirmation yet. If you approved it, tap "Check again".'}
        </Text>
        {!failed ? <Button title="Check again" icon="refresh" loading={busy} onPress={flow.checkNow} style={{ marginTop: spacing.lg }} /> : null}
        {error ? <Text style={[type.small, styles.error]}>{error}</Text> : null}
        <Button title="Try again" variant={failed ? 'primary' : 'outline'} onPress={flow.restart} style={{ marginTop: spacing.sm }} />
      </Card>
    );
  }

  return (
    <Card style={[styles.center, { marginTop: spacing.lg }]}>
      <View style={[styles.bigIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={step === 'otp' ? 'keypad-outline' : 'phone-portrait-outline'} size={40} color={colors.primary} />
      </View>
      <Text style={[type.h3, styles.centerText]}>{step === 'otp' ? 'Enter the code' : 'Check your phone'}</Text>
      <Text style={[type.body, styles.centerMuted]}>
        {step === 'otp'
          ? payment.message || 'Enter the code sent to your phone by SMS.'
          : `A ${net.short} prompt for ${formatGhs(payment.amount)} has been sent to ${phone}. Enter your Mobile Money PIN to approve.`}
      </Text>
      {step === 'otp' ? (
        <>
          <TextField label="Code" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={8} placeholder="123456" style={{ alignSelf: 'stretch', marginTop: spacing.lg }} />
          <Button title="Confirm code" loading={busy} onPress={() => flow.submitOtp(otp)} />
        </>
      ) : (
        <>
          <View style={styles.waiting}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[type.small, { color: colors.textMuted }]}>Waiting for approval…</Text>
          </View>
          <Text style={[type.caption, styles.centerMuted]}>No prompt? On MTN, dial *170# and check My Approvals. Keep this screen open.</Text>
          <Button title="I've approved it" variant="outline" loading={busy} onPress={flow.checkNow} style={{ marginTop: spacing.lg }} />
        </>
      )}
      {error ? <Text style={[type.small, styles.error]}>{error}</Text> : null}
      <Touchable onPress={flow.restart} accessibilityRole="button" style={{ marginTop: spacing.md, padding: spacing.sm }}>
        <Text style={[type.smallStrong, { color: colors.textMuted }]}>Cancel</Text>
      </Touchable>
    </Card>
  );
};

export const SuccessCard = ({ title, message, payment, onDone, doneLabel = 'Done', extra }) => (
  <Card style={styles.center}>
    <View style={[styles.bigIcon, { backgroundColor: colors.successSoft }]}>
      <Ionicons name="checkmark-circle" size={48} color={colors.success} />
    </View>
    <Text style={[type.h2, styles.centerText]}>{title}</Text>
    <Text style={[type.body, styles.centerMuted]}>{message}</Text>
    <Text style={[type.caption, styles.centerMuted]}>Reference: {payment.reference}</Text>
    {payment.testMode ? <Text style={[type.caption, { color: colors.warning, marginTop: spacing.sm }]}>Test payment: no real money was taken.</Text> : null}
    <Button title={doneLabel} onPress={onDone} style={{ marginTop: spacing.xl }} />
    {extra}
  </Card>
);

export const momoStyles = StyleSheet.create({
  label: { ...type.smallStrong, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  center: { alignItems: 'center', paddingVertical: spacing.xxl },
  centerText: { color: colors.text, textAlign: 'center', marginTop: spacing.lg },
  centerMuted: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  amount: { fontSize: 24, fontWeight: '800', color: colors.primary },
  row: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});

const styles = StyleSheet.create({
  ...momoStyles,
  bigIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  netBadge: { minWidth: 44, height: 28, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
});
