import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    phoneNumber: '',
    businessCategory: '',
    country: 'ghana',
    email: '',
    businessDescription: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    'Phones & electronics',
    'Cosmetics & beauty',
    'Fashion & clothing',
    'Food & grocery',
    'Hardware & building',
    'Aluminum & glass works',
    'Education',
    'Other'
  ];

  const countries = [
    { code: 'ghana', name: 'Ghana' },
    { code: 'nigeria', name: 'Nigeria' },
    { code: 'kenya', name: 'Kenya' },
    { code: 'senegal', name: 'Senegal' },
    { code: 'ivorycoast', name: 'Ivory Coast' },
    { code: 'other', name: 'Other' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    if (!formData.businessCategory) {
      newErrors.businessCategory = 'Please select a business category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Registration Successful!',
        `Welcome to VENDORA AFRICA, ${formData.firstName}! Your business "${formData.businessName}" has been registered successfully.\n\nNext steps:\n1. Choose your pricing plan\n2. Set up your business profile\n3. Start listing your products`,
        [
          {
            text: 'Choose Plan',
            onPress: () => {
              // Navigate to pricing screen
              console.log('Navigate to pricing');
            },
          },
          {
            text: 'Later',
            style: 'cancel',
          },
        ]
      );
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        businessName: '',
        phoneNumber: '',
        businessCategory: '',
        country: 'ghana',
        email: '',
        businessDescription: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (placeholder, field, keyboardType = 'default', multiline = false) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{placeholder}</Text>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.textInputMultiline,
          errors[field] && styles.textInputError
        ]}
        placeholder={placeholder}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderPicker = (placeholder, field, options) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{placeholder}</Text>
      <View style={[styles.pickerContainer, errors[field] && styles.textInputError]}>
        <Text style={[styles.pickerText, !formData[field] && styles.pickerPlaceholder]}>
          {formData[field] || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748b" />
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#1B4F72', '#2E86C1']}
        style={styles.headerSection}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Register your business</Text>
          <Text style={styles.headerSubtitle}>
            Join thousands of businesses across Africa
          </Text>
          <View style={styles.freeBadge}>
            <Ionicons name="gift-outline" size={16} color="#3B6D11" />
            <Text style={styles.freeBadgeText}>Free registration</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.formSection}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Business Information</Text>
          
          {/* Personal Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.row}>
              {renderInput('First name', 'firstName')}
              {renderInput('Last name', 'lastName')}
            </View>
            {renderInput('Email address', 'email', 'email-address')}
          </View>

          {/* Business Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Business Details</Text>
            {renderInput('Business name', 'businessName')}
            {renderInput('Phone number', 'phoneNumber', 'phone-pad')}
            {renderInput('Business description', 'businessDescription', 'default', true)}
            
            {renderPicker('Business category', 'businessCategory', categories)}
            {renderPicker('Country', 'country', countries.map(c => c.name))}
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsSection}>
            <TouchableOpacity style={styles.termsCheckbox}>
              <View style={styles.checkbox}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Register my business free</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.noteText}>
            No credit card required. Choose your plan after registration.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B5D4F4',
    textAlign: 'center',
    marginBottom: 20,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF3DE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  freeBadgeText: {
    color: '#3B6D11',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  formSection: {
    padding: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  pickerText: {
    fontSize: 16,
    color: '#0f172a',
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#94a3b8',
  },
  termsSection: {
    marginVertical: 20,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    backgroundColor: '#1B4F72',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  termsText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B4F72',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default RegisterScreen;
