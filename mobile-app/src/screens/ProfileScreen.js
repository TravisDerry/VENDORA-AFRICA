// Account tab. There are no customer logins yet, so this shows what this phone actually knows:
// - customers: a guest welcome and their orders (saved on this phone)
// - owners: the real business they manage on this phone (loaded from the backend)
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, type } from '../theme';
import { GradientHeader, Card, ListRow, Avatar, Badge, StatTile, IconButton, Button, useStatusBar } from '../components/ui';
import { API_BASE_URL } from '../config';
import { getLiveOwnedBusinesses, getOwnerKey } from '../utils/ownerKeys';
import { getMyOrders } from '../utils/myOrders';
import { normalizeBusiness } from '../utils/businesses';
import { readJson, formatGhs } from '../components/MomoPayment';
import { ListingStatusCard, PendingApprovalCard } from '../components/ListingStatus';
import { BusinessCover } from '../components/BusinessCover';
import { resolvePhoto } from '../utils/photos';

const LISTING_BADGE = {
  trial: { label: 'Free month', icon: 'gift-outline' },
  active: { label: 'Listing paid', icon: 'checkmark-circle-outline' },
  grace: { label: 'Payment due', icon: 'alert-circle-outline' },
  expired: { label: 'Hidden', icon: 'eye-off-outline' },
};

const titleCase = (v) => String(v || '').replace(/\b\w/g, (c) => c.toUpperCase());
const monthYear = (d) => {
  try {
    return d ? new Date(d).toLocaleDateString('en-GH', { month: 'long', year: 'numeric' }) : '';
  } catch (e) {
    return '';
  }
};
const compact = (n) => (Number(n) >= 1000 ? `${(Number(n) / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Number(n) || 0));

const ProfileScreen = ({ navigation }) => {
  useStatusBar('light');
  const [loading, setLoading] = useState(true);
  const [ownedCount, setOwnedCount] = useState(0);
  const [business, setBusiness] = useState(null); // raw API record of the first managed business
  const [received, setReceived] = useState(null); // { count, total }
  const [orderCount, setOrderCount] = useState(0);

  const load = useCallback(async () => {
    const [owned, orders] = await Promise.all([getLiveOwnedBusinesses(API_BASE_URL), getMyOrders()]);
    setOwnedCount(owned.length);
    setOrderCount(orders.length);
    if (owned.length === 0) {
      setBusiness(null);
      setReceived(null);
      setLoading(false);
      return;
    }
    const first = owned[0];
    try {
      const key = await getOwnerKey(first.id);
      const [bRes, pRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/businesses/${encodeURIComponent(first.id)}?track=0`, { headers: { 'X-Manage-Key': key || '' } }),
        key ? fetch(`${API_BASE_URL}/api/payments/received/${encodeURIComponent(first.id)}`, { headers: { 'X-Manage-Key': key } }) : null,
      ]);
      const bJson = await readJson(bRes);
      setBusiness(bRes.ok ? (bJson.business || bJson) : { _id: first.id, businessName: first.name, offline: true });
      if (pRes && pRes.ok) {
        const list = (await readJson(pRes)).payments || [];
        setReceived({ count: list.length, total: list.reduce((s, p) => s + (Number(p.amount) || 0), 0) });
      } else setReceived(null);
    } catch (e) {
      setBusiness({ _id: first.id, businessName: first.name, offline: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const say = (title, msg) => (Platform.OS === 'web' ? window.alert(`${title}\n\n${msg}`) : Alert.alert(title, msg));

  const openMyBusiness = () => {
    if (!business || business.offline) return navigation.navigate('ManageBusiness');
    navigation.navigate('BusinessDetail', { business: normalizeBusiness(business, 0), tab: 'products' });
  };
  const openPayouts = () => {
    if (!business) return;
    navigation.navigate('PayoutSetup', { business: normalizeBusiness(business, 0) });
  };

  const isOwner = !!business;
  // An owner's Account header shows their own business photo (plain navy if they haven't added one)
  const coverPhoto = isOwner ? resolvePhoto(business.images?.cover) : null;
  const listingBadge = business && !business.offline && !business.verified ? { label: 'Awaiting approval', icon: 'hourglass-outline' } : LISTING_BADGE[business?.listing?.status];
  const loc = business?.location && typeof business.location === 'object' ? business.location : {};
  const place = [titleCase(loc.city || loc.address), titleCase(business?.country)].filter(Boolean).join(', ');
  const products = Array.isArray(business?.products) ? business.products.length : 0;

  const header = isOwner ? (
    <>
      <View style={styles.profileRow}>
        <View style={styles.avatarRing}>
          <BusinessCover business={{ name: business.businessName, category: business.category, image: business.images?.cover }} style={styles.ownerPhoto} compact />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.overline, { color: colors.onPrimaryMuted }]}>Business owner</Text>
          <Text style={[type.h2, { color: colors.onPrimary }]} numberOfLines={1}>{business.businessName}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {listingBadge ? <Badge label={listingBadge.label} tone="inverse" icon={listingBadge.icon} /> : null}
            {ownedCount > 1 ? <Badge label={`+${ownedCount - 1} more`} tone="inverse" /> : null}
          </View>
        </View>
      </View>
      <View style={styles.stats}>
        <StatTile value={String(products)} label="Products" inverse />
        <StatTile value={compact(business.views)} label="Views" inverse />
        <StatTile value={received ? String(received.count) : '–'} label="Payments" inverse />
        <StatTile value={String(orderCount)} label="My orders" inverse />
      </View>
    </>
  ) : (
    <>
      <View style={styles.profileRow}>
        <View style={[styles.avatarRing, styles.guestAvatar]}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.h2, { color: colors.onPrimary }]}>Welcome to Vendora</Text>
          <Text style={[type.small, { color: colors.onPrimaryMuted }]}>Browsing as a guest</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <StatTile value={String(orderCount)} label="My orders" inverse />
      </View>
    </>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
      <GradientHeader
        compact
        title="Account"
        image={isOwner ? coverPhoto : undefined}
        light={!!coverPhoto}
        right={
          <IconButton icon="refresh" color={colors.onPrimary} background="rgba(255,255,255,0.14)" accessibilityLabel="Refresh" onPress={load} />
        }
      >
        {loading ? <ActivityIndicator color={colors.onPrimary} style={{ marginTop: spacing.xl }} /> : header}
      </GradientHeader>

      {!loading && isOwner ? (
        <>
          {/* Real business details */}
          <View style={styles.section}>
            <Card>
              <View style={styles.cardHead}>
                <Text style={[type.h3, { color: colors.text, flexShrink: 1 }]}>Business details</Text>
                {business.offline ? (
                  <Badge label="Offline" tone="warning" icon="cloud-offline-outline" />
                ) : business.verified ? (
                  <Badge label="Verified" tone="success" icon="checkmark-circle" />
                ) : (
                  <Badge label="Pending" tone="warning" icon="time-outline" />
                )}
              </View>
              {[
                business.email && { icon: 'mail-outline', value: business.email },
                business.phoneNumber && { icon: 'call-outline', value: business.phoneNumber },
                place && { icon: 'location-outline', value: place },
                business.category && { icon: 'pricetag-outline', value: titleCase(business.category) },
                business.createdAt && { icon: 'calendar-outline', value: `On Vendora since ${monthYear(business.createdAt)}` },
                { icon: 'wallet-outline', value: business.acceptsPayments ? 'Accepting MoMo payments' : 'Not accepting MoMo payments yet' },
              ].filter(Boolean).map((row) => (
                <View key={row.icon} style={styles.infoRow}>
                  <Ionicons name={row.icon} size={18} color={colors.textMuted} />
                  <Text style={[type.body, { color: colors.textSecondary, flex: 1 }]} numberOfLines={2}>{row.value}</Text>
                </View>
              ))}
              <Button title="Open my business page" icon="storefront-outline" variant="secondary" size="md" onPress={openMyBusiness} style={{ marginTop: spacing.md }} />
            </Card>
          </View>

          {/* Monthly listing: free month / paid / due / hidden */}
          {!business.offline && !business.verified ? (
            <View style={styles.section}>
              <PendingApprovalCard phone={business.phoneNumber} />
            </View>
          ) : business.listing ? (
            <View style={styles.section}>
              <ListingStatusCard
                listing={business.listing}
                onPay={() => navigation.navigate('Payment', { business: { id: String(business._id), name: business.businessName } })}
              />
            </View>
          ) : null}
        </>
      ) : null}

      {!loading && !isOwner ? (
        <View style={styles.section}>
          <Card style={styles.upgrade} onPress={() => navigation.navigate('Main', { screen: 'Register' })} accessibilityLabel="List your business free">
            <View style={styles.upgradeIcon}>
              <Ionicons name="storefront" size={20} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: colors.primary }]}>Own a business?</Text>
              <Text style={[type.small, { color: colors.textSecondary }]}>List it free and get customers paying you with MoMo.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Card>
        </View>
      ) : null}

      {/* Shopping */}
      <View style={styles.section}>
        <Text style={[type.overline, styles.groupTitle]}>Shopping</Text>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <ListRow
            icon="receipt-outline"
            title="My orders"
            subtitle={orderCount ? `${orderCount} payment${orderCount === 1 ? '' : 's'} made from this phone` : 'Payments you made to businesses'}
            onPress={() => navigation.navigate('MyOrders')}
          />
          <ListRow icon="compass-outline" title="Explore businesses" subtitle="Find sellers near you" onPress={() => navigation.navigate('Browse')} last />
        </Card>
      </View>

      {/* Business */}
      <View style={styles.section}>
        <Text style={[type.overline, styles.groupTitle]}>For business owners</Text>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <ListRow
            icon="key-outline"
            title="Manage my business"
            subtitle={ownedCount ? `${ownedCount} business${ownedCount === 1 ? '' : 'es'} on this phone` : 'Products, MoMo payments and listing'}
            onPress={() => navigation.navigate('ManageBusiness')}
            last={!isOwner}
          />
          {isOwner ? (
            <ListRow
              icon="wallet-outline"
              title="MoMo payments"
              subtitle={received && received.count ? `${received.count} received · ${formatGhs(received.total)}` : business.acceptsPayments ? 'No payments yet' : 'Set up to receive payments'}
              onPress={openPayouts}
            />
          ) : null}
          {isOwner ? (
            <ListRow icon="pricetags-outline" title="Pricing" subtitle="Monthly price by business type" onPress={() => navigation.navigate('Pricing')} last />
          ) : null}
        </Card>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={[type.overline, styles.groupTitle]}>Support</Text>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <ListRow icon="help-buoy-outline" title="Help & support" subtitle="Questions, contact us, report a problem" onPress={() => navigation.navigate('Help')} />
          <ListRow icon="document-text-outline" title="Terms & privacy" subtitle="Terms of Use and Privacy Policy" onPress={() => navigation.navigate('Legal')} last />
        </Card>
      </View>

      <View style={styles.footer}>
        <Text style={[type.caption, { color: colors.textMuted }]}>Vendora Africa · Version 1.0.0</Text>
        <Text style={[type.caption, { color: colors.placeholder }]}>Built for Africa, by Africa</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xl },
  avatarRing: { padding: 3, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)' },
  verifyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  ownerPhoto: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  guestAvatar: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  section: { paddingHorizontal: spacing.gutter, marginTop: spacing.xl },
  cardHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  upgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: { color: colors.textMuted, marginBottom: spacing.sm, marginLeft: spacing.xs },
  footer: { alignItems: 'center', gap: 2, marginTop: spacing.xxl },
});

export default ProfileScreen;
