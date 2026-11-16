// Pricing: first month free, then a monthly listing price set by business category.
// Prices come from the backend (backend/config/pricing.js) so they can change without an app update.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type, shadow } from '../theme';
import { Touchable, Card, Button, Badge, SectionHeader, useStatusBar } from '../components/ui';
import { usePaymentConfig } from '../components/MomoPayment';
import { getLiveOwnedBusinesses } from '../utils/ownerKeys';
import { API_BASE_URL } from '../config';
import { getCategory } from '../data/categories';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_ICONS = {
  food: 'restaurant-outline',
  cosmetics: 'color-palette-outline',
  fashion: 'shirt-outline',
  education: 'school-outline',
  other: 'business-outline',
  phones: 'phone-portrait-outline',
  hardware: 'construct-outline',
  aluminum: 'grid-outline',
};

const TIER_TONES = [
  { gradient: ['#2F6B12', '#4C9A2A'] }, // lowest: green
  { gradient: ['#1B4F72', '#2E86C1'] }, // brand blue
  { gradient: ['#0B2638', '#1B4F72'] }, // deep navy
];

const INCLUDED = [
  'Business page with photos, location and opening hours',
  'List your products with prices',
  'Customers pay you with MoMo (Buy and Pay buttons)',
  'Show up on Home, Explore and search',
  'Call, message and directions buttons',
  'See payments you receive in the app',
];

const PricingScreen = ({ navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const { config, error } = usePaymentConfig();
  const [openFaq, setOpenFaq] = useState(0);
  const [ownsBusiness, setOwnsBusiness] = useState(false);

  useFocusEffect(useCallback(() => { getLiveOwnedBusinesses(API_BASE_URL).then((l) => setOwnsBusiness(l.length > 0)); }, []));

  const p = config?.pricing;
  const freeDays = p?.freeDays || 30;
  const graceDays = p?.graceDays || 7;
  const categories = p?.categories || [];
  const lowest = categories.length ? Math.min(...categories.map((c) => c.price)) : null;
  // Group business types that share a price: one card per price, cheapest first
  const tiers = Object.values(categories.reduce((acc, c) => {
    (acc[c.price] = acc[c.price] || { price: c.price, cats: [] }).cats.push(c);
    return acc;
  }, {})).sort((a, b) => a.price - b.price);

  const steps = [
    { icon: 'gift-outline', title: 'Register free, we approve you', text: `The Vendora team checks your business is real, then your first ${freeDays} days are free with every feature.` },
    { icon: 'notifications-outline', title: 'We remind you', text: 'Your page and Account tab show how many free days are left.' },
    { icon: 'wallet-outline', title: 'Then pay monthly with MoMo', text: 'The price depends on your type of business (see below). Each payment adds 30 days.' },
    { icon: 'eye-off-outline', title: `Missed it? ${graceDays} days' grace`, text: `After that your business is hidden until you pay. Your products are kept, and paying brings you straight back.` },
  ];

  const faqs = [
    { q: 'Do I need to pay to register?', a: `No. Registration is free. After the Vendora team approves your business, your first ${freeDays} days cost nothing.` },
    { q: 'How do I pay?', a: 'With Mobile Money: MTN MoMo, Telecel Cash or AirtelTigo Money. Open Account > Manage my business, or tap the payment card on your business page, and approve with your own PIN.' },
    { q: 'Will money be taken automatically?', a: 'No. Nothing is charged automatically. You choose when to pay each month, and we remind you before your time runs out.' },
    { q: 'What if I pay early?', a: 'Nothing is lost. Paying early adds 30 days to the end of your current free or paid month.' },
    { q: 'Why does the price depend on my business type?', a: 'Different kinds of businesses get different value from being listed. Food sellers pay the least so small traders can join easily.' },
  ];

  const toggleFaq = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq(openFaq === i ? -1 : i);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={styles.intro}>
          <Badge label={`First ${freeDays} days free`} tone="success" icon="gift-outline" />
          <Text style={[type.h1, { color: colors.text, marginTop: spacing.md }]}>Simple pricing for every business</Text>
          <Text style={[type.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Start free for a month. After that, pay a small monthly amount based on your type of business{lowest ? `, from GHS ${lowest}` : ''}.
          </Text>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <SectionHeader title="How it works" />
          <Card padded={false}>
            {steps.map((s, i) => (
              <View key={s.title} style={[styles.step, i > 0 && styles.divider]}>
                <View style={styles.stepNum}>
                  <Text style={[type.smallStrong, { color: colors.onPrimary }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.title, { color: colors.text }]}>{s.title}</Text>
                  <Text style={[type.small, { color: colors.textMuted, marginTop: 2 }]}>{s.text}</Text>
                </View>
                <Ionicons name={s.icon} size={20} color={colors.primary} />
              </View>
            ))}
          </Card>
        </View>

        {/* Prices */}
        <View style={styles.section}>
          <SectionHeader title="Monthly price after the free month" />
          <Text style={[type.small, { color: colors.textMuted, marginTop: -spacing.xs, marginBottom: spacing.md }]}>
            Your price depends on your type of business. Pay with MoMo, one month at a time.
          </Text>
          {!config && !error ? (
            <Card><ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} /></Card>
          ) : tiers.length === 0 ? (
            <Card>
              <Text style={[type.small, { color: colors.textMuted }]}>Prices could not be loaded. Check your connection and try again.</Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {tiers.map((tier, i) => {
                const tone = TIER_TONES[Math.min(i, TIER_TONES.length - 1)];
                return (
                  <View key={tier.price} style={styles.tierShadow}>
                    <View style={styles.tier}>
                      <LinearGradient colors={tone.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tierHead}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[type.overline, { color: 'rgba(255,255,255,0.8)' }]}>
                            {tier.cats.length} business {tier.cats.length === 1 ? 'type' : 'types'}
                          </Text>
                          <View style={styles.tierPriceRow}>
                            <Text style={styles.tierCurrency}>GHS</Text>
                            <Text style={styles.tierPrice}>{tier.price}</Text>
                            <Text style={styles.tierPer}>/ month</Text>
                          </View>
                        </View>
                        {i === 0 ? (
                          <View style={styles.lowest}>
                            <Ionicons name="leaf" size={12} color={colors.success} />
                            <Text style={[type.caption, { color: colors.success, fontWeight: '800' }]}>Lowest</Text>
                          </View>
                        ) : null}
                      </LinearGradient>
                      <View style={styles.tierBody}>
                        {tier.cats.map((c) => {
                          const cat = getCategory(c.id);
                          return (
                            <View key={c.id} style={[styles.catTag, { backgroundColor: cat.tint || colors.primarySoft }]}>
                              <Ionicons name={CATEGORY_ICONS[c.id] || 'business-outline'} size={15} color={cat.color || colors.primary} />
                              <Text style={[type.smallStrong, { color: cat.color || colors.primary }]}>{c.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })}
              <View style={styles.tierNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={[type.caption, { color: colors.textMuted, flex: 1 }]}>
                  Your business type is the category you chose when you registered. First {freeDays} days are free for everyone.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Included */}
        <View style={styles.section}>
          <SectionHeader title="Everything included" />
          <Card>
            {INCLUDED.map((t) => (
              <View key={t} style={styles.included}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[type.small, { color: colors.text, flex: 1 }]}>{t}</Text>
              </View>
            ))}
          </Card>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <SectionHeader title="Frequently asked questions" />
          <Card padded={false}>
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <Touchable
                  key={f.q}
                  onPress={() => toggleFaq(i)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={[styles.faq, i < faqs.length - 1 && styles.faqBorder]}
                >
                  <View style={styles.faqHead}>
                    <Text style={[type.title, { color: colors.text, flex: 1 }]}>{f.q}</Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                  </View>
                  {open ? <Text style={[type.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>{f.a}</Text> : null}
                </Touchable>
              );
            })}
          </Card>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {ownsBusiness ? (
          <>
            <View style={{ flexShrink: 1 }}>
              <Text style={[type.caption, { color: colors.textMuted }]}>Your business</Text>
              <Text style={[type.title, { color: colors.text }]}>Pay monthly</Text>
            </View>
            <Button title="Pay with MoMo" icon="wallet-outline" onPress={() => navigation.navigate('Payment')} fullWidth={false} style={{ flex: 1 }} />
          </>
        ) : (
          <>
            <View style={{ flexShrink: 1 }}>
              <Text style={[type.caption, { color: colors.textMuted }]}>Start today</Text>
              <Text style={[type.title, { color: colors.success }]}>{freeDays} days free</Text>
            </View>
            <Button title="Register free" icon="add-circle-outline" onPress={() => navigation.navigate('Main', { screen: 'Register' })} fullWidth={false} style={{ flex: 1 }} />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xl },
  section: { paddingHorizontal: spacing.gutter, marginTop: spacing.xxl },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  // Price tier cards: outer layer keeps the shadow, inner layer clips the gradient (iOS)
  tierShadow: { borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.md },
  tier: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface },
  tierHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tierPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  tierCurrency: { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  tierPrice: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  tierPer: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  lowest: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  tierBody: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, maxWidth: '100%' },
  tierNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, paddingHorizontal: spacing.xs },
  included: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  faq: { padding: spacing.lg },
  faqBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.lg,
  },
});

export default PricingScreen;
