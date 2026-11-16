import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type, shadow } from '../theme';
import { Touchable, SearchBar, SectionHeader, EmptyState, useStatusBar } from '../components/ui';
import { BusinessCard } from '../components/BusinessCard';
import { AFRICA_IMAGES, CATEGORY_IMAGES, TILE_IMAGES, LOGO } from '../data/images';

// ---------- Content ----------

// Auto-sliding banner cards at the top of Home: text on the left (on the card's own colour),
// photo on the right. Colours are deep tones so white text stays readable (WCAG AA).
const SLIDES = [
  {
    key: 'discover',
    image: AFRICA_IMAGES.marketDar,
    bg: '#1B4F72',
    eyebrow: 'Discover',
    title: 'Every business, every corner of Africa',
    cta: 'Explore',
    action: { screen: 'Browse', params: { category: 'all' } },
  },
  {
    key: 'sell',
    image: AFRICA_IMAGES.entrepreneur,
    bg: '#0B2638',
    eyebrow: 'For owners',
    title: 'List your business free in minutes',
    cta: 'Get started',
    action: { screen: 'Register' },
  },
  {
    key: 'phones',
    image: CATEGORY_IMAGES.phones,
    bg: '#1F6FA3',
    eyebrow: 'Phones',
    title: 'Gadgets from trusted local sellers',
    cta: 'Shop now',
    action: { screen: 'Browse', params: { category: 'phones' } },
  },
  {
    key: 'food',
    image: AFRICA_IMAGES.marketSenegal,
    bg: '#123A55',
    eyebrow: 'Food & grocery',
    title: 'Fresh from your local market',
    cta: 'Find food',
    action: { screen: 'Browse', params: { category: 'food' } },
  },
];

// Photo tiles: 4 on the first row, 3 centred on the second
const QUICK_ACTIONS = [
  { key: 'phones', label: 'Phones', image: TILE_IMAGES.phones, action: { screen: 'Browse', params: { category: 'phones' } } },
  { key: 'beauty', label: 'Beauty', image: TILE_IMAGES.beauty, action: { screen: 'Browse', params: { category: 'cosmetics' } } },
  { key: 'fashion', label: 'Fashion', image: AFRICA_IMAGES.fashion, action: { screen: 'Browse', params: { category: 'fashion' } } },
  { key: 'food', label: 'Food', image: TILE_IMAGES.food, action: { screen: 'Browse', params: { category: 'food' } } },
  { key: 'hardware', label: 'Hardware', image: TILE_IMAGES.hardware, action: { screen: 'Browse', params: { category: 'hardware' } } },
  { key: 'sell', label: 'Sell', image: AFRICA_IMAGES.entrepreneur, overlayIcon: 'add', action: { screen: 'Register' }, highlight: true },
  { key: 'plans', label: 'Pricing', image: AFRICA_IMAGES.mobilePayment, action: { screen: 'Pricing' } },
];

// Small "Why Vendora Africa" cards; each opens its own page (FeatureScreen)
const WHY = [
  { id: 'register', icon: 'gift', title: 'Free to register', text: 'No fees to get listed', image: AFRICA_IMAGES.entrepreneur },
  { id: 'momo', icon: 'wallet', title: 'Mobile Money', text: 'Built for MoMo', image: AFRICA_IMAGES.mobileMoney },
  { id: 'instore', icon: 'storefront', title: 'Online & in-store', text: 'Reach more buyers', image: AFRICA_IMAGES.marketSenegal },
  { id: 'insights', icon: 'trending-up', title: 'Sales insights', text: 'Know what sells', image: AFRICA_IMAGES.vendor },
];

const SLIDE_MS = 4500;

// Frame layout (like SSNIT): brand navy at the top and down both screen edges,
// with the white content panel sitting inside it.
const EDGE = 6; // navy visible on each side
const INNER = 16; // padding inside the white panel
const QUICK_PAD = 8; // side padding of the photo-tile grid
const BOX_PAD = 14; // padding inside each section box
const OVERLAP = 100; // how far the banner cards reach up into the navy header (about half a card)

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ---------- Animation helpers ----------

// Fades + slides a section up when Home opens, one section after the other.
const Reveal = ({ index, children, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 480,
      delay: 120 + index * 110,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Auto-sliding banner cards: each slide is its own photo card. Every few seconds the cards
// slide left so the next card moves in (the edge of the next card peeks in on the right).
// Swipe to drag between cards; tap a dot to jump. Loops seamlessly via a copy of the first card.
const PEEK = 28; // how much of the next card shows
const GAP = 12;
const SHADOW_PAD = 6; // room around the cards so their shadow is not cut off

const BannerCarousel = ({ onAction, active }) => {
  const [boxWidth, setBoxWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const animating = useRef(false);

  const cardWidth = Math.max(0, boxWidth - SHADOW_PAD * 2 - PEEK);
  const step = cardWidth + GAP;
  const loop = [...SLIDES, SLIDES[0]]; // last item is a copy of the first, for a seamless loop

  const slideTo = useCallback(
    (target) => {
      if (!step || animating.current) return;
      animating.current = true;
      Animated.timing(x, {
        toValue: -target * step,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        animating.current = false;
        // Arrived on the copy of the first card: jump back to the real first card invisibly
        const real = target >= SLIDES.length ? 0 : target < 0 ? SLIDES.length - 1 : target;
        if (real !== target) x.setValue(-real * step);
        indexRef.current = real;
        setIndex(real);
      });
    },
    [step, x]
  );

  const restartTimer = useCallback(() => {
    clearInterval(timer.current);
    if (active && step) timer.current = setInterval(() => slideTo(indexRef.current + 1), SLIDE_MS);
  }, [active, step, slideTo]);

  useEffect(() => {
    restartTimer();
    return () => clearInterval(timer.current);
  }, [restartTimer]);

  // Keep position correct if the width changes (rotation, first layout)
  useEffect(() => {
    if (step) x.setValue(-indexRef.current * step);
  }, [step, x]);

  // The swipe handler is created once, so it reads the latest values through a ref
  const latest = useRef({});
  latest.current = { slideTo, restartTimer, step };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => clearInterval(timer.current),
      onPanResponderMove: (_, g) => {
        if (animating.current) return;
        x.setValue(-indexRef.current * latest.current.step + g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const { slideTo: go, restartTimer: restart } = latest.current;
        if (g.dx < -50 || g.vx < -0.4) go(indexRef.current + 1);
        else if ((g.dx > 50 || g.vx > 0.4) && indexRef.current > 0) go(indexRef.current - 1);
        else go(indexRef.current);
        restart();
      },
      onPanResponderTerminate: () => {
        latest.current.slideTo(indexRef.current);
        latest.current.restartTimer();
      },
    })
  ).current;

  return (
    <View>
      <View style={styles.carousel} onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
        {cardWidth > 0 ? (
          <Animated.View style={[styles.track, { transform: [{ translateX: x }] }]}>
            {loop.map((slide, i) => (
              <View key={`${slide.key}-${i}`} style={[styles.slideShadow, { width: cardWidth, marginRight: GAP }]}>
              <View style={[styles.slideCard, { backgroundColor: slide.bg }]}>
                {/* Left: writing on the card's colour */}
                <View style={styles.slideText}>
                  <Text style={[type.overline, styles.slideEyebrow]} numberOfLines={1}>{slide.eyebrow}</Text>
                  <Text style={[type.h3, styles.slideTitle]} numberOfLines={3}>{slide.title}</Text>
                  <Touchable onPress={() => onAction(slide.action)} accessibilityRole="button" style={styles.slideCta}>
                    <Text style={[type.smallStrong, { color: slide.bg }]} numberOfLines={1}>{slide.cta}</Text>
                    <Ionicons name="arrow-forward" size={14} color={slide.bg} />
                  </Touchable>
                </View>
                {/* Right: photo, softly blended into the card colour */}
                <View style={styles.slidePhoto}>
                  <Image source={slide.image} resizeMode="cover" style={styles.slideImage} accessibilityIgnoresInvertColors />
                  <LinearGradient
                    colors={[slide.bg, `${slide.bg}00`]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 0.45, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </View>
              </View>
            ))}
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <Touchable
            key={s.key}
            onPress={() => { slideTo(i); restartTimer(); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Show banner ${i + 1}`}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
};

// ---------- Screen ----------

const HomeScreen = ({ route, businesses: propBusinesses, loadState = 'ok', refreshBusinesses }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  useStatusBar('light');
  const businesses = propBusinesses ?? route?.params?.businesses ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const featured = useMemo(
    // Verified businesses first, then newest (the server already sends newest first)
    () => [...businesses].sort((a, b) => (b.verified === true) - (a.verified === true)).slice(0, 8),
    [businesses]
  );

  const onRefresh = useCallback(async () => {
    if (!refreshBusinesses) return;
    setRefreshing(true);
    try {
      await refreshBusinesses();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBusinesses]);

  const go = ({ screen, params }) => navigation.navigate(screen, params);
  const openBusiness = (business) => navigation.navigate('BusinessDetail', { business });

  // 4 columns that always fit the screen
  const tileWidth = Math.floor((width - EDGE * 2 - INNER * 2 - QUICK_PAD * 2 - 2) / 4); // -2 for the panel border
  const featuredWidth = Math.min(200, Math.round(width * 0.52));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.onPrimary} colors={[colors.primary]} />}
    >
      {/* Header: greeting + search */}
      <LinearGradient
        colors={['#0B2638', '#123A55', colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Image source={LOGO} style={styles.logo} accessibilityLabel="Vendora Africa logo" />
            <View style={{ flexShrink: 1 }}>
              <Text style={[type.caption, { color: colors.onPrimaryMuted }]} numberOfLines={1}>{greeting()} 👋</Text>
              <Text style={[type.h3, { color: colors.onPrimary }]} numberOfLines={1}>Welcome to Vendora</Text>
            </View>
          </View>
        </View>
        <SearchBar onPress={() => go({ screen: 'Browse', params: { category: 'all' } })} style={styles.search} />
      </LinearGradient>

      {/* White content panel inside the navy frame */}
      <View style={styles.panel}>

      {/* Auto-sliding banners: the cards straddle the navy header and the white panel */}
      <Reveal index={0} style={[styles.section, { marginTop: -OVERLAP }]}>
        <BannerCarousel onAction={go} active={isFocused} />
      </Reveal>

      {/* Rest of the panel; clips side-scrolling rows at the panel edges */}
      <View style={styles.panelBody}>

      {/* Quick actions: photo tiles inside their own light-blue box */}
      <Reveal index={1} style={styles.section}>
        <View style={styles.sectionBox}>
          <SectionHeader
            title="What are you looking for?"
            actionLabel="See all"
            onAction={() => go({ screen: 'Browse', params: { category: 'all' } })}
            style={styles.boxHeader}
          />
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((q) => (
              <Touchable
                key={q.key}
                onPress={() => go(q.action)}
                accessibilityRole="button"
                accessibilityLabel={q.highlight ? 'Sell: list your business' : q.label}
                style={[styles.quickItem, { width: tileWidth }]}
                pressedStyle={styles.quickPressed}
              >
                <View style={styles.quickTileShadow}>
                  <View style={[styles.quickTile, q.highlight && styles.quickTileHighlight]}>
                    <Image source={q.image} resizeMode="cover" style={styles.quickImage} accessibilityIgnoresInvertColors />
                    {q.overlayIcon ? (
                      <View style={styles.quickOverlay}>
                        <Ionicons name={q.overlayIcon} size={30} color={colors.onPrimary} />
                      </View>
                    ) : null}
                  </View>
                </View>
                <Text style={[type.caption, styles.quickLabel, q.highlight && { color: colors.primary }]} numberOfLines={1}>{q.label}</Text>
              </Touchable>
            ))}
          </View>
        </View>
      </Reveal>

      {/* Featured businesses: on the white page; the business cards themselves stand out */}
      {featured.length > 0 ? (
        <Reveal index={2} style={[styles.section, { paddingHorizontal: 0 }]}>
          <SectionHeader
            title="Featured businesses"
            subtitle="Businesses on Vendora"
            actionLabel="See all"
            onAction={() => go({ screen: 'Browse', params: { category: 'all' } })}
            style={{ paddingHorizontal: INNER }}
          />
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <BusinessCard business={item} width={featuredWidth} onPress={() => openBusiness(item)} />}
            contentContainerStyle={styles.featuredRow}
            showsHorizontalScrollIndicator={false}
            snapToInterval={featuredWidth + spacing.lg}
            decelerationRate="fast"
          />
        </Reveal>
      ) : (
        <Reveal index={2} style={styles.section}>
          <SectionHeader title="Businesses" style={{ paddingHorizontal: INNER }} />
          <View style={styles.emptyBox}>
            {loadState === 'loading' ? (
              <ActivityIndicator color={colors.primary} />
            ) : loadState === 'error' ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Can't reach Vendora"
                message="Check your internet connection, then pull down to refresh."
                actionLabel="Try again"
                onAction={onRefresh}
              />
            ) : (
              <EmptyState
                icon="storefront-outline"
                title="Be the first business here"
                message="Vendora Africa is just getting started. List your business free for your first month."
                actionLabel="List your business"
                onAction={() => go({ screen: 'Register' })}
              />
            )}
          </View>
        </Reveal>
      )}

      {/* Why Vendora Africa: raised photo cards on the white page (same style as Featured) */}
      <Reveal index={3} style={[styles.section, { paddingHorizontal: 0 }]}>
        <SectionHeader title="Why Vendora Africa" subtitle="Tap a card to learn more" style={{ paddingHorizontal: INNER }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
          {WHY.map((w) => (
            <Touchable
              key={w.id}
              onPress={() => navigation.navigate('Feature', { id: w.id })}
              accessibilityRole="button"
              accessibilityLabel={`${w.title}. ${w.text}`}
              style={styles.whyCard}
            >
              {/* inner layer clips the photo; outer layer keeps the shadow (iOS) */}
              <View style={styles.whyInner}>
                <View style={styles.whyPhoto}>
                  <Image source={w.image} resizeMode="cover" style={styles.quickImage} accessibilityIgnoresInvertColors />
                  <LinearGradient colors={['rgba(11,38,56,0)', 'rgba(11,38,56,0.45)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.whyIcon}>
                    <Ionicons name={w.icon} size={18} color={colors.primary} />
                  </View>
                </View>
                <View style={styles.whyBody}>
                  <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>{w.title}</Text>
                  <Text style={[type.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>{w.text}</Text>
                  <View style={styles.whyMore}>
                    <Text style={[type.caption, { color: colors.primary, fontWeight: '700' }]}>Learn more</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                  </View>
                </View>
              </View>
            </Touchable>
          ))}
        </ScrollView>
      </Reveal>
      </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary }, // navy frame shows at the top and both edges

  header: {
    paddingHorizontal: EDGE + INNER, // lines up with the content inside the white panel
    paddingBottom: spacing.xl + OVERLAP, // navy space the banner cards overlap into
  },
  panel: {
    flex: 1,
    marginHorizontal: EDGE,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingBottom: spacing.xxxl,
  },
  panelBody: { overflow: 'hidden' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  logo: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' },
  search: { marginTop: spacing.lg },

  section: { paddingHorizontal: INNER, marginTop: spacing.xl },

  carousel: {
    height: 186 + SHADOW_PAD * 2,
    padding: SHADOW_PAD,
    marginHorizontal: -SHADOW_PAD,
    overflow: 'hidden',
  },
  track: { flexDirection: 'row', height: '100%' },
  // Coloured promo card: writing on the left, photo blended in on the right
  slideShadow: { height: '100%', borderRadius: radius.xl, ...shadow.raised },
  slideCard: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)', // separates the card from the navy header behind it
  },
  slideText: { flex: 1.15, minWidth: 0, justifyContent: 'center', paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.lg },
  slideEyebrow: { color: 'rgba(255,255,255,0.75)' },
  slideTitle: { color: colors.onPrimary, marginTop: spacing.xs },
  slideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  slidePhoto: { flex: 1, overflow: 'hidden' },
  slideImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 22, backgroundColor: colors.primary },

  // Each Home section sits in its own light-blue box so the white cards inside stand out
  sectionBox: {
    backgroundColor: '#EAF1F9',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingTop: BOX_PAD,
    overflow: 'hidden',
  },
  boxHeader: { paddingHorizontal: BOX_PAD },
  // room above/below so the business cards' border and shadow are fully visible
  emptyBox: { marginHorizontal: INNER, marginBottom: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
  featuredRow: { paddingHorizontal: INNER, gap: spacing.lg, paddingTop: 6, paddingBottom: spacing.xxl },
  boxRow: { paddingHorizontal: BOX_PAD, gap: spacing.md, paddingTop: 2, paddingBottom: BOX_PAD + 4 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: spacing.lg,
    paddingHorizontal: QUICK_PAD,
    paddingBottom: BOX_PAD + 4,
  },
  quickItem: { alignItems: 'center' },
  quickPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  quickTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  quickTileShadow: { borderRadius: 20, backgroundColor: colors.surface, ...shadow.card },
  quickTileHighlight: { borderColor: colors.primary },
  quickImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  quickOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27,79,114,0.72)',
  },
  quickLabel: { color: colors.text, fontWeight: '600', marginTop: spacing.sm, textAlign: 'center' },

  whyCard: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    ...shadow.raised,
  },
  whyInner: { borderRadius: radius.lg - 1.5, overflow: 'hidden' },
  whyPhoto: { height: 96, backgroundColor: colors.primarySoft },
  whyIcon: {
    position: 'absolute',
    left: spacing.md,
    bottom: -18,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primarySoft,
  },
  whyBody: { padding: spacing.md, paddingTop: spacing.xl },
  whyMore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
});

export default HomeScreen;
