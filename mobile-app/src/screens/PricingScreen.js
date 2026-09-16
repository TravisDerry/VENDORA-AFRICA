import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PricingScreen = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'GHS 30',
      period: 'per month',
      description: 'Perfect for small businesses getting started',
      badge: null,
      features: [
        { text: 'Business profile & storefront', included: true },
        { text: 'Up to 10 product listings', included: true },
        { text: 'Mobile Money integration', included: true },
        { text: 'Customer reviews & ratings', included: true },
        { text: 'Inventory management', included: false },
        { text: 'Sales analytics', included: false },
      ],
      color: '#64748b',
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 'GHS 70',
      period: 'per month',
      description: 'Great for growing businesses',
      badge: 'Most popular',
      features: [
        { text: 'Everything in Basic', included: true },
        { text: 'Up to 50 product listings', included: true },
        { text: 'Inventory management tools', included: true },
        { text: 'Priority search ranking', included: true },
        { text: 'Sales analytics & reports', included: true },
        { text: 'Featured homepage placement', included: false },
      ],
      color: '#1B4F72',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'GHS 150',
      period: 'per month',
      description: 'For established businesses scaling up',
      badge: null,
      features: [
        { text: 'Everything in Standard', included: true },
        { text: 'Unlimited product listings', included: true },
        { text: 'Featured homepage placement', included: true },
        { text: 'Advertising & promo tools', included: true },
        { text: 'Delivery partnership access', included: true },
        { text: 'Dedicated customer support', included: true },
      ],
      color: '#2E86C1',
    },
  ];

  const faqs = [
    {
      question: 'Can I change my plan later?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.',
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept Mobile Money (MTN MoMo, Vodafone Cash, Orange Money, M-Pesa) and bank transfers.',
    },
    {
      question: 'Is there a contract?',
      answer: 'No contracts! You can cancel your subscription at any time with no penalties.',
    },
    {
      question: 'Do you offer discounts?',
      answer: 'Yes! We offer 20% off for annual subscriptions and special rates for startups.',
    },
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan.id);
    Alert.alert(
      'Plan Selected',
      `You've selected the ${plan.name} plan (${plan.price}/${plan.period}). Would you like to proceed with registration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => handleProceed(plan) },
      ]
    );
  };

  const handleProceed = (plan) => {
    Alert.alert(
      'Registration Required',
      'Please complete your business registration first to activate this plan.',
      [{ text: 'OK' }]
    );
  };

  const renderPlanCard = (plan) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planCard,
        plan.badge && styles.featuredPlanCard,
        selectedPlan === plan.id && styles.selectedPlanCard
      ]}
      onPress={() => handlePlanSelect(plan)}
    >
      {plan.badge && (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{plan.badge}</Text>
        </View>
      )}
      
      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planPrice}>{plan.price}</Text>
      <Text style={styles.planPeriod}>{plan.period}</Text>
      <Text style={styles.planDescription}>{plan.description}</Text>
      
      <View style={styles.planFeatures}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <View style={[
              styles.featureIcon,
              feature.included ? styles.featureIncluded : styles.featureExcluded
            ]}>
              <Ionicons 
                name={feature.included ? 'checkmark' : 'close'} 
                size={12} 
                color={feature.included ? '#fff' : '#fff'} 
              />
            </View>
            <Text style={[
              styles.featureText,
              !feature.included && styles.featureExcludedText
            ]}>
              {feature.text}
            </Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity style={[
        styles.planButton,
        plan.badge && styles.planButtonPrimary,
        selectedPlan === plan.id && styles.planButtonSelected
      ]}>
        <Text style={[
          styles.planButtonText,
          plan.badge && styles.planButtonTextPrimary,
          selectedPlan === plan.id && styles.planButtonTextSelected
        ]}>
          {selectedPlan === plan.id ? 'Selected' : 'Get started'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFAQ = (faq, index) => (
    <View key={index} style={styles.faqCard}>
      <Text style={styles.faqQuestion}>{faq.question}</Text>
      <Text style={styles.faqAnswer}>{faq.answer}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#1B4F72', '#2E86C1']}
        style={styles.headerSection}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Simple, affordable plans</Text>
          <Text style={styles.headerSubtitle}>
            Register free. Then choose the plan that fits your business. Cancel anytime.
          </Text>
        </View>
      </LinearGradient>

      {/* Pricing Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionTitle}>Choose your plan</Text>
        {plans.map(renderPlanCard)}
      </View>

      {/* Features Comparison */}
      <View style={styles.comparisonSection}>
        <Text style={styles.sectionTitle}>Compare all features</Text>
        <View style={styles.comparisonTable}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonFeature}>Features</Text>
            <Text style={styles.comparisonPlan}>Basic</Text>
            <Text style={styles.comparisonPlan}>Standard</Text>
            <Text style={styles.comparisonPlan}>Premium</Text>
          </View>
          
          {[
            'Product listings',
            'Mobile Money',
            'Analytics',
            'Priority ranking',
            'Homepage placement',
            'Dedicated support'
          ].map((feature, index) => (
            <View key={index} style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>{feature}</Text>
              <View style={styles.comparisonCell}>
                <Ionicons 
                  name={index < 2 ? 'checkmark' : 'close'} 
                  size={16} 
                  color={index < 2 ? '#3B6D11' : '#A32D2D'} 
                />
              </View>
              <View style={styles.comparisonCell}>
                <Ionicons 
                  name={index < 5 ? 'checkmark' : 'close'} 
                  size={16} 
                  color={index < 5 ? '#3B6D11' : '#A32D2D'} 
                />
              </View>
              <View style={styles.comparisonCell}>
                <Ionicons name="checkmark" size={16} color="#3B6D11" />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map(renderFAQ)}
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Ready to get started?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of African businesses growing with VENDORA AFRICA
          </Text>
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Start free registration</Text>
          </TouchableOpacity>
          <Text style={styles.ctaNote}>
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
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B5D4F4',
    textAlign: 'center',
    lineHeight: 24,
  },
  plansSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: 20,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredPlanCard: {
    borderColor: '#2E86C1',
    transform: [{ scale: 1.02 }],
  },
  selectedPlanCard: {
    borderColor: '#1B4F72',
    backgroundColor: '#f0f8ff',
  },
  planBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#2E86C1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: 8,
    textAlign: 'center',
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: 4,
    textAlign: 'center',
  },
  planPeriod: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center',
  },
  planDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  planFeatures: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureIncluded: {
    backgroundColor: '#EAF3DE',
  },
  featureExcluded: {
    backgroundColor: '#FCEBEB',
  },
  featureText: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  featureExcludedText: {
    color: '#94a3b8',
  },
  planButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#1B4F72',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  planButtonPrimary: {
    backgroundColor: '#1B4F72',
  },
  planButtonSelected: {
    backgroundColor: '#1B4F72',
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
  },
  planButtonTextPrimary: {
    color: '#fff',
  },
  planButtonTextSelected: {
    color: '#fff',
  },
  comparisonSection: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
  },
  comparisonTable: {
    marginTop: 20,
  },
  comparisonHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  comparisonFeature: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4F72',
  },
  comparisonPlan: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4F72',
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  comparisonCell: {
    flex: 1,
    alignItems: 'center',
  },
  faqSection: {
    padding: 20,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  ctaSection: {
    padding: 20,
    paddingBottom: 40,
  },
  ctaCard: {
    backgroundColor: '#1B4F72',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#B5D4F4',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
  },
  ctaNote: {
    fontSize: 12,
    color: '#B5D4F4',
    textAlign: 'center',
  },
});

export default PricingScreen;
