import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PricingScreen from './src/screens/PricingScreen';
import BusinessDetailScreen from './src/screens/BusinessDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Sample business data
const businesses = [
  {
    id: 1,
    name: "TechZone Ghana",
    type: "Phones & electronics",
    category: "phones",
    rating: 4.8,
    emoji: "Mobile phones, laptops, accessories",
    badge: "Premium",
    verified: true,
    phone: "+233 30 123 4567",
    location: "Accra, Ghana",
    description: "Your trusted partner for mobile phones, laptops, and electronic accessories."
  },
  {
    id: 2,
    name: "Glow Beauty Hub",
    type: "Cosmetics & beauty",
    category: "cosmetics",
    rating: 4.9,
    emoji: "Makeup, skincare, beauty products",
    badge: "Standard",
    verified: true,
    phone: "+233 30 234 5678",
    location: "Kumasi, Ghana",
    description: "Premium beauty products and skincare solutions for every need."
  },
  {
    id: 3,
    name: "AfriStyle Fashion",
    type: "Fashion & clothing",
    category: "fashion",
    rating: 4.7,
    emoji: "Traditional and modern clothing",
    badge: "Premium",
    verified: true,
    phone: "+233 30 345 6789",
    location: "Lagos, Nigeria",
    description: "African fashion at its finest - traditional and modern clothing."
  },
  {
    id: 4,
    name: "Mama's Kitchen",
    type: "Food & grocery",
    category: "food",
    rating: 5.0,
    emoji: "Local dishes, groceries",
    badge: "Basic",
    verified: true,
    phone: "+233 30 456 7890",
    location: "Nairobi, Kenya",
    description: "Authentic local dishes and fresh groceries delivered to your door."
  },
  {
    id: 5,
    name: "BuildRight Hardware",
    type: "Hardware & building",
    category: "hardware",
    rating: 4.6,
    emoji: "Tools, building materials",
    badge: "Standard",
    verified: true,
    phone: "+233 30 567 8901",
    location: "Abuja, Nigeria",
    description: "Quality hardware and building materials for all your construction needs."
  }
];

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Browse') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Register') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1B4F72',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#1B4F72',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'VENDORA AFRICA' }}
        initialParams={{ businesses }}
      />
      <Tab.Screen 
        name="Browse" 
        component={BrowseScreen}
        options={{ title: 'Browse Businesses' }}
        initialParams={{ businesses }}
      />
      <Tab.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ title: 'Register Business' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#1B4F72" />
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="BusinessDetail" 
          component={BusinessDetailScreen}
          options={{ title: 'Business Details' }}
        />
        <Stack.Screen 
          name="Pricing" 
          component={PricingScreen}
          options={{ title: 'Pricing Plans' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
