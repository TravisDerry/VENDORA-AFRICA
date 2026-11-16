import React, { useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type, shadow } from '../theme';
import { Card, Button, IconButton, IconTile, useStatusBar } from '../components/ui';
import { FEATURES } from '../data/features';

// One page per "Why Vendora Africa" benefit (Free to register, Mobile Money, Online & in-store, Sales insights).
const FeatureScreen = ({ route, navigation }) => {
  const feature = FEATURES[route.params?.id] || FEATURES.register;
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });
  useStatusBar('light');

  // Keep the photo's subject in view (plain "cover" always centres the image)
  const photoStyle = (() => {
    if (!box.w || !box.h) return StyleSheet.absoluteFill;
    const aspect = feature.aspect || 1.5;
    let w = box.w;
    let h = w / aspect;
    if (h < box.h) { h = box.h; w = h * aspect; }
    const clamp = (v, min) => Math.min(0, Math.max(min, v));
    return {
      position: 'absolute',
      width: w,
      height: h,
      left: clamp(box.w / 2 - feature.focus.x * w, box.w - w),
      top: clamp(box.h / 2 - feature.focus.y * h, box.h - h),
    };
  })();

  // Tabs (Register, Browse) live inside "Main"; stack screens (Pricing) are opened directly.
  const go = (screen) => {
    if (screen === 'Register' || screen === 'Browse' || screen === 'Home') navigation.navigate('Main', { screen });
    else navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}>
        {/* Photo header */}
        <View style={styles.hero} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Image source={feature.image} resizeMode="cover" style={photoStyle} accessibilityIgnoresInvertColors />
          <LinearGradient
            colors={['rgba(11,38,56,0.55)', 'rgba(11,38,56,0.35)', 'rgba(11,38,56,0.92)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroNav, { paddingTop: insets.top + spacing.sm }]}>
            <IconButton icon="chevron-back" color={colors.onPrimary} background="rgba(255,255,255,0.18)" accessibilityLabel="Go back" onPress={() => navigation.goBack()} />
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroIcon}>
              <Ionicons name={feature.icon} size={22} color={feature.accent} />
            </View>
            <Text style={[type.overline, { color: colors.primaryMuted, marginTop: spacing.md }]}>{feature.eyebrow}</Text>
            <Text style={[type.h1, { color: colors.onPrimary, marginTop: spacing.xs }]}>{feature.title}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[type.body, { color: colors.textSecondary }]}>{feature.intro}</Text>

          {feature.note ? (
            <View style={styles.note}>
              <Ionicons name="information-circle" size={18} color={colors.warning} />
              <Text style={[type.smallStrong, { color: colors.warning, flex: 1 }]}>{feature.note}</Text>
            </View>
          ) : null}

          <Card padded={false} style={{ marginTop: spacing.lg }}>
            {feature.points.map((p, i) => (
              <View key={p.title} style={[styles.point, i > 0 && styles.pointDivider]}>
                <IconTile icon={p.icon} size={40} iconSize={20} rounded={radius.md} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.title, { color: colors.text }]}>{p.title}</Text>
                  <Text style={[type.small, { color: colors.textMuted, marginTop: 2 }]}>{p.text}</Text>
                </View>
              </View>
            ))}
          </Card>

          <Button title={feature.cta.title} icon={feature.cta.icon} onPress={() => go(feature.cta.screen)} style={{ marginTop: spacing.xl }} />
          {feature.secondary ? (
            <Button title={feature.secondary.title} variant="outline" onPress={() => go(feature.secondary.screen)} style={{ marginTop: spacing.sm }} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    minHeight: 300,
    justifyContent: 'space-between',
    backgroundColor: colors.primaryDeep,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  heroNav: { paddingHorizontal: spacing.gutter, flexDirection: 'row' },
  heroBody: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl, paddingTop: spacing.xxxl },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    ...shadow.md,
  },
  body: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xl },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg },
  pointDivider: { borderTopWidth: 1, borderTopColor: colors.border },
});

export default FeatureScreen;
