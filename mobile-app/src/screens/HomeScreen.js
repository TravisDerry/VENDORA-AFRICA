import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HomeScreen = ({ route }) => {
  const navigation = useNavigation();
  const { businesses } = route.params;
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All categories', icon: 'grid-outline' },
    { id: 'phones', name: 'Phones & electronics', icon: 'phone-portrait-outline' },
    { id: 'cosmetics', name: 'Cosmetics & beauty', icon: 'sparkles-outline' },
    { id: 'fashion', name: 'Fashion & clothing', icon: 'shirt-outline' },
    { id: 'food', name: 'Food & grocery', icon: 'restaurant-outline' },
    { id: 'hardware', name: 'Hardware', icon: 'build-outline' },
  ];

  const stats = [
    { number: '50,000+', label: 'Businesses by Year 3' },
    { number: '54', label: 'African countries' },
    { number: 'Free', label: 'To register' },
    { number: 'GHS 30', label: 'Starting plan' },
  ];

  const features = [
    {
      icon: 'gift-outline',
      title: 'Free to register',
      description: 'Create your business profile at zero cost'
    },
    {
      icon: 'phone-portrait-outline',
      title: 'Mobile Money payments',
      description: 'Accept MTN MoMo, Vodafone Cash, and more'
    },
    {
      icon: 'location-outline',
      title: 'Online + physical hubs',
      description: 'Reach customers online and offline'
    },
    {
      icon: 'chart-bar-outline',
      title: 'Sales analytics',
      description: 'Track sales and grow smarter'
    },
  ];

  const filteredBusinesses = selectedCategory === 'all' 
    ? businesses 
    : businesses.filter(b => b.category === selectedCategory);

  const handleBusinessPress = (business) => {
    navigation.navigate('BusinessDetail', { business });
  };

  const handleCategoryPress = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleRegisterPress = () => {
    navigation.navigate('Register');
  };

  const handleBrowsePress = () => {
    navigation.navigate('Browse');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#1B4F72', '#2E86C1']}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Africa's business marketplace</Text>
          </View>
          <Text style={styles.heroTitle}>Every business.</Text>
          <Text style={styles.heroTitle}>Every corner.</Text>
          <Text style={styles.heroTitle}>One platform.</Text>
          <Text style={styles.heroSubtitle}>
            Connect your business with millions across Africa
          </Text>
          
          <View style={styles.heroButtons}>
            <TouchableOpacity 
              style={styles.heroButtonPrimary}
              onPress={handleRegisterPress}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.heroButtonText}>List your business free</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.heroButtonSecondary}
              onPress={handleBrowsePress}
            >
              <Ionicons name="search-outline" size={20} color="#fff" />
              <Text style={styles.heroButtonText}>Browse businesses</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Text style={styles.statNumber}>{stat.number}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by category</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                selectedCategory === category.id && styles.categoryPillActive
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <Ionicons 
                name={category.icon} 
                size={16} 
                color={selectedCategory === category.id ? '#1B4F72' : '#64748b'} 
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Businesses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured businesses</Text>
        <View style={styles.businessesGrid}>
          {filteredBusinesses.slice(0, 4).map((business) => (
            <TouchableOpacity
              key={business.id}
              style={styles.businessCard}
              onPress={() => handleBusinessPress(business)}
            >
              <View style={styles.businessHeader}>
                <View style={styles.businessEmoji}>
                  <Text style={styles.emojiText}>{getCategoryEmoji(business.category)}</Text>
                </View>
                <View style={styles.businessBadge}>
                  <Text style={styles.badgeText}>{business.badge}</Text>
                </View>
              </View>
              <View style={styles.businessBody}>
                <Text style={styles.businessName}>{business.name}</Text>
                <Text style={styles.businessType}>{business.type}</Text>
                <View style={styles.businessMeta}>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color="#BA7517" />
                    <Text style={styles.ratingText}>{business.rating}</Text>
                  </View>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#1B4F72" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.seeAllButton}
          onPress={handleBrowsePress}
        >
          <Text style={styles.seeAllText}>See all businesses</Text>
          <Ionicons name="arrow-forward" size={16} color="#1B4F72" />
        </TouchableOpacity>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why choose VENDORA AFRICA</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={28} color="#1B4F72" />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const getCategoryEmoji = (category) => {
  const emojis = {
    phones: 'Mobile phones, laptops, accessories',
    cosmetics: 'Makeup, skincare, beauty products',
    fashion: 'Traditional and modern clothing',
    food: 'Local dishes, groceries',
    hardware: 'Tools, building materials'
  };
  return emojis[category] || 'General business';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  heroBadgeText: {
    color: '#85B7EB',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#B5D4F4',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  heroButtonPrimary: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroButtonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsSection: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 12,
  },
  categoryPillActive: {
    backgroundColor: '#E6F1FB',
    borderColor: '#2E86C1',
  },
  categoryText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#1B4F72',
  },
  businessesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  businessCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  businessHeader: {
    height: 80,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  businessEmoji: {
    fontSize: 24,
  },
  emojiText: {
    fontSize: 32,
  },
  businessBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1B4F72',
  },
  businessBody: {
    padding: 16,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  businessMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#BA7517',
    marginLeft: 4,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 10,
    color: '#1B4F72',
    marginLeft: 4,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#1B4F72',
    fontWeight: '600',
    marginRight: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  featureIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#E6F1FB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
});

export default HomeScreen;
