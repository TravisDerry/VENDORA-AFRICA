// Shows a business's owner key so the owner can keep it safe or use it on another phone.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button } from './ui';

export const OwnerKeyCard = ({ businessName, ownerKey, style }) => {
  const [done, setDone] = useState('');

  const save = async () => {
    const message = `Vendora Africa owner key for ${businessName}:\n${ownerKey}\n\nKeep this private. You need it to manage your business on another phone.`;
    try {
      if (Platform.OS === 'web' && navigator.clipboard && !navigator.share) {
        await navigator.clipboard.writeText(ownerKey);
        setDone('Copied. Paste it somewhere safe.');
        return;
      }
      await Share.share({ message, title: 'Vendora owner key' });
      setDone('');
    } catch (e) {
      setDone('Could not open sharing. Press and hold the key to copy it.');
    }
  };

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.head}>
        <Ionicons name="key" size={18} color={colors.warning} />
        <Text style={[type.title, { color: colors.text, flex: 1 }]}>Your owner key</Text>
      </View>
      <Text style={[type.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        This phone already has it saved. To manage {businessName} on another phone, open Account › Manage my business there and enter this key.
      </Text>
      <View style={styles.keyBox}>
        <Text selectable style={styles.key}>{ownerKey}</Text>
      </View>
      <Button title="Save / share key" icon="share-outline" variant="outline" size="md" onPress={save} />
      {done ? <Text style={[type.caption, { color: colors.success, marginTop: spacing.xs, textAlign: 'center' }]}>{done}</Text> : null}
      <View style={styles.warn}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.warning} />
        <Text style={[type.caption, { color: colors.warning, flex: 1 }]}>Keep it private: anyone with this key can change your products and where your payments go.</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { borderColor: '#F1D9A8' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  keyBox: {
    marginVertical: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  key: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 15, color: colors.text, textAlign: 'center' },
  warn: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.md },
});
