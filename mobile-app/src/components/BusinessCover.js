// Shows a business's own photo. Without one, a plain branded cover (navy/blue with the business's
// initials and category icon) so a business never shows someone else's shop.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradients } from '../theme';
import { getCategory } from '../data/categories';
import { businessPhoto, resolvePhoto } from '../utils/photos';

const initialsOf = (name = '') =>
  String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'V';

// compact: small thumbnails (initials only)
export const BusinessCover = ({ business, style, imageStyle, compact = false, children }) => {
  const photo = businessPhoto(business);
  const [failed, setFailed] = useState(false); // photo deleted or unreachable: fall back to the branded cover
  if (photo && !failed) {
    return (
      <ImageBackground
        source={photo}
        style={style}
        imageStyle={[{ width: '100%', height: '100%' }, imageStyle]}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      >
        {children}
      </ImageBackground>
    );
  }
  const cat = getCategory(business?.category);
  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[style, styles.center, { overflow: 'hidden' }]}>
      {!compact ? (
        <Ionicons name={cat.icon || 'storefront-outline'} size={120} color="rgba(255,255,255,0.08)" style={styles.watermark} />
      ) : null}
      <View style={[styles.badge, compact && styles.badgeCompact]}>
        <Text style={[styles.initials, compact && styles.initialsCompact]} numberOfLines={1}>{initialsOf(business?.name || business?.businessName)}</Text>
      </View>
      {children ? <View style={StyleSheet.absoluteFill} pointerEvents="box-none">{children}</View> : null}
    </LinearGradient>
  );
};

// Product photo, or a neutral tile with the category icon (never another seller's picture)
export const ProductPhoto = ({ product, business, style }) => {
  const own = resolvePhoto(product?.image);
  const [failed, setFailed] = useState(false);
  if (own && !failed) return <Image source={own} style={style} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
  const cat = getCategory(business?.category);
  return (
    <View style={[style, styles.center, { backgroundColor: cat.tint || '#E6F1FB' }]}>
      <Ionicons name={cat.icon || 'pricetag-outline'} size={26} color={cat.color || '#1B4F72'} />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  watermark: { position: 'absolute', right: -18, bottom: -22, transform: [{ rotate: '-12deg' }] },
  badge: {
    minWidth: 58,
    height: 58,
    paddingHorizontal: 10,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badgeCompact: { minWidth: 0, height: undefined, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 },
  initials: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  initialsCompact: { fontSize: 20 },
});
