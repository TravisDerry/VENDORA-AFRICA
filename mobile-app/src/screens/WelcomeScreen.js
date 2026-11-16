import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, PanResponder, useWindowDimensions } from 'react-native';
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
    title: 'Every business.', highlight: 'Every corner of Africa.',
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
    title: 'Contact sellers and', highlight: 'pay with Mobile Money',
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
    title: 'List your business', highlight: 'free in minutes',
    body: 'Reach new customers online, manage your stock and track your sales.',
    points: ['Free to register', 'Sales insights'],
  },
];

const SLIDE_MS = 5000; // how long each slide stays before moving on by itself

const WelcomeScreen = ({ navigation }) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const indexRef = useRef(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [leaving, setLeaving] = useState(false);
  const zoom = useRef(new Animated.Value(0)).current; // slow zoom/drift on the photo
  const pulse = useRef(new Animated.Value(0)).current; // gentle pulse on "Start exploring"
  const outro = useRef(new Animated.Value(0)).current; // closing screen before the main page
  const progress = useRef(new Animated.Value(0)).current; // fills the current progress bar
  const ctaIn = useRef(new Animated.Value(0)).current; // "Start exploring" appears on the last slide
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

  // Last slide: cover the screen with the brand colour and logo, then fade into the app
  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    Animated.timing(outro, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setTimeout(() => enterApp(), 550);
    });
  };

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

  // Each photo slowly zooms in and drifts (restarts on every slide)
  useEffect(() => {
    zoom.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(zoom, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [index, zoom]);

  // Slides move on by themselves; the progress bar shows the time left on each one.
  // The last slide stays until the person taps "Start exploring".
  useEffect(() => {
    progress.setValue(0);
    if (isLast) {
      progress.setValue(1);
      Animated.timing(ctaIn, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return undefined;
    }
    ctaIn.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: SLIDE_MS, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => { if (finished) goTo(indexRef.current + 1); });
    return () => anim.stop();
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pulse the button on the last slide to invite people in
  useEffect(() => {
    if (!isLast) { pulse.setValue(0); return undefined; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(600),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLast, pulse]);

  const photoMotion = {
    opacity: fade,
    transform: [
      { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1.16] }) },
      { translateX: zoom.interpolate({ inputRange: [0, 1], outputRange: [index % 2 ? 10 : -10, index % 2 ? -10 : 10] }) },
    ],
  };
  // Text rises in after each slide change; the headline leads, the rest follows
  const rise = (distance) => ({
    opacity: fade,
    transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });
  const buttonPulse = { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] };

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
        <Animated.Image source={slide.image} resizeMode="cover" style={[photoStyle, photoMotion]} />
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
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: i < index ? '100%' : i > index ? '0%' : progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
            </View>
          ))}
        </View>

        <Animated.View style={[styles.caption, { opacity: fade }]}>
          <Ionicons name="location" size={12} color={colors.onPrimary} />
          <Text style={[type.caption, { color: colors.onPrimary }]} numberOfLines={1}>{slide.caption}</Text>
        </Animated.View>
      </View>

      {/* Sheet */}
      <View style={[styles.sheet, compact && styles.sheetCompact, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs }]}>
        <View>
          <Animated.View style={[styles.eyebrow, rise(6)]}>
            <Ionicons name={slide.icon} size={13} color={colors.primary} />
            <Text style={[type.overline, { color: colors.primary }]}>{slide.eyebrow}</Text>
          </Animated.View>
          <Animated.View style={rise(14)}>
            <Text style={[styles.title, compact && styles.titleCompact]}>{slide.title}</Text>
            <Text style={[styles.title, styles.highlight, compact && styles.titleCompact]}>{slide.highlight}</Text>
            <View style={styles.titleRule} />
          </Animated.View>
          <Animated.View style={rise(22)}>
          <Text style={[compact ? type.small : type.body, { color: colors.textSecondary, marginTop: spacing.md }]}>{slide.body}</Text>
          <View style={[styles.points, compact && { marginTop: spacing.md }]}>
            {slide.points.map((p) => (
              <View key={p} style={styles.point}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[type.smallStrong, { color: colors.text }]}>{p}</Text>
              </View>
            ))}
          </View>
          </Animated.View>
        </View>

        {/* Only on the last slide, so the first slides have no empty gap */}
        {isLast ? (
          <Animated.View
            style={[
              styles.actions,
              compact && { marginTop: spacing.lg },
              { opacity: ctaIn, transform: [{ translateY: ctaIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
            ]}
          >
            <Animated.View style={[{ flex: 1 }, buttonPulse]}>
              <Button title="Start exploring" icon="compass-outline" onPress={finish} />
            </Animated.View>
          </Animated.View>
        ) : null}
        <Touchable onPress={() => enterApp('Register')} accessibilityRole="button" style={[styles.secondary, !isLast && { marginTop: spacing.md }]}>
          <Text style={[type.smallStrong, { color: colors.primary }]}>Own a business? List it free</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Touchable>
      </View>

      {/* Closing screen shown on the way into the app */}
      {leaving ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outro, { opacity: outro }]}>
          <LinearGradient colors={[colors.primaryDeep, colors.primary]} style={StyleSheet.absoluteFill} />
          <Animated.View style={{ alignItems: 'center', transform: [{ scale: outro.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
            <View style={styles.outroRing}>
              <Image source={LOGO} style={styles.outroLogo} />
            </View>
          </Animated.View>
          <Animated.View style={{ alignItems: 'center', opacity: outro, transform: [{ translateY: outro.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
            <Text style={styles.outroTitle}>Akwaaba</Text>
            <Text style={styles.outroSub}>Welcome to Vendora Africa</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
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
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.gutter, marginTop: spacing.lg },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.onPrimary },
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
  titleCompact: { fontSize: 19, lineHeight: 25 },
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
  // Light, large headline; the second line is picked out in the brand blue
  title: { ...type.body, fontSize: 22, lineHeight: 29, fontWeight: '300', letterSpacing: -0.2, color: colors.text },
  highlight: { color: colors.primary, fontWeight: '400' },
  titleRule: { width: 36, height: 3, borderRadius: 2, backgroundColor: colors.accent, marginTop: spacing.md },
  outro: { alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  outroRing: {
    width: 112, height: 112, borderRadius: 56,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  outroLogo: { width: 80, height: 80, borderRadius: 22 },
  outroTitle: { ...type.body, fontSize: 34, lineHeight: 40, fontWeight: '300', letterSpacing: 0.5, color: colors.onPrimary },
  outroSub: { ...type.body, color: colors.onPrimaryMuted, marginTop: spacing.xs },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
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
