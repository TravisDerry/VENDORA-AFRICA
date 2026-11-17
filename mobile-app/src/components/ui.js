import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { colors, gradients, spacing, radius, type, shadow, hitSize } from '../theme';
import { AFRICA_IMAGES } from '../data/images';

// Sets the status bar text colour while a screen is focused.
// 'light' for screens with a navy header, 'dark' for white headers.
export const useStatusBar = (style) => {
  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle(style);
    }, [style])
  );
};

// Pressable with consistent pressed feedback
export const Touchable = ({ style, children, disabled, pressedStyle, ...rest }) => (
  <Pressable
    disabled={disabled}
    style={({ pressed }) => [
      typeof style === 'function' ? style({ pressed }) : style,
      pressed && !disabled && (pressedStyle || styles.pressed),
    ]}
    {...rest}
  >
    {children}
  </Pressable>
);

// ---------- Buttons ----------
const BUTTON_VARIANTS = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.borderStrong },
  inverse: { bg: colors.surface, fg: colors.primary, border: colors.surface },
  ghostInverse: { bg: 'rgba(255,255,255,0.12)', fg: colors.onPrimary, border: 'rgba(255,255,255,0.45)' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityLabel,
}) => {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const height = size === 'sm' ? 38 : size === 'md' ? 44 : 52;
  const isDisabled = disabled || loading;
  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        {
          height,
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} /> : null}
          <Text style={[size === 'sm' ? type.smallStrong : type.bodyStrong, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={size === 'sm' ? 16 : 18} color={v.fg} /> : null}
        </>
      )}
    </Touchable>
  );
};

export const IconButton = ({ icon, onPress, color = colors.text, background = colors.surface, size = 22, badge, accessibilityLabel, style }) => (
  <Touchable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    hitSlop={8}
    style={[styles.iconButton, { backgroundColor: background }, style]}
  >
    <Ionicons name={icon} size={size} color={color} />
    {badge ? <View style={styles.iconButtonDot} /> : null}
  </Touchable>
);

// ---------- Surfaces ----------
export const Card = ({ children, style, onPress, padded = true, accessibilityLabel }) => {
  const content = [styles.card, padded && styles.cardPadded, style];
  if (onPress) {
    return (
      <Touchable onPress={onPress} style={content} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        {children}
      </Touchable>
    );
  }
  return <View style={content}>{children}</View>;
};

export const SectionHeader = ({ title, subtitle, actionLabel, onAction, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <View style={{ flex: 1 }}>
      <Text style={[type.h3, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[type.small, { color: colors.textMuted, marginTop: 2 }]}>{subtitle}</Text> : null}
    </View>
    {actionLabel ? (
      <Touchable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.sectionAction}>
        <Text style={[type.smallStrong, { color: colors.primary }]}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </Touchable>
    ) : null}
  </View>
);

// Gradient header used at the top of tab screens
// image: background photo (null = plain navy). light: a lighter shade so a business's own photo shows through.
export const GradientHeader = ({ title, subtitle, eyebrow, children, right, compact = false, style, image = AFRICA_IMAGES.marketDar, light = false }) => {
  const insets = useSafeAreaInsets();
  const Wrap = image ? ImageBackground : View;
  const wrapProps = image
    ? { source: image, resizeMode: 'cover', style: styles.gradientHeaderWrap, imageStyle: { width: '100%', height: '100%' } }
    : { style: [styles.gradientHeaderWrap, { backgroundColor: colors.primaryDeep }] };
  return (
    <Wrap {...wrapProps}>
    <LinearGradient
      colors={light ? ['rgba(11,38,56,0.72)', 'rgba(11,38,56,0.45)', 'rgba(11,38,56,0.82)'] : ['rgba(11,38,56,0.94)', 'rgba(18,58,85,0.86)', 'rgba(27,79,114,0.78)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientHeader, { paddingTop: insets.top + (compact ? spacing.md : spacing.lg) }, style]}
    >
      <View style={styles.gradientHeaderRow}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={[type.overline, { color: colors.primaryMuted, marginBottom: spacing.xs }]}>{eyebrow}</Text> : null}
          {title ? <Text style={[compact ? type.h1 : type.display, { color: colors.onPrimary }]}>{title}</Text> : null}
          {subtitle ? <Text style={[type.body, { color: colors.onPrimaryMuted, marginTop: spacing.xs }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </LinearGradient>
    </Wrap>
  );
};

// ---------- Badges, chips ----------
const BADGE_TONES = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
  inverse: { bg: 'rgba(255,255,255,0.18)', fg: colors.onPrimary },
  solid: { bg: colors.primary, fg: colors.onPrimary },
};

export const Badge = ({ label, tone = 'primary', icon, style }) => {
  const t = BADGE_TONES[tone] || BADGE_TONES.primary;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={[type.caption, { color: t.fg, fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

export const Chip = ({ label, icon, selected, onPress }) => (
  <Touchable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    {icon ? <Ionicons name={icon} size={16} color={selected ? colors.onPrimary : colors.textSecondary} /> : null}
    <Text style={[type.smallStrong, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{label}</Text>
  </Touchable>
);

export const VerifiedTick = ({ size = 14, color = colors.accent }) => (
  <Ionicons name="checkmark-circle" size={size} color={color} accessibilityLabel="Verified business" />
);

export const Rating = ({ value, size = 13, color = colors.text, showStars = false }) => {
  const rounded = Number(value || 0);
  if (showStars) {
    return (
      <View style={styles.row} accessibilityLabel={`Rated ${rounded} out of 5`}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Ionicons
            key={s}
            name={s <= Math.floor(rounded) ? 'star' : s - rounded < 1 ? 'star-half' : 'star-outline'}
            size={size}
            color={colors.star}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={[styles.row, { gap: 3 }]} accessibilityLabel={`Rated ${rounded} out of 5`}>
      <Ionicons name="star" size={size} color={colors.star} />
      <Text style={[type.smallStrong, { color, fontSize: size }]}>{rounded > 0 ? rounded.toFixed(1) : 'New'}</Text>
    </View>
  );
};

export const IconTile = ({ icon, color = colors.primary, background = colors.primarySoft, size = 44, iconSize = 22, rounded = radius.md }) => (
  <View style={{ width: size, height: size, borderRadius: rounded, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={icon} size={iconSize} color={color} />
  </View>
);

export const Avatar = ({ name = '', size = 56, background = colors.surface, color = colors.primary }) => {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.36, fontWeight: '800' }}>{initials || '?'}</Text>
    </View>
  );
};

export const Divider = ({ style }) => <View style={[styles.divider, style]} />;

// ---------- Inputs ----------
export const SearchBar = ({ value, onChangeText, placeholder = 'Search businesses, products…', onPress, autoFocus, style }) => {
  const inner = (
    <>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      {onPress ? (
        <Text style={[type.body, { color: colors.placeholder, flex: 1 }]} numberOfLines={1}>{placeholder}</Text>
      ) : (
        <TextInput
          style={[type.body, styles.searchInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          returnKeyType="search"
          autoFocus={autoFocus}
          autoCorrect={false}
          accessibilityLabel="Search"
        />
      )}
      {!onPress && value ? (
        <Touchable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={20} color={colors.placeholder} />
        </Touchable>
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Touchable onPress={onPress} accessibilityRole="search" style={[styles.searchBar, style]}>
        {inner}
      </Touchable>
    );
  }
  return <View style={[styles.searchBar, style]}>{inner}</View>;
};

export const TextField = ({ label, error, hint, icon, multiline, style, ...inputProps }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          styles.fieldBox,
          multiline && styles.fieldBoxMultiline,
          focused && styles.fieldBoxFocused,
          error && styles.fieldBoxError,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={multiline ? { marginTop: 2 } : null} /> : null}
        <TextInput
          {...inputProps}
          multiline={multiline}
          onFocus={(e) => { setFocused(true); inputProps.onFocus && inputProps.onFocus(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur && inputProps.onBlur(e); }}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={label}
          style={[type.body, styles.fieldInput, multiline && styles.fieldInputMultiline]}
        />
      </View>
      {error ? (
        <View style={styles.fieldMessage}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[type.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

export const SelectField = ({ label, value, placeholder, onPress, error, icon, style }) => (
  <View style={[styles.field, style]}>
    {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder}`}
      style={[styles.fieldBox, error && styles.fieldBoxError]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} /> : null}
      <Text style={[type.body, { flex: 1, color: value ? colors.text : colors.placeholder }]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
    </Touchable>
    {error ? (
      <View style={styles.fieldMessage}>
        <Ionicons name="alert-circle" size={14} color={colors.danger} />
        <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
      </View>
    ) : null}
  </View>
);

export const BottomSheet = ({ visible, title, onClose, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={[type.h3, { color: colors.text }]}>{title}</Text>
            <IconButton icon="close" onPress={onClose} background={colors.surfaceAlt} size={20} accessibilityLabel="Close" />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const OptionRow = ({ label, selected, onPress }) => (
  <Touchable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    style={[styles.optionRow, selected && styles.optionRowSelected]}
  >
    <Text style={[type.body, { color: selected ? colors.primary : colors.text, fontWeight: selected ? '700' : '400', flex: 1 }]}>{label}</Text>
    <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.borderStrong} />
  </Touchable>
);

// ---------- Lists / feedback ----------
export const ListRow = ({ icon, title, subtitle, onPress, badge, right, danger, last }) => (
  <Touchable onPress={onPress} accessibilityRole="button" style={[styles.listRow, !last && styles.listRowBorder]}>
    <IconTile
      icon={icon}
      size={40}
      iconSize={20}
      color={danger ? colors.danger : colors.primary}
      background={danger ? colors.dangerSoft : colors.primarySoft}
      rounded={radius.sm + 2}
    />
    <View style={{ flex: 1 }}>
      <Text style={[type.title, { color: danger ? colors.danger : colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[type.small, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    {badge ? (
      <View style={styles.countBadge}>
        <Text style={[type.caption, { color: colors.onPrimary, fontWeight: '700' }]}>{badge}</Text>
      </View>
    ) : null}
    {right !== undefined ? right : <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />}
  </Touchable>
);

export const EmptyState = ({ icon = 'search', title, message, actionLabel, onAction }) => (
  <View style={styles.empty}>
    <IconTile icon={icon} size={72} iconSize={32} rounded={36} />
    <Text style={[type.h3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>{title}</Text>
    {message ? <Text style={[type.body, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>{message}</Text> : null}
    {actionLabel ? <Button title={actionLabel} onPress={onAction} variant="secondary" size="md" fullWidth={false} style={{ marginTop: spacing.lg, alignSelf: 'center' }} /> : null}
  </View>
);

export const StatTile = ({ value, label, inverse, style }) => (
  <View style={[styles.statTile, inverse && styles.statTileInverse, style]}>
    <Text style={[type.h2, { color: inverse ? colors.onPrimary : colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    <Text style={[type.caption, styles.statLabel, { color: inverse ? colors.onPrimaryMuted : colors.textMuted }]} numberOfLines={2}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  row: { flexDirection: 'row', alignItems: 'center' },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.55 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.surface,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadow.card,
  },
  cardPadded: { padding: spacing.lg },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: spacing.xs },

  gradientHeaderWrap: {
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  gradientHeader: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
  },
  gradientHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  decorCircleLg: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -60,
  },
  decorCircleSm: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -50,
    left: -30,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexShrink: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 50,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 0, height: '100%' },

  field: { marginBottom: spacing.lg },
  fieldLabel: { ...type.smallStrong, color: colors.textSecondary, marginBottom: 6 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldBoxMultiline: { alignItems: 'flex-start', paddingVertical: 12, minHeight: 110 },
  fieldBoxFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  fieldBoxError: { borderColor: colors.danger, backgroundColor: '#FFFBFA' },
  fieldInput: { flex: 1, color: colors.text, paddingVertical: 0, minHeight: 48 },
  fieldInputMultiline: { minHeight: 86, textAlignVertical: 'top' },
  fieldMessage: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },

  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.gutter,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hitSize + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  optionRowSelected: { backgroundColor: colors.primarySoft },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  listRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.xxl },

  statTile: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statLabel: { marginTop: 2, textAlign: 'center', fontSize: 11, lineHeight: 14 },
  statTileInverse: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
