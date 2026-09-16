import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ProfileScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Mock user data
  const user = {
    name: 'Al-amin Mohammed',
    businessName: 'NAFATUS ALU WORKS',
    email: 'alamin@nafatus.com',
    phone: '+233 24 123 4567',
    plan: 'Standard',
    memberSince: 'January 2024',
    businessCategory: 'Aluminum & glass works',
    location: 'Accra, Ghana',
  };

  const stats = [
    { label: 'Products listed', value: '24' },
    { label: 'Total views', value: '1,247' },
    { label: 'Customer reviews', value: '18' },
    { label: 'Response rate', value: '98%' },
  ];

  const menuItems = [
    {
      icon: 'storefront-outline',
      title: 'My Business',
      subtitle: 'Manage your business profile',
      action: 'business'
    },
    {
      icon: 'grid-outline',
      title: 'Products',
      subtitle: 'Manage your product listings',
      action: 'products'
    },
    {
      icon: 'chart-bar-outline',
      title: 'Analytics',
      subtitle: 'View sales and performance',
      action: 'analytics'
    },
    {
      icon: 'card-outline',
      title: 'Billing & Plans',
      subtitle: 'Manage your subscription',
      action: 'billing'
    },
    {
      icon: 'message-outline',
      title: 'Messages',
      subtitle: 'Customer inquiries',
      action: 'messages',
      badge: '3'
    },
    {
      icon: 'star-outline',
      title: 'Reviews',
      subtitle: 'Customer feedback',
      action: 'reviews'
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get assistance',
      action: 'help'
    },
    {
      icon: 'document-text-outline',
      title: 'Terms & Privacy',
      subtitle: 'Legal information',
      action: 'legal'
    },
  ];

  const handleMenuPress = (action) => {
    Alert.alert(
      'Feature Coming Soon',
      `${action.charAt(0).toUpperCase() + action.slice(1)} feature will be available soon!`,
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: () => console.log('Logout') },
      ]
    );
  };

  const renderStatItem = (stat, index) => (
    <View key={index} style={styles.statItem}>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );

  const renderMenuItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      onPress={() => handleMenuPress(item.action)}
    >
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>
          <Ionicons name={item.icon} size={24} color="#1B4F72" />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.menuRight}>
        {item.badge && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{item.badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </View>
    </TouchableOpacity>
  );

  const renderSettingItem = (title, value, onToggle) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e2e8f0', true: '#E6F1FB' }}
        thumbColor={value ? '#1B4F72' : '#fff'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <LinearGradient
        colors={['#1B4F72', '#2E86C1']}
        style={styles.headerSection}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.businessName}>{user.businessName}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>{user.plan} Plan</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.statsGrid}>
          {stats.map(renderStatItem)}
        </View>
      </LinearGradient>

      {/* Business Info Card */}
      <View style={styles.businessCard}>
        <Text style={styles.cardTitle}>Business Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>{user.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="phone-portrait-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>{user.phone}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>{user.location}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="briefcase-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>{user.businessCategory}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>Member since {user.memberSince}</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        {menuItems.slice(0, 4).map(renderMenuItem)}
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Business Tools</Text>
        {menuItems.slice(4, 7).map(renderMenuItem)}
      </View>

      {/* Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          {renderSettingItem('Push Notifications', notifications, setNotifications)}
          {renderSettingItem('Location Services', locationServices, setLocationServices)}
          {renderSettingItem('Dark Mode', darkMode, setDarkMode)}
        </View>
      </View>

      {/* Support */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Support</Text>
        {menuItems.slice(7).map(renderMenuItem)}
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionSection}>
        <Text style={styles.versionText}>VENDORA AFRICA v1.0.0</Text>
        <Text style={styles.versionSubtext}>Built for Africa, by Africa</Text>
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    color: '#B5D4F4',
    marginBottom: 8,
  },
  planBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  planText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#B5D4F4',
    textAlign: 'center',
  },
  businessCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
  },
  menuSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E6F1FB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4F72',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 12,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingItem:last-child {
    borderBottomWidth: 0,
  },
  settingTitle: {
    fontSize: 16,
    color: '#0f172a',
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  versionSection: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default ProfileScreen;
