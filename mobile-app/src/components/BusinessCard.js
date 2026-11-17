import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Touchable, Badge, Rating, VerifiedTick } from './ui';
import { colors, spacing, radius, type, shadow } from '../theme';
import { getCategory } from '../data/categories';
import { BusinessCover } from './BusinessCover';
import { businessPhoto } from '../utils/photos';

const planTone = (badge) => (badge === 'Premium' ? 'solid' : badge === 'Standard' ? 'primary' : 'neutral');

// Vertical card for grids and carousels
export const BusinessCard = ({ business, onPress, width }) => {
  const cat = getCategory(business.category);
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${business.name}, ${business.type}, rated ${business.rating}`}
      style={[styles.card, width ? { width } : null]}
    >
      {/* Inner layer clips the photo to the rounded corners; the outer layer keeps the shadow
          (on iOS, clipping and shadow on the same view hides the shadow). */}
      <View style={styles.cardInner}>
      <BusinessCover business={business} style={styles.cover}>
        {businessPhoto(business) ? <LinearGradient colors={['rgba(11,38,56,0)', 'rgba(11,38,56,0.55)']} style={StyleSheet.absoluteFill} /> : null}
        {business.badge ? <Badge label={business.badge} tone={planTone(business.badge)} style={styles.coverBadge} /> : null}
        <View style={styles.coverCat}>
          <Ionicons name={cat.icon} size={12} color={colors.primary} />
          <Text style={[type.caption, { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>{cat.name || 'Business'}</Text>
        </View>
      </BusinessCover>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[type.title, styles.name]} numberOfLines={1}>{business.name}</Text>
          {business.verified === true ? <VerifiedTick /> : null}
        </View>
        <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{business.type}</Text>
        <View style={styles.meta}>
          <Rating value={business.rating} size={12} />
          <View style={styles.location}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={[type.caption, { color: colors.textMuted, flexShrink: 1 }]} numberOfLines={1}>
              {String(business.location || '').split(',')[0]}
            </Text>
          </View>
        </View>
      </View>
      </View>
    </Touchable>
  );
};

// Horizontal row for list views
export const BusinessRow = ({ business, onPress }) => {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${business.name}, ${business.type}, rated ${business.rating}`}
      style={styles.row}
    >
      <BusinessCover business={business} style={styles.rowThumb} compact />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.nameRow}>
          <Text style={[type.title, styles.name]} numberOfLines={1}>{business.name}</Text>
          {business.verified === true ? <VerifiedTick /> : null}
        </View>
        <Text style={[type.small, { color: colors.textMuted }]} numberOfLines={1}>{business.type}</Text>
        <View style={[styles.meta, { marginTop: 4 }]}>
          <Rating value={business.rating} size={12} />
          <Text style={{ color: colors.borderStrong }}>•</Text>
          <View style={styles.location}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={[type.caption, { color: colors.textMuted, flexShrink: 1 }]} numberOfLines={1}>{business.location}</Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
        {business.badge ? <Badge label={business.badge} tone={planTone(business.badge)} /> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
      </View>
    </Touchable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    ...shadow.raised,
  },
  cardInner: { borderRadius: radius.lg - 1.5, overflow: 'hidden' },
  cover: { height: 124, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  coverCat: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '80%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  coverBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  body: { padding: spacing.md, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.text, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  location: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.card,
  },
  rowThumb: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.primarySoft },
});
