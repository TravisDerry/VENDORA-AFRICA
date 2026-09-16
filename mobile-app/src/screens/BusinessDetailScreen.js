import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Linking,
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BusinessDetailScreen = ({ route }) => {
  const { business } = route.params;
  const [activeTab, setActiveTab] = useState('about');

  const tabs = [
    { id: 'about', name: 'About', icon: 'information-circle-outline' },
    { id: 'products', name: 'Products', icon: 'grid-outline' },
    { id: 'reviews', name: 'Reviews', icon: 'star-outline' },
  ];

  const products = [
    { id: 1, name: 'iPhone 14 Pro', price: 'GHS 8,500', category: 'Smartphones' },
    { id: 2, name: 'Samsung Galaxy S23', price: 'GHS 7,200', category: 'Smartphones' },
    { id: 3, name: 'MacBook Air M2', price: 'GHS 12,000', category: 'Laptops' },
    { id: 4, name: 'AirPods Pro', price: 'GHS 1,200', category: 'Accessories' },
  ];

  const reviews = [
    { id: 1, author: 'John Doe', rating: 5, comment: 'Excellent service and quality products!', date: '2 weeks ago' },
    { id: 2, author: 'Jane Smith', rating: 4, comment: 'Good prices and fast delivery.', date: '1 month ago' },
    { id: 3, author: 'Mike Johnson', rating: 5, comment: 'Very reliable business. Highly recommended!', date: '2 months ago' },
  ];

  const handleCall = () => {
    Alert.alert(
      'Call Business',
      `Would you like to call ${business.name} at ${business.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${business.phone}`) },
      ]
    );
  };

  const handleMessage = () => {
    Alert.alert(
      'Send Message',
      'Messaging feature coming soon!',
      [{ text: 'OK' }]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${business.name} - ${business.type} on VENDORA AFRICA! Located at ${business.location}. Contact: ${business.phone}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleDirections = () => {
    Alert.alert(
      'Get Directions',
      'Map integration coming soon!',
      [{ text: 'OK' }]
    );
  };

  const renderAboutTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color="#1B4F72" />
          <Text style={styles.infoText}>{business.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="phone-portrait-outline" size={20} color="#1B4F72" />
          <Text style={styles.infoText}>{business.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={20} color="#1B4F72" />
          <Text style={styles.infoText}>{business.type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#1B4F72" />
          <Text style={styles.infoText}>Verified Business</Text>
        </View>
      </View>

      <View style={styles.descriptionCard}>
        <Text style={styles.sectionTitle}>About Business</Text>
        <Text style={styles.descriptionText}>
          {business.description}
        </Text>
        <Text style={styles.descriptionText}>
          We are committed to providing high-quality products and excellent customer service. 
          Our business has been serving the community for over 5 years with a focus on customer 
          satisfaction and competitive pricing.
        </Text>
      </View>

      <View style={styles.hoursCard}>
        <Text style={styles.sectionTitle}>Business Hours</Text>
        <View style={styles.hoursRow}>
          <Text style={styles.dayText}>Monday - Friday</Text>
          <Text style={styles.hoursText}>8:00 AM - 6:00 PM</Text>
        </View>
        <View style={styles.hoursRow}>
          <Text style={styles.dayText}>Saturday</Text>
          <Text style={styles.hoursText}>9:00 AM - 4:00 PM</Text>
        </View>
        <View style={styles.hoursRow}>
          <Text style={styles.dayText}>Sunday</Text>
          <Text style={styles.hoursText}>Closed</Text>
        </View>
      </View>
    </View>
  );

  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Products & Services</Text>
      {products.map((product) => (
        <View key={product.id} style={styles.productCard}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productPrice}>{product.price}</Text>
          </View>
          <TouchableOpacity style={styles.productButton}>
            <Ionicons name="cart-outline" size={20} color="#1B4F72" />
            <Text style={styles.productButtonText}>Order</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionTitle}>Customer Reviews</Text>
        <View style={styles.ratingSummary}>
          <Text style={styles.ratingNumber}>{business.rating}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.floor(business.rating) ? 'star' : 'star-outline'}
                size={16}
                color="#BA7517"
              />
            ))}
          </View>
          <Text style={styles.totalReviews}>({reviews.length} reviews)</Text>
        </View>
      </View>
      
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewAuthor}>{review.author}</Text>
            <View style={styles.reviewRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= review.rating ? 'star' : 'star-outline'}
                  size={12}
                  color="#BA7517"
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewComment}>{review.comment}</Text>
          <Text style={styles.reviewDate}>{review.date}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return renderAboutTab();
      case 'products':
        return renderProductsTab();
      case 'reviews':
        return renderReviewsTab();
      default:
        return renderAboutTab();
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Business Info */}
      <LinearGradient
        colors={['#1B4F72', '#2E86C1']}
        style={styles.headerSection}
      >
        <View style={styles.businessHeader}>
          <View style={styles.businessEmoji}>
            <Text style={styles.emojiText}>{getCategoryEmoji(business.category)}</Text>
          </View>
          <View style={styles.businessBadge}>
            <Text style={styles.badgeText}>{business.badge}</Text>
          </View>
        </View>
        <Text style={styles.businessName}>{business.name}</Text>
        <Text style={styles.businessType}>{business.type}</Text>
        <View style={styles.businessMeta}>
          <View style={styles.rating}>
            <Ionicons name="star" size={16} color="#BA7517" />
            <Text style={styles.ratingText}>{business.rating}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color="#1B4F72" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
          <Ionicons name="chatbubble-outline" size={20} color="#1B4F72" />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
          <Ionicons name="map-outline" size={20} color="#1B4F72" />
          <Text style={styles.actionButtonText}>Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#1B4F72" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? '#1B4F72' : '#64748b'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {renderTabContent()}
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
  headerSection: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  businessHeader: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  businessEmoji: {
    fontSize: 24,
  },
  emojiText: {
    fontSize: 40,
  },
  businessBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
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
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  businessType: {
    fontSize: 16,
    color: '#B5D4F4',
    marginBottom: 16,
    textAlign: 'center',
  },
  businessMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#BA7517',
    marginLeft: 4,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#1B4F72',
    fontWeight: '500',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1B4F72',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1B4F72',
  },
  tabContent: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#0f172a',
    marginLeft: 12,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  hoursCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayText: {
    fontSize: 14,
    color: '#0f172a',
  },
  hoursText: {
    fontSize: 14,
    color: '#64748b',
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4F72',
  },
  productButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F1FB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  productButtonText: {
    fontSize: 12,
    color: '#1B4F72',
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewsHeader: {
    marginBottom: 20,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B4F72',
    marginRight: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  totalReviews: {
    fontSize: 14,
    color: '#64748b',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default BusinessDetailScreen;
