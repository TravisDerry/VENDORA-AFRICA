import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const BrowseScreen = ({ route }) => {
  const navigation = useNavigation();
  const { businesses } = route.params;
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBusinesses, setFilteredBusinesses] = useState(businesses);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: 'all', name: 'All categories', icon: 'grid-outline' },
    { id: 'phones', name: 'Phones & electronics', icon: 'phone-portrait-outline' },
    { id: 'cosmetics', name: 'Cosmetics & beauty', icon: 'sparkles-outline' },
    { id: 'fashion', name: 'Fashion & clothing', icon: 'shirt-outline' },
    { id: 'food', name: 'Food & grocery', icon: 'restaurant-outline' },
    { id: 'hardware', name: 'Hardware', icon: 'build-outline' },
  ];

  useEffect(() => {
    filterBusinesses();
  }, [selectedCategory, searchQuery]);

  const filterBusinesses = () => {
    setLoading(true);
    setTimeout(() => {
      let filtered = businesses;

      // Filter by category
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(b => b.category === selectedCategory);
      }

      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter(b => 
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.type.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setFilteredBusinesses(filtered);
      setLoading(false);
    }, 300);
  };

  const handleCategoryPress = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleBusinessPress = (business) => {
    navigation.navigate('BusinessDetail', { business });
  };

  const renderBusinessItem = ({ item }) => (
    <TouchableOpacity
      style={styles.businessCard}
      onPress={() => handleBusinessPress(item)}
    >
      <View style={styles.businessHeader}>
        <View style={styles.businessEmoji}>
          <Text style={styles.emojiText}>{getCategoryEmoji(item.category)}</Text>
        </View>
        <View style={styles.businessBadge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      </View>
      <View style={styles.businessBody}>
        <Text style={styles.businessName}>{item.name}</Text>
        <Text style={styles.businessType}>{item.type}</Text>
        <View style={styles.businessLocation}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
        <View style={styles.businessMeta}>
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color="#BA7517" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#1B4F72" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryItem = (category) => (
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
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#64748b"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map(renderCategoryItem)}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsSection}>
        <Text style={styles.resultsText}>
          {filteredBusinesses.length} businesses found
        </Text>
      </View>

      {/* Businesses List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B4F72" />
          <Text style={styles.loadingText}>Loading businesses...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBusinesses}
          renderItem={renderBusinessItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.businessesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No businesses found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}
    </View>
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
  searchSection: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  categoriesSection: {
    backgroundColor: '#fff',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
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
  resultsSection: {
    padding: 20,
    paddingTop: 16,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
  },
  businessesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  businessCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginHorizontal: 5,
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
  businessLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BrowseScreen;
