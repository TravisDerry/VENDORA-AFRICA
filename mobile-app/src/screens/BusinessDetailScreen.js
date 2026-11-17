import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Alert, Share, Platform, ImageBackground, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, spacing, radius, type, shadow } from '../theme';
import { Touchable, IconButton, Badge, Rating, Card, Button, Divider, IconTile, Avatar, EmptyState, useStatusBar } from '../components/ui';

import { BusinessCover, ProductPhoto } from '../components/BusinessCover';
import { businessPhoto, pickPhoto, uploadPhoto } from '../utils/photos';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { getOwnerKey, saveOwnerKey } from '../utils/ownerKeys';
import { normalizeProducts } from '../utils/products';
import { ListingStatusCard, PendingApprovalCard } from '../components/ListingStatus';
import { normalizeHours } from '../utils/hours';

const TABS = [
  { id: 'about', name: 'About' },
  { id: 'products', name: 'Products' },
  { id: 'reviews', name: 'Reviews' },
];



const BusinessDetailScreen = ({ route, navigation }) => {
  const { business } = route.params;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(route.params.tab || 'about');
  const [isOwner, setIsOwner] = useState(false);
  const [customerView, setCustomerView] = useState(false); // owner previewing what buyers see
  useStatusBar('light');

  // Real (database) businesses have string ids; the offline samples use numbers.
  const isLiveBusiness = typeof business.id === 'string';

  // Coming back from "Add product" switches to the Products tab
  useEffect(() => {
    if (route.params.tab) setActiveTab(route.params.tab);
  }, [route.params.tab, route.params.business]);

  const [payoutsOn, setPayoutsOn] = useState(business.acceptsPayments === true); // owner has set up MoMo payouts
  const [listing, setListing] = useState(business.listing || null); // free month / paid / grace / expired
  const [approved, setApproved] = useState(business.verified === true); // approved by the Vendora team
  const hidden = listing?.visible === false; // unpaid past the grace period
  const acceptsPayments = payoutsOn && !hidden; // customers can pay right now

  // Does this phone hold the owner key for this business? And can customers pay it right now?
  // (Checked each time the page opens, so turning payments on shows up straight away.)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (isLiveBusiness) {
        getOwnerKey(business.id).then((k) => {
          if (!active) return;
          setIsOwner(!!k);
          if (k) saveOwnerKey(business.id, k, business.name); // remember it for Plans & pricing
        });
        fetch(`${API_BASE_URL}/api/payments/business/${business.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => { if (active && j) { setPayoutsOn(j.acceptsPayments === true); setListing(j.listing || null); if (typeof j.approved === 'boolean') setApproved(j.approved); } })
          .catch(() => {});
      }
      return () => { active = false; };
    }, [business.id, isLiveBusiness])
  );

  const openAddProduct = () => navigation.navigate('AddProduct', { business });

  // Cover photo: the business's own photo, or a plain navy header (never another seller's picture)
  const photo = businessPhoto(business);
  const HeroBackground = ({ children }) => (photo ? (
    <ImageBackground source={photo} resizeMode="cover" style={styles.heroWrap} imageStyle={[styles.heroImage, { width: '100%', height: '100%' }]}>{children}</ImageBackground>
  ) : (
    <View style={[styles.heroWrap, { backgroundColor: colors.primaryDeep }]}>{children}</View>
  ));

  const [coverBusy, setCoverBusy] = useState(false);
  const notify = (title, msg) => (Platform.OS === 'web' ? window.alert(`${title}

${msg}`) : Alert.alert(title, msg));
  const uploadCover = async (source) => {
    try {
      const asset = await pickPhoto(source, [16, 10]);
      if (!asset) return;
      setCoverBusy(true);
      const key = await getOwnerKey(business.id);
      const result = await uploadPhoto(business.id, 'photo', asset, key);
      navigation.setParams({ business: { ...business, image: result.cover } });
    } catch (e) {
      notify('Photo not saved', /Failed to fetch|Network request failed/i.test(e.message) ? 'Cannot reach the Vendora server.' : e.message);
    } finally {
      setCoverBusy(false);
    }
  };
  const removeCover = async () => {
    try {
      setCoverBusy(true);
      const key = await getOwnerKey(business.id);
      const res = await fetch(`${API_BASE_URL}/api/businesses/${business.id}/photo`, { method: 'DELETE', headers: { 'X-Manage-Key': key || '' } });
      if (!res.ok) throw new Error('Could not remove the photo');
      navigation.setParams({ business: { ...business, image: undefined } });
    } catch (e) {
      notify('Photo not removed', e.message);
    } finally {
      setCoverBusy(false);
    }
  };
  const changeCover = () => {
    if (Platform.OS === 'web') return uploadCover('library');
    Alert.alert('Cover photo', 'Show customers your shop, your food or your products.', [
      { text: 'Choose from gallery', onPress: () => uploadCover('library') },
      { text: 'Take a photo', onPress: () => uploadCover('camera') },
      ...(photo ? [{ text: 'Remove photo', style: 'destructive', onPress: removeCover }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const hours = business.hours || normalizeHours(business.businessHours);
  const editHours = () => navigation.navigate('OpeningHours', { business: { ...business, hours } });
  const openPay = (product) => navigation.navigate('PayBusiness', { business: { id: business.id, name: business.name, phone: business.phone, image: business.image, category: business.category }, product });

  const confirm = (title, message, onYes) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) onYes();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onYes },
    ]);
  };

  const removeProduct = (product) =>
    confirm('Remove product?', `${product.name} will no longer be shown to customers.`, async () => {
      try {
        const key = await getOwnerKey(business.id);
        const response = await fetch(`${API_BASE_URL}/api/businesses/${business.id}/products/${product.id}`, {
          method: 'DELETE',
          headers: { 'X-Manage-Key': key || '' },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not remove the product.');
        navigation.setParams({ business: { ...business, products: normalizeProducts(result.products) } });
      } catch (error) {
        const msg = /Failed to fetch|Network request failed/i.test(error.message) ? 'Cannot reach the Vendora server.' : error.message;
        if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Not removed', msg);
      }
    });

  const phoneDigits = String(business.phone || '').replace(/[^\d+]/g, '');

  const openUrl = async (url, fallbackMessage) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Unavailable', fallbackMessage);
    }
  };

  const callNow = () => openUrl(`tel:${phoneDigits}`, 'Calling is not supported on this device.');
  const handleCall = () => {
    // Alert buttons do nothing in the web preview, so use the browser's confirm there
    if (Platform.OS === 'web') {
      if (window.confirm(`Call ${business.name}?\n${business.phone}`)) callNow();
      return;
    }
    Alert.alert(`Call ${business.name}?`, business.phone, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: callNow },
    ]);
  };

  const handleMessage = (text) =>
    openUrl(`sms:${phoneDigits}${typeof text === 'string' && text ? `${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}` : ''}`, 'Messaging is not supported on this device.');

  // Order a product: pay in the app if the business accepts MoMo, otherwise call or message to order
  const handleOrder = (p) => {
    if (acceptsPayments && p.priceValue) return openPay(p);
    const text = `Hello ${business.name}, I saw "${p.name}"${p.price ? ` (${p.price})` : ''} on Vendora Africa and would like to order.`;
    const title = `Order ${p.name}`;
    const msg = `${business.name} doesn't take in-app payments yet. Message or call them to order and agree how to pay.`;
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${msg}\n\nOK = send a message`)) handleMessage(text);
      return;
    }
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: callNow },
      { text: 'Message', onPress: () => handleMessage(text) },
    ]);
  };

  const handleDirections = () => {
    const query = encodeURIComponent(`${business.name}, ${business.location}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    openUrl(url, 'Maps is not available on this device.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${business.name} (${business.type}) on Vendora Africa. Located in ${business.location}. Contact: ${business.phone}`,
      });
    } catch (error) {
      // user dismissed the share sheet
    }
  };

  const actions = [
    { icon: 'call', label: 'Call', onPress: handleCall },
    { icon: 'chatbubble-ellipses', label: 'Message', onPress: handleMessage },
    { icon: 'navigate', label: 'Directions', onPress: handleDirections },
    { icon: 'share-social', label: 'Share', onPress: handleShare },
  ];

  const renderAbout = () => (
    <View style={styles.tabBody}>
      <Card>
        <Text style={[type.h3, styles.cardTitle]}>About</Text>
        <Text style={[type.body, { color: business.description ? colors.textSecondary : colors.textMuted }]}>{business.description || `${business.name} hasn't added a description yet.`}</Text>
      </Card>

      <Card padded={false}>
        {[
          { icon: 'location-outline', label: 'Location', value: business.location },
          { icon: 'call-outline', label: 'Phone', value: business.phone || 'Not provided' },
          { icon: 'pricetag-outline', label: 'Category', value: business.type },
          { icon: 'shield-checkmark-outline', label: 'Status', value: business.verified === true ? 'Verified business' : 'Pending verification' },
        ].map((row, i, arr) => (
          <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
            <IconTile icon={row.icon} size={36} iconSize={18} rounded={radius.sm} />
            <View style={{ flex: 1 }}>
              <Text style={[type.caption, { color: colors.textMuted }]}>{row.label}</Text>
              <Text style={[type.bodyStrong, { color: colors.text }]}>{row.value}</Text>
            </View>
          </View>
        ))}
      </Card>

      {hours ? (
        <Card>
          <View style={styles.hoursHeader}>
            <Text style={[type.h3, { color: colors.text }]}>Opening hours</Text>
            {ownerTools ? (
              <Touchable onPress={editHours} accessibilityRole="button" style={{ padding: 4 }}>
                <Text style={[type.smallStrong, { color: colors.primary }]}>Edit</Text>
              </Touchable>
            ) : (
              <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            )}
          </View>
          {hours.map((h, i) => (
            <View key={h.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.hoursRow}>
                <Text style={[type.small, styles.hoursDay]}>{h.day}</Text>
                <Text style={[type.smallStrong, styles.hoursTime, h.closed && { color: colors.danger }]}>{h.time}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : ownerTools ? (
        <Card>
          <View style={styles.hoursHeader}>
            <Text style={[type.h3, { color: colors.text }]}>Opening hours</Text>
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          </View>
          <Text style={[type.small, { color: colors.textMuted }]}>Let customers know when you're open.</Text>
          <Button title="Add opening hours" icon="add-circle-outline" variant="secondary" size="md" onPress={editHours} style={{ marginTop: spacing.md }} />
        </Card>
      ) : null}

      {/* Quiet link for owners; customers can ignore it */}
      {isLiveBusiness && !isOwner ? (
        <Touchable
          onPress={() => navigation.navigate('ManageBusiness', { business: { id: business.id, name: business.name } })}
          accessibilityRole="link"
          style={styles.ownerLink}
        >
          <Text style={[type.caption, { color: colors.textMuted }]}>Is this your business? </Text>
          <Text style={[type.caption, { color: colors.primary, fontWeight: '700' }]}>Manage it</Text>
        </Touchable>
      ) : null}
    </View>
  );

  const products = Array.isArray(business.products) ? business.products : [];

  const ownerTools = isOwner && !customerView;

  const renderProducts = () => (
    <View style={styles.tabBody}>
      {isOwner ? (
        <Card style={[styles.viewCard, customerView && styles.viewCardCustomer]}>
          <Text style={[type.overline, { color: colors.textMuted }]}>Viewing your page as</Text>
          <View style={styles.segment} accessibilityRole="radiogroup">
              {[
                { id: false, label: 'Owner', icon: 'key-outline' },
                { id: true, label: 'Customer', icon: 'eye-outline' },
              ].map((o) => {
                const on = customerView === o.id;
                return (
                  <Touchable
                    key={o.label}
                    onPress={() => setCustomerView(o.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`View as ${o.label.toLowerCase()}`}
                    style={[styles.segmentItem, on && styles.segmentItemOn]}
                  >
                    <View style={styles.segmentInner}>
                      <Ionicons name={o.icon} size={16} color={on ? colors.onPrimary : colors.textSecondary} />
                      <Text style={[type.smallStrong, { color: on ? colors.onPrimary : colors.textSecondary }]}>{o.label}</Text>
                    </View>
                  </Touchable>
                );
              })}
          </View>
          <Text style={[type.small, { color: colors.textMuted, marginTop: spacing.sm }]}>
            {customerView
              ? 'This is exactly what buyers see on your page, with Buy and Pay buttons.'
              : 'Only you see these tools. Switch to Customer to check your page as buyers see it.'}
          </Text>
        </Card>
      ) : null}
      {!ownerTools && hidden ? (
        <Card style={styles.payNotice}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
            <Text style={[type.small, { color: colors.text, flex: 1 }]}>
              {business.name} isn't taking orders in the app right now. You can still call or message them.
            </Text>
          </View>
        </Card>
      ) : null}
      {ownerTools ? (
        approved
          ? <ListingStatusCard listing={listing} onPay={() => navigation.navigate('Payment', { business: { id: business.id, name: business.name } })} />
          : <PendingApprovalCard phone={business.phone} />
      ) : null}
      {ownerTools ? (
        <Button title="Add product" icon="add-circle-outline" onPress={openAddProduct} />
      ) : null}
      {ownerTools && payoutsOn ? (
        <Button title="MoMo payments received" icon="wallet-outline" variant="secondary" onPress={() => navigation.navigate('PayoutSetup', { business })} />
      ) : null}
      {ownerTools && !payoutsOn ? (
        <Card style={styles.payNotice}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
            <Text style={[type.small, { color: colors.text, flex: 1 }]}>
              Customers can't pay you in the app yet. Add the MoMo number where you want to receive money, and a Buy button appears on your products.
            </Text>
          </View>
          <Button title="Turn on MoMo payments" icon="wallet-outline" size="md" onPress={() => navigation.navigate('PayoutSetup', { business })} style={{ marginTop: spacing.md }} />
        </Card>
      ) : null}
      {products.length === 0 ? (
        <Card>
          <EmptyState
            icon="pricetags-outline"
            title="No products listed yet"
            message={ownerTools ? 'Add your first product so customers can see what you sell.' : `${business.name} hasn't added products yet. Call or message them to ask what they have.`}
          />
        </Card>
      ) : (
        products.map((p) => (
          <Card key={p.id} style={styles.productCard}>
            <ProductPhoto product={p} business={business} style={styles.productImage} />
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
              {p.category ? <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{p.category}</Text> : null}
              <Text style={[type.bodyStrong, { color: colors.primary, marginTop: 4 }]}>{p.price || 'Price on request'}</Text>
              {p.inStock === false ? <Badge label="Out of stock" tone="danger" style={{ marginTop: 6 }} /> : null}
            </View>
            {ownerTools ? (
              <IconButton icon="trash-outline" color={colors.danger} background={colors.dangerSoft} size={18} accessibilityLabel={`Remove ${p.name}`} onPress={() => removeProduct(p)} />
            ) : (
              p.inStock === false ? (
                <Button title="Enquire" size="sm" variant="secondary" fullWidth={false} onPress={() => handleMessage(`Hello ${business.name}, is "${p.name}" back in stock?`)} />
              ) : acceptsPayments && p.priceValue ? (
                <Button title="Buy" icon="wallet-outline" size="sm" fullWidth={false} onPress={() => openPay(p)} accessibilityLabel={`Buy ${p.name}`} />
              ) : (
                <Button title="Order" icon="bag-handle-outline" size="sm" fullWidth={false} onPress={() => handleOrder(p)} accessibilityLabel={`Order ${p.name}`} />
              )
            )}
          </Card>
        ))
      )}
    </View>
  );

  const renderReviews = () => (
    <View style={styles.tabBody}>
      <Card>
        <EmptyState icon="chatbubbles-outline" title="No reviews yet" message="Customer reviews are coming soon." />
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        {/* Hero */}
        <HeroBackground>
        <LinearGradient colors={['rgba(11,38,56,0.55)', 'rgba(18,58,85,0.78)', 'rgba(27,79,114,0.96)']} style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.heroNav}>
            <IconButton icon="chevron-back" color={colors.onPrimary} background="rgba(255,255,255,0.16)" accessibilityLabel="Go back" onPress={() => navigation.goBack()} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {ownerTools ? (
                <IconButton icon={coverBusy ? 'hourglass-outline' : 'camera-outline'} color={colors.onPrimary} background="rgba(255,255,255,0.16)" accessibilityLabel="Change cover photo" onPress={coverBusy ? undefined : changeCover} />
              ) : null}
              <IconButton icon="share-outline" color={colors.onPrimary} background="rgba(255,255,255,0.16)" accessibilityLabel="Share" onPress={handleShare} />
            </View>
          </View>
          <View style={styles.heroBody}>
            <BusinessCover business={business} style={[styles.heroIcon, { overflow: 'hidden' }]} compact />
            <View style={{ flex: 1 }}>
              {business.badge ? <Badge label={business.badge} tone="inverse" icon="ribbon-outline" style={{ marginBottom: 6 }} /> : null}
              <Text style={[type.h1, { color: colors.onPrimary }]} numberOfLines={2}>{business.name}</Text>
              <Text style={[type.small, { color: colors.onPrimaryMuted }]}>{business.type}</Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="star" size={14} color={colors.star} />
              <Text style={[type.smallStrong, { color: colors.onPrimary }]}>{Number(business.rating) > 0 ? Number(business.rating).toFixed(1) : 'New'}</Text>
            </View>
            {business.verified === true ? (
              <View style={styles.heroMetaItem}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primaryMuted} />
                <Text style={[type.smallStrong, { color: colors.onPrimary }]}>Verified</Text>
              </View>
            ) : null}
            <View style={styles.heroMetaItem}>
              <Ionicons name="location" size={14} color={colors.primaryMuted} />
              <Text style={[type.smallStrong, { color: colors.onPrimary }]} numberOfLines={1}>{business.location}</Text>
            </View>
          </View>
        </LinearGradient>
        </HeroBackground>

        {/* Quick actions */}
        <Card style={styles.actions}>
          {actions.map((a) => (
            <Touchable key={a.label} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.label} style={styles.action}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[type.caption, { color: colors.textSecondary, fontWeight: '600' }]}>{a.label}</Text>
            </Touchable>
          ))}
        </Card>

        {/* Segmented tabs */}
        <View style={styles.segment} accessibilityRole="tablist">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <Touchable
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Text style={[type.smallStrong, { color: active ? colors.primary : colors.textMuted }]}>{t.name}</Text>
              </Touchable>
            );
          })}
        </View>

        {activeTab === 'about' && renderAbout()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'reviews' && renderReviews()}
      </ScrollView>

      {/* Sticky contact bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button title="Message" icon="chatbubble-ellipses-outline" variant="outline" onPress={handleMessage} style={{ flex: 1, paddingHorizontal: spacing.sm }} />
        <Button title="Call" icon="call" variant={acceptsPayments ? 'outline' : 'primary'} onPress={handleCall} style={{ flex: 1, paddingHorizontal: spacing.sm }} accessibilityLabel={`Call ${business.name}`} />
        {acceptsPayments ? (
          <Button title="Pay" icon="wallet" onPress={() => openPay(null)} style={{ flex: 1, paddingHorizontal: spacing.sm }} accessibilityLabel={`Pay ${business.name} with Mobile Money`} />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  viewCard: { paddingVertical: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary },
  viewCardCustomer: { borderLeftColor: colors.success },
  segment: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: radius.pill },
  segmentInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentItemOn: { backgroundColor: colors.primary },
  payNotice: { backgroundColor: colors.warningSoft, borderColor: '#F1D9A8' },
  container: { flex: 1, backgroundColor: colors.background },
  heroWrap: {
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  heroImage: { borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl },
  hero: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 88 },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },

  actions: {
    flexDirection: 'row',
    marginHorizontal: spacing.gutter,
    marginTop: -spacing.xxxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    ...shadow.md,
  },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.gutter,
    marginTop: spacing.xl,
    padding: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  segmentItem: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentItemActive: { backgroundColor: colors.surface, ...shadow.sm },

  tabBody: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, gap: spacing.md },
  cardTitle: { color: colors.text, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  infoRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  hoursHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  // Day and time share the row; long text wraps inside the card instead of running past it.
  hoursRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  hoursDay: { flex: 1, flexShrink: 1, color: colors.textSecondary },
  hoursTime: { flexShrink: 1, maxWidth: '60%', textAlign: 'right', color: colors.text },
  ownerLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },

  productCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  productImage: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.lg,
  },
});

export default BusinessDetailScreen;
