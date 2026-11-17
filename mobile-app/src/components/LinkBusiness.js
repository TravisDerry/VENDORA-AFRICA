import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type } from '../theme';
import { Card, Button, TextField, Touchable } from './ui';
import { API_BASE_URL } from '../config';
import { saveOwnerKey } from '../utils/ownerKeys';
import { readJson, networkMessage } from './MomoPayment';

// Find your business by name and enter its owner key, so this phone can manage it
// (pay its plan, add products, receive MoMo payments). Pass initialBusiness to skip the search.
const LinkBusiness = ({ onLinked, onCancel, initialBusiness, title = 'Which business is paying?', submitLabel = 'Continue to payment' }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(initialBusiness ? { id: String(initialBusiness.id), name: initialBusiness.name } : null);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const find = async () => {
    const q = search.trim();
    if (q.length < 2) return setError('Type at least 2 letters of your business name.');
    setError('');
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/businesses?search=${encodeURIComponent(q)}&limit=10`);
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || 'Search failed');
      setResults((json.businesses || []).map((b) => ({ id: String(b._id || b.id), name: b.businessName, city: b.location?.city || '' })));
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const verify = async () => {
    const k = key.trim();
    if (!k) return setError('Enter the owner key for this business.');
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/businesses/${picked.id}/verify-key`, { method: 'POST', headers: { 'X-Manage-Key': k } });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || 'That key is not valid for this business.');
      await saveOwnerKey(picked.id, k, picked.name);
      onLinked(picked);
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={[type.h3, { color: colors.text }]}>{picked ? picked.name : title}</Text>
      <Text style={[type.small, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {picked
          ? 'Enter the owner key for this business. It is the long code you got when you registered, or from Vendora support.'
          : 'Search for your registered business by name.'}
      </Text>
      {!picked ? (
        <>
          <TextField label="Business name" icon="search-outline" value={search} onChangeText={setSearch} placeholder="e.g. Kankey man" returnKeyType="search" onSubmitEditing={find} style={{ marginTop: spacing.lg }} />
          <Button title="Search" icon="search-outline" loading={searching} onPress={find} />
          {results && results.length === 0 ? (
            <Text style={[type.small, { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' }]}>No business found with that name.</Text>
          ) : null}
          {results && results.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              {results.map((b, i) => (
                <Touchable key={b.id} onPress={() => { setPicked(b); setError(''); }} accessibilityRole="button" style={[styles.bizRow, i > 0 && styles.divider]}>
                  <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>{b.name}</Text>
                    {b.city ? <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>{b.city}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
                </Touchable>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <TextField label="Owner key" icon="key-outline" value={key} onChangeText={setKey} placeholder="Paste your owner key" autoCapitalize="none" autoCorrect={false} secureTextEntry style={{ marginTop: spacing.lg }} />
          <Button title={submitLabel} iconRight="arrow-forward" loading={busy} onPress={verify} />
          <Touchable onPress={() => { setPicked(null); setKey(''); setError(''); }} accessibilityRole="button" style={{ alignSelf: 'center', padding: spacing.sm, marginTop: spacing.sm }}>
            <Text style={[type.smallStrong, { color: colors.primary }]}>Choose a different business</Text>
          </Touchable>
        </>
      )}
      {error ? <Text style={[type.small, styles.error]}>{error}</Text> : null}
      {onCancel ? (
        <Touchable onPress={onCancel} accessibilityRole="button" style={{ alignSelf: 'center', padding: spacing.sm }}>
          <Text style={[type.smallStrong, { color: colors.textMuted }]}>Cancel</Text>
        </Touchable>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
});

export default LinkBusiness;
