// Shared category metadata used by Home, Browse and business cards.
export const CATEGORIES = [
  { id: 'all', name: 'All', fullName: 'All categories', icon: 'grid-outline', tint: '#E6F1FB', color: '#1B4F72' },
  { id: 'phones', name: 'Phones', fullName: 'Phones & electronics', icon: 'phone-portrait-outline', tint: '#E6F1FB', color: '#1B4F72' },
  { id: 'cosmetics', name: 'Beauty', fullName: 'Cosmetics & beauty', icon: 'color-palette-outline', tint: '#FBEAF0', color: '#9D2654' },
  { id: 'fashion', name: 'Fashion', fullName: 'Fashion & clothing', icon: 'shirt-outline', tint: '#F1ECFB', color: '#5B3A9E' },
  { id: 'food', name: 'Food', fullName: 'Food & grocery', icon: 'restaurant-outline', tint: '#FAEEDA', color: '#8A4B08' },
  { id: 'hardware', name: 'Hardware', fullName: 'Hardware & building', icon: 'construct-outline', tint: '#EAF3DE', color: '#2F6B12' },
];

const FALLBACK = { icon: 'business-outline', tint: '#F1F5F9', color: '#475569' };

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) || FALLBACK;
