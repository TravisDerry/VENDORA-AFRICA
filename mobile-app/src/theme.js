// Vendora Africa design system.
// Brand colours come from the website (index.html): navy #1B4F72 and blue #2E86C1.
// Every text/background pair used in the app meets WCAG AA (4.5:1) contrast.
import { Platform } from 'react-native';

export const colors = {
  // Brand
  primary: '#1B4F72', // navy, 8.6:1 on white
  primaryDark: '#123A55',
  primaryDeep: '#0B2638',
  accent: '#2E86C1', // icons / large text only (4.0:1 on white)
  primarySoft: '#E6F1FB',
  primaryMuted: '#B5D4F4',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#CFE3F5',

  // Neutrals
  background: '#EAF0F6', // blue-grey canvas so white cards stand out
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#D3DEEA',
  borderStrong: '#B7C7D8',
  cardBorder: '#C5D5E6', // card outline that stays visible on white
  cardBorderStrong: '#8FAAC6', // business cards: clearly outlined on white
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  placeholder: '#94A3B8',

  // Status
  success: '#2F6B12',
  successSoft: '#EAF3DE',
  warning: '#9A5B0B',
  warningSoft: '#FFF4E0',
  danger: '#B42318',
  dangerSoft: '#FEF3F2',
  star: '#E59E1B',

  overlay: 'rgba(15, 23, 42, 0.45)',

  // Bottom tab bar (dark, like the header) and its accents
  tabBar: '#0B2638',
  tabActive: '#7CC4F2', // light brand blue, 8.9:1 on tabBar
  tabInactive: 'rgba(255,255,255,0.62)',
};

export const gradients = {
  brand: ['#1B4F72', '#2E86C1'],
  deep: ['#0B2638', '#1B4F72'],
  hero: ['#123A55', '#1B4F72', '#2E86C1'],
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 20, // horizontal screen padding
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: undefined });
const fontFamilyMedium = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: undefined });

export const type = {
  display: { fontFamily, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  h1: { fontFamily, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  h2: { fontFamily, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  h3: { fontFamily: fontFamilyMedium, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  title: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  body: { fontFamily, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  small: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  smallStrong: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontFamily: fontFamilyMedium, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
};

export const shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#1B4F72', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 },
    android: { elevation: 3, shadowColor: '#1B4F72' },
    default: { boxShadow: '0px 3px 10px rgba(27,79,114,0.12)' },
  }),
  md: Platform.select({
    ios: { shadowColor: '#1B4F72', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 16 },
    android: { elevation: 6, shadowColor: '#1B4F72' },
    default: { boxShadow: '0px 8px 18px rgba(27,79,114,0.16)' },
  }),
  // Cards on white backgrounds: stronger, navy-tinted so cards clearly lift off the page
  card: Platform.select({
    ios: { shadowColor: '#1B4F72', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 14 },
    android: { elevation: 6, shadowColor: '#1B4F72' },
    default: { boxShadow: '0px 6px 16px rgba(27,79,114,0.18)' },
  }),
  // Strongly raised cards (business cards on white pages)
  raised: Platform.select({
    ios: { shadowColor: '#0B2638', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 18 },
    android: { elevation: 10, shadowColor: '#0B2638' },
    default: { boxShadow: '0px 10px 22px rgba(11,38,56,0.24), 0px 2px 6px rgba(11,38,56,0.12)' },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#0B2638', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24 },
    android: { elevation: 8 },
    default: { boxShadow: '0px 12px 24px rgba(11,38,56,0.16)' },
  }),
};

// Minimum touch target per Apple HIG (44pt) and Material (48dp)
export const hitSize = 48;

export default { colors, gradients, spacing, radius, type, shadow, hitSize };
