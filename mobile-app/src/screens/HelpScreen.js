// Help & support: contact Vendora (WhatsApp / call / email from the backend settings), answers to
// common questions, and a message form that is saved on the server with a reference number.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Linking, LayoutAnimation, UIManager, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { Card, Button, TextField, Touchable, Chip, SectionHeader, useStatusBar } from '../components/ui';
import { API_BASE_URL } from '../config';
import { getOwnedBusinesses } from '../utils/ownerKeys';
import { readJson, networkMessage } from '../components/MomoPayment';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TOPICS = [
  { id: 'account', label: 'Owner key / account' },
  { id: 'payments', label: 'Payments' },
  { id: 'listing', label: 'My listing' },
  { id: 'orders', label: 'An order' },
  { id: 'report', label: 'Report a business' },
  { id: 'other', label: 'Something else' },
];

const FAQS = [
  { q: 'How do I list my business?', a: 'Tap "List business" at the bottom of the app and fill in the form. It is free. The Vendora team then calls you to confirm your business is real; once approved, customers can see it and your free month starts.' },
  { q: "Why can't customers see my business yet?", a: 'New businesses are checked by the Vendora team before they go live, to keep customers safe. You will get a call on the number you registered with. Meanwhile you can add products, photos and opening hours. To speed it up, send us a message with the topic "My listing".' },
  { q: 'What is an owner key?', a: 'A private code that proves you own a business on Vendora. It is shown after you register and saved on that phone. To manage your business on another phone, open Account › Manage my business and enter it. You can see it again by tapping the key button in Manage my business.' },
  { q: 'I lost my owner key. What do I do?', a: 'Send us a message below with the topic "Owner key / account", your business name and the phone number you registered with. After we confirm it is you, we will give you a new key. The old one then stops working.' },
  { q: 'How do customers pay me?', a: 'Open your business page › Products › "Turn on MoMo payments" and enter the MoMo number where you want to receive money. Customers then see Buy and Pay buttons, and payments go straight to your MoMo through Paystack.' },
  { q: 'How much does a listing cost?', a: 'Your first month is free. After that the monthly price depends on your type of business (see Pricing). You pay with MoMo when you choose; nothing is charged automatically.' },
  { q: 'Why is my business hidden?', a: 'Your free or paid month ended more than 7 days ago. Pay your monthly listing from your business page or Account, and it shows again straight away.' },
  { q: 'I paid a business but have a problem with my order.', a: 'Payments go directly to the business, so contact them first using Call or Message in Account › My orders. If they do not help or you think it is fraud, send us a message with the topic "Report a business" and your payment reference.' },
  { q: 'What does the Verified ✓ badge mean?', a: 'The Vendora team has checked that the business is real, usually by calling the owner or visiting. Every business customers can see on Vendora has been checked this way.' },
  { q: 'How do I add photos?', a: 'On your business page, tap the camera button at the top for your cover photo. When adding a product, tap "Add photo".' },
];

const HelpScreen = ({ navigation }) => {
  useStatusBar('dark');
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  const [openFaq, setOpenFaq] = useState(-1);

  const [form, setForm] = useState({ name: '', phone: '', email: '', businessName: '', message: '' });
  const [topic, setTopic] = useState('other');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sentRef, setSentRef] = useState(null);
  const [sendError, setSendError] = useState('');

  useFocusEffect(useCallback(() => {
    fetch(`${API_BASE_URL}/api/support/info`).then(readJson).then(setInfo).catch(() => setInfo({}));
    getOwnedBusinesses().then((l) => { if (l[0]) setForm((f) => (f.businessName ? f : { ...f, businessName: l[0].name })); });
  }, []));

  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };

  const toggleFaq = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq(openFaq === i ? -1 : i);
  };

  const open = (url) => Linking.openURL(url).catch(() => {});
  // 0256437789 style for people to read
  const local = (n) => String(n).replace(/^\+?233/, '0').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
  const phones = info?.phones?.length ? info.phones : info?.phone ? [info.phone] : [];
  const callUs = () => {
    if (phones.length <= 1) return open(`tel:${phones[0]}`);
    if (Platform.OS === 'web') {
      const list = phones.map((p, i) => `${i + 1}. ${local(p)}`).join('\n');
      const pick = window.prompt(`Which number?\n${list}`, '1');
      const n = phones[Number(pick) - 1];
      if (n) open(`tel:${n}`);
      return;
    }
    Alert.alert('Call Vendora Africa', 'Choose a number', [
      ...phones.map((p) => ({ text: local(p), onPress: () => open(`tel:${p}`) })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const contacts = [
    info?.whatsapp && { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#1FA855', onPress: () => open(`https://wa.me/${info.whatsapp}?text=${encodeURIComponent('Hello Vendora Africa, I need help with ')}`) },
    phones.length && { icon: 'call', label: 'Call us', color: colors.primary, onPress: callUs },
    info?.email && { icon: 'mail', label: 'Email', color: colors.accent, onPress: () => open(`mailto:${info.email}?subject=${encodeURIComponent('Vendora Africa help')}`) },
  ].filter(Boolean);

  const send = async () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!form.phone.trim() && !form.email.trim()) e.phone = 'Add a phone number or email so we can reply';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.message.trim().length < 10) e.message = 'Please tell us a little more (at least 10 characters)';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          businessName: form.businessName.trim() || undefined,
          topic,
          message: form.message.trim(),
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || 'Could not send your message');
      setSentRef(json.reference);
      setForm((f) => ({ ...f, message: '' }));
    } catch (err) {
      setSendError(networkMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + spacing.xxxl }} keyboardShouldPersistTaps="handled">
        {/* Contact */}
        <Card style={styles.hero}>
          <Text style={[type.h3, { color: colors.text }]}>How can we help?</Text>
          <Text style={[type.small, { color: colors.textMuted, marginTop: 2 }]}>
            {contacts.length ? `Reach the Vendora Africa team directly${info?.hours ? ` (${info.hours})` : ''}, or send us a message below.` : 'Send us a message below and we will get back to you.'}
          </Text>
          {phones.length || info?.email ? (
            <Text selectable style={[type.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {[phones.map(local).join(' / '), info?.email].filter(Boolean).join('  ·  ')}
            </Text>
          ) : null}
          {contacts.length ? (
            <View style={styles.contacts}>
              {contacts.map((c) => (
                <Touchable key={c.label} onPress={c.onPress} accessibilityRole="button" accessibilityLabel={c.label} style={styles.contact}>
                  <View style={[styles.contactIcon, { backgroundColor: c.color }]}>
                    <Ionicons name={c.icon} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={[type.smallStrong, { color: colors.text }]}>{c.label}</Text>
                </Touchable>
              ))}
            </View>
          ) : null}
        </Card>

        {/* FAQ */}
        <SectionHeader title="Common questions" style={{ marginTop: spacing.xl }} />
        <Card padded={false}>
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <Touchable key={f.q} onPress={() => toggleFaq(i)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={[styles.faq, i > 0 && styles.divider]}>
                <View style={styles.faqHead}>
                  <Text style={[type.title, { color: colors.text, flex: 1 }]}>{f.q}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </View>
                {isOpen ? <Text style={[type.small, { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 }]}>{f.a}</Text> : null}
              </Touchable>
            );
          })}
        </Card>

        {/* Message form */}
        <SectionHeader title="Send us a message" style={{ marginTop: spacing.xl }} />
        {sentRef ? (
          <Card style={styles.sent}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            <Text style={[type.h3, { color: colors.text, marginTop: spacing.sm }]}>Message sent</Text>
            <Text style={[type.small, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              We'll reply to {form.phone || form.email}. Your reference is
            </Text>
            <Text selectable style={styles.ref}>{sentRef}</Text>
            <Button title="Send another message" variant="outline" size="md" onPress={() => setSentRef(null)} style={{ marginTop: spacing.md }} />
          </Card>
        ) : (
          <Card>
            <Text style={styles.label}>What is it about?</Text>
            <View style={styles.topics}>
              {TOPICS.map((t) => <Chip key={t.id} label={t.label} selected={topic === t.id} onPress={() => setTopic(t.id)} />)}
            </View>
            <TextField label="Your name" icon="person-outline" value={form.name} onChangeText={set('name')} placeholder="e.g. Ama Mensah" error={errors.name} style={{ marginTop: spacing.md }} />
            <TextField label="Phone number" icon="call-outline" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="024 123 4567" error={errors.phone} style={{ marginTop: spacing.md }} />
            <TextField label="Email (optional)" icon="mail-outline" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" error={errors.email} style={{ marginTop: spacing.md }} />
            <TextField label="Business name (if you own one)" icon="storefront-outline" value={form.businessName} onChangeText={set('businessName')} placeholder="Optional" style={{ marginTop: spacing.md }} />
            <TextField label="Message" value={form.message} onChangeText={set('message')} multiline maxLength={1500} placeholder="Tell us what happened or what you need" error={errors.message} style={{ marginTop: spacing.md }} />
            {sendError ? <Text style={[type.small, { color: colors.danger, textAlign: 'center', marginTop: spacing.sm }]}>{sendError}</Text> : null}
            <Button title="Send message" icon="send" loading={sending} onPress={send} style={{ marginTop: spacing.md }} />
          </Card>
        )}

        <Touchable onPress={() => navigation.navigate('Legal')} accessibilityRole="link" style={{ alignSelf: 'center', padding: spacing.md, marginTop: spacing.sm }}>
          <Text style={[type.smallStrong, { color: colors.primary }]}>Terms of Use & Privacy Policy</Text>
        </Touchable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted },
  contacts: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  contact: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
  contactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  faq: { padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { ...type.smallStrong, color: colors.textSecondary, marginBottom: spacing.sm },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sent: { alignItems: 'center', paddingVertical: spacing.xl },
  ref: { fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: spacing.xs, letterSpacing: 0.5 },
});

export default HelpScreen;
