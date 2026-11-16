// Owner: set the business's opening hours (shown to customers on the About tab).
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, Touchable, useStatusBar } from '../components/ui';
import { API_BASE_URL } from '../config';
import { getOwnerKey } from '../utils/ownerKeys';
import { DAYS, normalizeHours } from '../utils/hours';
import { readJson, networkMessage } from '../components/MomoPayment';

const DEFAULT = { open: '08:00', close: '18:00', closed: false };

// Accept "8", "830", "8:30", "08.30" and turn them into "08:30"
const tidyTime = (v) => {
  const digits = String(v || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  let h;
  let m;
  if (digits.length <= 2) { h = digits; m = '00'; } else { h = digits.slice(0, digits.length - 2); m = digits.slice(-2); }
  return `${String(Number(h)).padStart(2, '0')}:${m}`;
};

const OpeningHoursScreen = ({ route, navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const { business } = route.params;
  const existing = business.hours || normalizeHours(business.businessHours);
  const [hours, setHours] = useState(() => {
    const start = {};
    DAYS.forEach((d) => {
      const row = existing?.find((r) => r.id === d.id);
      start[d.id] = row ? { open: row.open, close: row.close, closed: row.closed } : { ...DEFAULT, closed: d.id === 'sunday' };
    });
    return start;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (day, patch) => setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }));
  const copyMondayToWeekdays = () => setHours((h) => {
    const next = { ...h };
    ['tuesday', 'wednesday', 'thursday', 'friday'].forEach((d) => { next[d] = { ...h.monday }; });
    return next;
  });

  const save = async () => {
    setError('');
    const body = {};
    for (const d of DAYS) {
      const v = hours[d.id];
      body[d.id] = v.closed ? { closed: true } : { closed: false, open: tidyTime(v.open), close: tidyTime(v.close) };
    }
    setSaving(true);
    try {
      const key = await getOwnerKey(business.id);
      const res = await fetch(`${API_BASE_URL}/api/businesses/${business.id}/hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Manage-Key': key || '' },
        body: JSON.stringify({ hours: body }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || 'Could not save opening hours');
      navigation.popTo('BusinessDetail', { business: { ...business, hours: normalizeHours(json.businessHours) }, tab: 'about' }, { merge: true });
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + spacing.xxxl }} keyboardShouldPersistTaps="handled">
        <Text style={[type.small, { color: colors.textMuted, marginBottom: spacing.md }]}>
          Customers see these hours on your page. Use 24-hour time, e.g. 08:00 to 18:00.
        </Text>
        <Card padded={false}>
          {DAYS.map((d, i) => {
            const v = hours[d.id];
            return (
              <View key={d.id} style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.dayCol}>
                  <Text style={[type.bodyStrong, { color: colors.text }]}>{d.label}</Text>
                  <View style={styles.openSwitch}>
                    <Switch
                      value={!v.closed}
                      onValueChange={(open) => set(d.id, { closed: !open })}
                      accessibilityLabel={`${d.label} open`}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                      ios_backgroundColor={colors.border}
                    />
                    <Text style={[type.caption, { color: v.closed ? colors.danger : colors.success }]}>{v.closed ? 'Closed' : 'Open'}</Text>
                  </View>
                </View>
                {!v.closed ? (
                  <View style={styles.times}>
                    <TextInput
                      value={v.open}
                      onChangeText={(t) => set(d.id, { open: t })}
                      onBlur={() => set(d.id, { open: tidyTime(v.open) })}
                      placeholder="08:00"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      accessibilityLabel={`${d.label} opening time`}
                      style={[type.body, styles.time]}
                    />
                    <Text style={[type.small, { color: colors.textMuted }]}>to</Text>
                    <TextInput
                      value={v.close}
                      onChangeText={(t) => set(d.id, { close: t })}
                      onBlur={() => set(d.id, { close: tidyTime(v.close) })}
                      placeholder="18:00"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      accessibilityLabel={`${d.label} closing time`}
                      style={[type.body, styles.time]}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
        <Touchable onPress={copyMondayToWeekdays} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: spacing.md }}>
          <Text style={[type.smallStrong, { color: colors.primary }]}>Copy Monday's hours to Tuesday – Friday</Text>
        </Touchable>
        {error ? <Text style={[type.small, { color: colors.danger, textAlign: 'center', marginBottom: spacing.sm }]}>{error}</Text> : null}
        <Button title="Save opening hours" icon="checkmark" loading={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, minHeight: 64 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  dayCol: { gap: 2, flexShrink: 1 },
  openSwitch: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  times: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  time: {
    width: 70,
    height: 40,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 4,
  },
});

export default OpeningHoursScreen;
