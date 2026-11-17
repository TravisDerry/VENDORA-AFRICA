// Owner-facing card: free month / paid / ending soon / hidden, with a "Pay" button.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button } from './ui';

export const shortDate = (d) => {
  try {
    return d ? new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  } catch (e) {
    return '';
  }
};

const days = (n) => `${n} day${n === 1 ? '' : 's'}`;

// Text and colours for each listing state
export const describeListing = (listing) => {
  if (!listing) return null;
  const price = `GHS ${listing.monthlyPrice}`;
  switch (listing.status) {
    case 'trial':
      return {
        tone: listing.daysLeft <= 7 ? 'warning' : 'primary',
        icon: 'gift-outline',
        title: `Free month: ${days(listing.daysLeft)} left`,
        text: `Free until ${shortDate(listing.endsAt)}. After that your listing is ${price}/month. Pay early and your paid month starts when the free one ends.`,
        cta: `Pay ${price} for next month`,
      };
    case 'active':
      if (!listing.endsAt) return null;
      return {
        tone: listing.daysLeft <= 5 ? 'warning' : 'success',
        icon: 'checkmark-circle-outline',
        title: `Listing paid: ${days(listing.daysLeft)} left`,
        text: `Paid until ${shortDate(listing.endsAt)}. ${price}/month. Paying now adds another month.`,
        cta: `Add a month (${price})`,
      };
    case 'grace':
      return {
        tone: 'danger',
        icon: 'alert-circle-outline',
        title: `Payment due: hidden in ${days(listing.daysLeft)}`,
        text: `Your month ended on ${shortDate(listing.endsAt)}. Pay ${price} before ${shortDate(listing.graceEndsAt)} or customers will stop seeing your business.`,
        cta: `Pay ${price} now`,
      };
    case 'expired':
      return {
        tone: 'danger',
        icon: 'eye-off-outline',
        title: 'Hidden from customers',
        text: `Your listing is not showing in the app. Pay ${price} to show your business and products again straight away.`,
        cta: `Pay ${price} and go live`,
      };
    default:
      return null;
  }
};

const TONES = {
  primary: { bg: colors.primarySoft, border: colors.primaryMuted, fg: colors.primary },
  success: { bg: colors.successSoft, border: '#CFE3BA', fg: colors.success },
  warning: { bg: colors.warningSoft, border: '#F1D9A8', fg: colors.warning },
  danger: { bg: colors.dangerSoft, border: '#F2C4C4', fg: colors.danger },
};

export const ListingStatusCard = ({ listing, onPay, style }) => {
  const d = describeListing(listing);
  if (!d) return null;
  const t = TONES[d.tone];
  return (
    <Card style={[{ backgroundColor: t.bg, borderColor: t.border }, style]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.surface }]}>
          <Ionicons name={d.icon} size={20} color={t.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.title, { color: t.fg }]}>{d.title}</Text>
          <Text style={[type.small, { color: colors.textSecondary, marginTop: 2 }]}>{d.text}</Text>
        </View>
      </View>
      {onPay ? (
        <Button title={d.cta} icon="wallet-outline" size="md" variant={d.tone === 'danger' ? 'primary' : 'outline'} onPress={onPay} style={{ marginTop: spacing.md }} />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});

// Owner-facing card while a new business waits for the Vendora team's approval
export const PendingApprovalCard = ({ phone, style }) => {
  const t = TONES.warning;
  return (
    <Card style={[{ backgroundColor: t.bg, borderColor: t.border }, style]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.surface }]}>
          <Ionicons name="hourglass-outline" size={20} color={t.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.title, { color: t.fg }]}>Waiting for approval</Text>
          <Text style={[type.small, { color: colors.textSecondary, marginTop: 2 }]}>
            Customers can't see your business yet. The Vendora team will call you{phone ? ` on ${phone}` : ''} to confirm it's real.
            Meanwhile, add your products, photos and opening hours. Your free month starts on the day you're approved.
          </Text>
        </View>
      </View>
    </Card>
  );
};
