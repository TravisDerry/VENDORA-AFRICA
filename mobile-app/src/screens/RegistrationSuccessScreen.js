import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, spacing, radius, type, shadow } from '../theme';
import { Button, Card, IconTile, useStatusBar } from '../components/ui';
import { OwnerKeyCard } from '../components/OwnerKeyCard';

const APPROVAL_STEP = { icon: 'shield-checkmark-outline', title: 'We check your business', text: 'The Vendora team will call you to confirm your business is real. Customers can see it once it is approved.' };

const NEXT_STEPS = [
  { icon: 'images-outline', title: 'Add your products', text: 'Listings with photos get more customer enquiries.' },
  { icon: 'wallet-outline', title: 'Set up Mobile Money', text: 'Let customers pay you with MTN MoMo, Telecel Cash or AirtelTigo.' },
  { icon: 'gift-outline', title: 'Your first month is free', text: 'After 30 days, keep your listing with a small monthly MoMo payment.' },
];

const RegistrationSuccessScreen = ({ navigation, route }) => {
  useStatusBar('light');
  const insets = useSafeAreaInsets();
  const firstName = route?.params?.firstName || 'there';
  const businessName = route?.params?.businessName || 'Your business';
  const ownerKey = route?.params?.ownerKey;
  const approvalRequired = route?.params?.approvalRequired === true;
  const steps = approvalRequired
    ? [APPROVAL_STEP, ...NEXT_STEPS.map((s) => (s.icon === 'gift-outline' ? { ...s, text: 'It starts on the day your business is approved. After that, keep your listing with a small monthly MoMo payment.' } : s))]
    : NEXT_STEPS;

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'Home' } }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + spacing.xxxl }]}>
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <Ionicons name="checkmark" size={44} color={colors.primary} />
          </View>
        </View>
        <Text style={[type.h1, styles.center, { color: colors.onPrimary, marginTop: spacing.xl }]}>Welcome, {firstName}!</Text>
        <Text style={[type.body, styles.center, { color: colors.onPrimaryMuted, marginTop: spacing.xs }]}>
          {approvalRequired ? `${businessName} has been sent to Vendora Africa for approval.` : `${businessName} is now live on Vendora Africa.`}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <Card style={styles.stepsCard}>
          <Text style={[type.overline, { color: colors.textMuted, marginBottom: spacing.md }]}>Next steps</Text>
          {steps.map((s, i) => (
            <View key={s.title} style={[styles.step, i > 0 && { marginTop: spacing.lg }]}>
              <IconTile icon={s.icon} size={40} iconSize={20} rounded={radius.sm + 2} />
              <View style={{ flex: 1 }}>
                <Text style={[type.title, { color: colors.text }]}>{s.title}</Text>
                <Text style={[type.small, { color: colors.textMuted }]}>{s.text}</Text>
              </View>
            </View>
          ))}
        </Card>
        {ownerKey ? <OwnerKeyCard businessName={businessName} ownerKey={ownerKey} style={{ marginTop: spacing.lg }} /> : null}
      </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button title="See pricing" icon="pricetag-outline" onPress={() => navigation.navigate('Pricing')} />
        <Button title="Back to home" variant="outline" onPress={handleGoHome} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxxl + spacing.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  ringOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
  center: { textAlign: 'center' },
  body: { paddingHorizontal: spacing.gutter },
  stepsCard: { marginTop: -spacing.xxxl, ...shadow.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md, gap: spacing.md, backgroundColor: colors.background },
});

export default RegistrationSuccessScreen;
