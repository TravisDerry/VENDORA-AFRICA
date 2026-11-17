// Terms of Use and Privacy Policy (text in src/data/legal.js).
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Touchable, Button, useStatusBar } from '../components/ui';
import { TERMS, PRIVACY, LEGAL_UPDATED } from '../data/legal';

const LegalScreen = ({ route, navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(route.params?.tab === 'privacy' ? 'privacy' : 'terms');
  const sections = tab === 'terms' ? TERMS : PRIVACY;

  return (
    <View style={styles.container}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {[
          { id: 'terms', label: 'Terms of Use' },
          { id: 'privacy', label: 'Privacy Policy' },
        ].map((t) => {
          const on = tab === t.id;
          return (
            <Touchable key={t.id} onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[type.smallStrong, { color: on ? colors.onPrimary : colors.textSecondary, textAlign: 'center' }]}>{t.label}</Text>
            </Touchable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + spacing.xxxl }}>
        <Text style={[type.h2, { color: colors.text }]}>{tab === 'terms' ? 'Terms of Use' : 'Privacy Policy'}</Text>
        <Text style={[type.caption, { color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg }]}>Last updated {LEGAL_UPDATED}</Text>
        {sections.map((s) => (
          <Card key={s.title} style={{ marginBottom: spacing.md }}>
            <Text style={[type.title, { color: colors.text, marginBottom: spacing.xs }]}>{s.title}</Text>
            {s.body.map((p, i) => (
              <Text key={i} style={[type.small, { color: colors.textSecondary, marginTop: i ? spacing.sm : 0, lineHeight: 20 }]}>{p}</Text>
            ))}
          </Card>
        ))}
        <Card style={styles.contact}>
          <Text style={[type.small, { color: colors.text, flex: 1 }]}>Questions about these terms or your information?</Text>
          <Button title="Contact us" icon="help-buoy-outline" size="sm" fullWidth={false} onPress={() => navigation.navigate('Help')} />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    margin: spacing.gutter,
    marginBottom: 0,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.primary },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted },
});

export default LegalScreen;
