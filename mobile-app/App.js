import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform } from 'react-native';

// Web version on phones: iPhone browsers zoom the page in when you tap a text box whose text is
// smaller than 16px. Keep form text at 16px so typing never zooms the page.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('vendora-web-fixes')) {
  const css = document.createElement('style');
  css.id = 'vendora-web-fixes';
  css.textContent = 'input, textarea, select { font-size: 16px !important; }';
  document.head.appendChild(css);
}
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, shadow, type } from './src/theme';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PricingScreen from './src/screens/PricingScreen';
import BusinessDetailScreen from './src/screens/BusinessDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RegistrationSuccessScreen from './src/screens/RegistrationSuccessScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

import { API_BASE_URL } from './src/config';
import { normalizeBusiness } from './src/utils/businesses';
import AddProductScreen from './src/screens/AddProductScreen';
import FeatureScreen from './src/screens/FeatureScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import PayBusinessScreen from './src/screens/PayBusinessScreen';
import PayoutSetupScreen from './src/screens/PayoutSetupScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import ManageBusinessScreen from './src/screens/ManageBusinessScreen';
import OpeningHoursScreen from './src/screens/OpeningHoursScreen';
import HelpScreen from './src/screens/HelpScreen';
import LegalScreen from './src/screens/LegalScreen';


// Turn an API business record into the shape the screens expect.
// (location is an object { city, address } and country is lower-case in the API.)

// Main Tab Navigator
const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Browse: ['compass', 'compass-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

function MainTabs({ businesses, loadState, refreshBusinesses }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Register') {
            return (
              <View style={[styles.addButton, focused && styles.addButtonFocused]}>
                <Ionicons name="add" size={28} color={colors.onPrimary} />
              </View>
            );
          }
          const [active, inactive] = TAB_ICONS[route.name];
          return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          height: 60 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
          ...shadow.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" options={{ tabBarLabel: 'Home' }}>
        {() => <HomeScreen businesses={businesses} loadState={loadState} refreshBusinesses={refreshBusinesses} />}
      </Tab.Screen>
      <Tab.Screen name="Browse" options={{ tabBarLabel: 'Explore' }}>
        {() => <BrowseScreen />}
      </Tab.Screen>
      <Tab.Screen name="Register" options={{ tabBarLabel: 'List business', tabBarAccessibilityLabel: 'List your business' }}>
        {({ navigation }) => (
          <RegisterScreen navigation={navigation} refreshBusinesses={refreshBusinesses} />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Account' }}
      />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

const stackHeader = {
  headerStyle: { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTintColor: colors.primary,
  headerTitleStyle: { ...type.h3, color: colors.text },
  headerTitleAlign: 'center',
  headerBackButtonDisplayMode: 'minimal',
  // flex: 1 keeps each screen exactly phone-height so its own list scrolls (without it, screens
  // grow taller than the phone on the web version and finger-scrolling stops working)
  cardStyle: { flex: 1, backgroundColor: colors.background },
};

export default function App() {
  const [businesses, setBusinesses] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ok | error

  // Newest businesses for the Home screen (Explore loads its own pages from the server)
  const refreshBusinesses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses?limit=20`);
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      const fetched = Array.isArray(data.businesses) ? data.businesses : [];
      setBusinesses(fetched.map((item, index) => normalizeBusiness(item, index)));
      setLoadState('ok');
    } catch (error) {
      console.log('Could not load businesses:', error.message);
      setLoadState((s) => (s === 'ok' ? 'ok' : 'error')); // keep showing what we have if a refresh fails
    }
  };

  useEffect(() => {
    refreshBusinesses();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Stack.Navigator initialRouteName="Welcome" screenOptions={stackHeader}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" options={{ headerShown: false, animation: 'fade' }}>
            {() => <MainTabs businesses={businesses} loadState={loadState} refreshBusinesses={refreshBusinesses} />}
          </Stack.Screen>
          <Stack.Screen
            name="BusinessDetail"
            component={BusinessDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Pricing" component={PricingScreen} options={{ title: 'Pricing' }} />
          <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Add product' }} />
          <Stack.Screen name="Feature" component={FeatureScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Pay with Mobile Money' }} />
          <Stack.Screen name="PayBusiness" component={PayBusinessScreen} options={{ title: 'Pay with MoMo' }} />
          <Stack.Screen name="PayoutSetup" component={PayoutSetupScreen} options={{ title: 'MoMo payments' }} />
          <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'My orders' }} />
          <Stack.Screen name="ManageBusiness" component={ManageBusinessScreen} options={{ title: 'Manage my business' }} />
          <Stack.Screen name="OpeningHours" component={OpeningHoursScreen} options={{ title: 'Opening hours' }} />
          <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'Help & support' }} />
          <Stack.Screen name="Legal" component={LegalScreen} options={{ title: 'Terms & privacy' }} />
          <Stack.Screen
            name="RegistrationSuccess"
            component={RegistrationSuccessScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: -18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.tabBar,
    ...shadow.lg,
  },
  addButtonFocused: {
    backgroundColor: '#3A9AD9',
  },
});
