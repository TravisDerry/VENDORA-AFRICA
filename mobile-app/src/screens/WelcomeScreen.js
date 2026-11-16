import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, PanResponder, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type, shadow } from '../theme';
import { Button, Touchable, useStatusBar } from '../components/ui';
import { AFRICA_IMAGES, LOGO } from '../data/images';

// First screen people see when they open the app.
// Slides are driven by state (not scroll events) so Next / Back / swipe all work on
// Android, iOS and web alike.
const SLIDES = [
  {
    key: 'discover',
    image: AFRICA_IMAGES.marketDar,
    aspect: 1080 / 721,
    focus: { x: 0.6, y: 0.55 },
    caption: 'Fruit market, Dar es Salaam, Tanzania',
    icon: 'business',
    eyebrow: 'Discover',
    title: 'Every business.\nEvery corner of Africa.',
    body: 'Find local sellers near you, from market stalls to retail stores.',
    points: ['Local sellers', 'Pay with MoMo'],
  },
  {
    key: 'pay',
    image: AFRICA_IMAGES.mobilePayment,
    aspect: 1080 / 608,
    focus: { x: 0.56, y: 0.4 },
    caption: 'Pay the way you already do',
    icon: 'wallet',
    eyebrow: 'Buy with confidence',
    title: 'Contact sellers and\npay with Mobile Money',
    body: 'Call, message or get directions in one tap. MTN MoMo, Telecel Cash and AirtelTigo.',
    points: ['Mobile Money', 'Direct contact'],
  },
  {
    key: 'grow',
    image: AFRICA_IMAGES.entrepreneur,
    aspect: 1080 / 721,
    focus: { x: 0.5, y: 0.4 },
    caption: 'Built for African entrepreneurs',
    icon: 'trending-up',
    eyebrow: 'Grow your business',
    title: 'List your business\nfree in minutes',
    body: 'Reach new customers online, manage your stock and track your sales.',
    points: ['Free to register', 'Sales insights'],
  },
];

const WelcomeScreen = ({ navigation }) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const indexRef = useRef(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useStatusBar('light');

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const goTo = (target) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, target));
    if (next === indexRef.current) return;
    indexRef.current = next;
    Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setIndex(next);
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  };

  const enterApp = (screen = 'Home') => navigation.replace('Main', { screen });
  const onNext = () => (indexRef.current >= SLIDES.length - 1 ? enterApp() : goTo(indexRef.current + 1));

  // Swipe left/right anywhere on the photo
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) goTo(indexRef.current + 1);
        else if (g.dx > 50) goTo(indexRef.current - 1);
      },
    })
  ).current;

  useEffect(() => () => fade.stopAnimation(), [fade]);

  // Short phones (iPhone SE / 8 / mini) get tighter spacing so nothing overlaps.
  const compact = height < 740;

  // Size the photo to cover the box while keeping the slide's focal point in view
  // (plain resizeMode="cover" always centres, which cut faces off on tall phones).
  const photoStyle = (() => {
    if (!box.w || !box.h) return StyleSheet.absoluteFill;
    let w = box.w;
    let h = w / slide.aspect;
    if (h < box.h) { h = box.h; w = h * slide.aspect; }
    const clamp = (v, min) => Math.min(0, Math.max(min, v));
    return {
      position: 'absolute',
      width: w,
      height: h,
      left: clamp(box.w / 2 - slide.focus.x * w, box.w - w),
      top: clamp(box.h / 2 - slide.focus.y * h, box.h - h),
    };
  })();

  return (
    <View style={styles.container}>
      {/* Photo */}
      <View style={styles.photoWrap} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
        <Animated.Image source={slide.image} resizeMode="cover" style={[photoStyle, { opacity: fade }]} />
        <LinearGradient
          colors={['rgba(11,38,56,0.70)', 'rgba(11,38,56,0.05)', 'rgba(11,38,56,0.0)', 'rgba(11,38,56,0.55)']}
          locations={[0, 0.3, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.brand}>
            <Image source={LOGO} style={styles.logo} accessibilityLabel="Vendora Africa logo" />
            <View>
              <Text style={[type.title, { color: colors.onPrimary }]}>Vendora Africa</Text>
              <Text style={[type.caption, { color: colors.onPrimaryMuted }]}>Africa's business marketplace</Text>
            </View>
          </View>
          {!isLast ? (
            <Touchable onPress={() => enterApp()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip introduction" style={styles.skip}>
              <Text style={[type.smallStrong, { color: colors.onPrimary }]}>Skip</Text>
            </Touchable>
          ) : null}
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.progressBar, i <= index && styles.progressBarActive]} />
          ))}
        </View>

        <Animated.View style={[styles.caption, { opacity: fade }]}>
          <Ionicons name="location" size={12} color={colors.onPrimary} />
          <Text style={[type.caption, { color: colors.onPrimary }]} numberOfLines={1}>{slide.caption}</Text>
        </Animated.View>
      </View>

      {/* Sheet */}
      <View style={[styles.sheet, compact && styles.sheetCompact, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs }]}>
        <Animated.View style={{ opacity: fade }}>
          <View style={styles.eyebrow}>
            <Ionicons name={slide.icon} size={13} color={colors.primary} />
            <Text style={[type.overline, { color: colors.primary }]}>{slide.eyebrow}</Text>
          </View>
          <Text style={[type.h1, styles.title, compact && styles.titleCompact]}>{slide.title}</Text>
          <Text style={[compact ? type.small : type.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>{slide.body}</Text>
          <View style={[styles.points, compact && { marginTop: spacing.md }]}>
            {slide.points.map((p) => (
              <View key={p} style={styles.point}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[type.smallStrong, { color: colors.text }]}>{p}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={[styles.actions, compact && { marginTop: spacing.lg }]}>
          {index > 0 ? (
            <Touchable
              onPress={() => goTo(index - 1)}
              accessibilityRole="button"
              accessibilityLabel="Previous"
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </Touchable>
          ) : null}
          <Button
            title={isLast ? 'Start exploring' : 'Next'}
            icon={isLast ? 'compass-outline' : undefined}
            iconRight={isLast ? undefined : 'arrow-forward'}
            onPress={onNext}
            style={{ flex: 1 }}
          />
        </View>
        <Touchable onPress={() => enterApp('Register')} accessibilityRole="button" style={styles.secondary}>
          <Text style={[type.smallStrong, { color: colors.primary }]}>Own a business? List it free</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Touchable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  // Photo fills whatever space the sheet leaves, so the sheet text can never be covered.
  photoWrap: { flex: 1, minHeight: 200, width: '100%', backgroundColor: colors.primaryDeep, overflow: 'hidden' },
  topBar: {
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' },
  skip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.gutter, marginTop: spacing.lg },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  progressBarActive: { backgroundColor: colors.onPrimary },
  caption: {
    position: 'absolute',
    left: spacing.gutter,
    bottom: spacing.xxxl + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '85%',
    backgroundColor: 'rgba(11,38,56,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  sheet: {
    marginTop: -spacing.xxl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xxl,
    ...shadow.lg,
  },
  sheetCompact: { paddingTop: spacing.xl },
  titleCompact: { fontSize: 22, lineHeight: 28 },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontWeight: '400', letterSpacing: 0 },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
});

export default WelcomeScreen;
