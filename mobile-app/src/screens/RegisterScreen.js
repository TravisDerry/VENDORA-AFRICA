import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, type } from '../theme';
import {
  GradientHeader,
  Card,
  TextField,
  SelectField,
  BottomSheet,
  OptionRow,
  Button,
  Touchable,
  IconTile,
  useStatusBar,
} from '../components/ui';
import { buildBusinessPayload } from '../utils/registration';

import { API_BASE_URL } from '../config';
import { saveOwnerKey } from '../utils/ownerKeys';

const getApiBaseUrl = () => API_BASE_URL;

const CATEGORIES = [
  'Phones & electronics',
  'Cosmetics & beauty',
  'Fashion & clothing',
  'Food & grocery',
  'Hardware & building',
  'Aluminum & glass works',
  'Education',
  'Other',
];

const COUNTRIES = ['Ghana', 'Nigeria', 'Kenya', 'Senegal', 'Ivory Coast', 'Other'];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  businessName: '',
  phoneNumber: '',
  businessCategory: '',
  country: 'Ghana',
  email: '',
  businessDescription: '',
};

const PICKER_TITLES = {
  businessCategory: 'Business category',
  country: 'Country',
};

const RegisterScreen = ({ navigation, refreshBusinesses }) => {
  useStatusBar('light');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successState, setSuccessState] = useState(null);
  const [picker, setPicker] = useState({ visible: false, field: null, options: [] });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    if (!formData.businessCategory) newErrors.businessCategory = 'Please select a business category';
    if (!formData.country) newErrors.country = 'Please select a country';
    if (!acceptedTerms) newErrors.terms = 'Please accept the Terms of Use to continue';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = buildBusinessPayload(formData);

      const response = await fetch(`${getApiBaseUrl()}/api/businesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let result = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await response.json().catch(() => ({}));
      } else {
        await response.text();
      }

      if (!response.ok) {
        const message = result.errors?.[0]?.msg || result.error || 'Registration failed. Please try again.';
        throw new Error(message);
      }

      // Keep the owner key on this phone so the owner can add products later
      if (result.manageKey && result.business?.id) {
        await saveOwnerKey(result.business.id, result.manageKey, result.business.businessName);
      }

      if (refreshBusinesses) {
        await refreshBusinesses();
      }

      // The owner key is shown once on the success screen so the owner can keep a copy
      const registered = { firstName: formData.firstName, businessName: formData.businessName, ownerKey: result.manageKey, approvalRequired: result.approvalRequired !== false, phone: formData.phoneNumber };
      setFormData(EMPTY_FORM);
      setAcceptedTerms(false);

      try {
        navigation.navigate('RegistrationSuccess', registered);
      } catch (error) {
        // Navigation unavailable: show the in-screen success state instead
        setSuccessState(registered);
      }
    } catch (error) {
      const message = error?.message?.includes('Failed to fetch') || error?.message?.includes('Network request failed')
        ? 'We could not reach the server. Check your internet connection and try again.'
        : error.message || 'Registration failed. Please try again.';

      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (field, options) => setPicker({ visible: true, field, options });
  const closePicker = () => setPicker({ visible: false, field: null, options: [] });

  if (successState) {
    return (
      <View style={styles.container}>
        <GradientHeader title="You're live!" subtitle={`${successState.businessName} is now on Vendora Africa.`} />
        <View style={{ padding: spacing.gutter, gap: spacing.md }}>
          <Button title="See pricing" icon="pricetag-outline" onPress={() => navigation.navigate('Pricing')} />
          <Button title="Register another business" variant="outline" onPress={() => setSuccessState(null)} />
        </View>
      </View>
    );
  }

  const field = (label, key, props = {}) => (
    <TextField
      label={label}
      value={formData[key]}
      onChangeText={(v) => handleInputChange(key, v)}
      error={errors[key]}
      {...props}
    />
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      >
        <GradientHeader
          eyebrow="For business owners"
          title="List your business"
          subtitle="Join businesses across Ghana selling on Vendora Africa."
          compact
        >
          <View style={styles.perks}>
            {[
              { icon: 'gift-outline', label: 'Free to join' },
              { icon: 'time-outline', label: '2 minutes' },
              { icon: 'card-outline', label: 'No card needed' },
            ].map((p) => (
              <View key={p.label} style={styles.perk}>
                <Ionicons name={p.icon} size={14} color={colors.onPrimary} />
                <Text style={[type.caption, { color: colors.onPrimary, fontWeight: '600' }]}>{p.label}</Text>
              </View>
            ))}
          </View>
        </GradientHeader>

        <View style={styles.body}>
          {/* Owner */}
          <Card>
            <View style={styles.stepHeader}>
              <IconTile icon="person-outline" size={36} iconSize={18} rounded={radius.sm} />
              <View style={{ flex: 1 }}>
                <Text style={[type.overline, { color: colors.textMuted }]}>Step 1 of 2</Text>
                <Text style={[type.h3, { color: colors.text }]}>About you</Text>
              </View>
            </View>
            <View style={styles.row}>
              {field('First name', 'firstName', { placeholder: 'Ama', autoCapitalize: 'words', textContentType: 'givenName', autoComplete: 'name-given', style: styles.half })}
              {field('Last name', 'lastName', { placeholder: 'Mensah', autoCapitalize: 'words', textContentType: 'familyName', autoComplete: 'name-family', style: styles.half })}
            </View>
            {field('Email address', 'email', {
              placeholder: 'you@business.com',
              icon: 'mail-outline',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              autoCorrect: false,
              textContentType: 'emailAddress',
              autoComplete: 'email',
              style: { marginBottom: 0 },
            })}
          </Card>

          {/* Business */}
          <Card>
            <View style={styles.stepHeader}>
              <IconTile icon="business-outline" size={36} iconSize={18} rounded={radius.sm} />
              <View style={{ flex: 1 }}>
                <Text style={[type.overline, { color: colors.textMuted }]}>Step 2 of 2</Text>
                <Text style={[type.h3, { color: colors.text }]}>Your business</Text>
              </View>
            </View>
            {field('Business name', 'businessName', { placeholder: 'e.g. Glow Beauty Hub', icon: 'business-outline', autoCapitalize: 'words' })}
            {field('Phone number', 'phoneNumber', {
              placeholder: '+233 24 000 0000',
              icon: 'call-outline',
              keyboardType: 'phone-pad',
              textContentType: 'telephoneNumber',
              autoComplete: 'tel',
              hint: 'Customers will use this number to reach you.',
            })}
            <SelectField
              label="Business category"
              icon="pricetags-outline"
              value={formData.businessCategory}
              placeholder="Select a category"
              error={errors.businessCategory}
              onPress={() => openPicker('businessCategory', CATEGORIES)}
            />
            <SelectField
              label="Country"
              icon="globe-outline"
              value={formData.country}
              placeholder="Select a country"
              error={errors.country}
              onPress={() => openPicker('country', COUNTRIES)}
            />
            {field('Description (optional)', 'businessDescription', {
              placeholder: 'What do you sell? What makes you special?',
              multiline: true,
              numberOfLines: 4,
              maxLength: 500,
              style: { marginBottom: 0 },
            })}
          </Card>

          {/* Terms */}
          <Touchable
            onPress={() => {
              setAcceptedTerms((v) => !v);
              if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            style={styles.terms}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn, errors.terms && !acceptedTerms && styles.checkboxError]}>
              {acceptedTerms ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
            </View>
            <Text style={[type.small, { color: colors.textSecondary, flex: 1 }]}>
              I agree to the{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Legal', { tab: 'terms' })} accessibilityRole="link">Terms of Use</Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Legal', { tab: 'privacy' })} accessibilityRole="link">Privacy Policy</Text>
            </Text>
          </Touchable>
          {errors.terms ? <Text style={[type.caption, styles.termsError]}>{errors.terms}</Text> : null}

          <Button title="Create my free listing" icon="rocket-outline" loading={loading} onPress={handleSubmit} />
          <Text style={[type.caption, styles.note]}>No payment needed to register. Your first month is free.</Text>
        </View>
      </ScrollView>

      <BottomSheet visible={picker.visible} title={PICKER_TITLES[picker.field] || 'Select'} onClose={closePicker}>
        {picker.options.map((option) => (
          <OptionRow
            key={option}
            label={option}
            selected={formData[picker.field] === option}
            onPress={() => {
              handleInputChange(picker.field, option);
              closePicker();
            }}
          />
        ))}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  body: { padding: spacing.gutter, gap: spacing.lg },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  terms: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxError: { borderColor: colors.danger },
  link: { color: colors.primary, fontWeight: '700' },
  termsError: { color: colors.danger, marginTop: -spacing.sm },
  note: { color: colors.textMuted, textAlign: 'center', marginTop: -spacing.xs },
});

export default RegisterScreen;
