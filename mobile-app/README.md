# VENDORA AFRICA Mobile App

Africa's Business Marketplace - Mobile Application built with React Native and Expo.

## Overview

VENDORA AFRICA is a hybrid business marketplace connecting small businesses with customers across the African continent. This mobile app provides a seamless experience for both business owners and customers to browse, register, and manage businesses.

## Features

### For Business Owners
- **Free Registration**: Create business profile at zero cost
- **Business Management**: Manage products, services, and business information
- **Analytics Dashboard**: Track sales, views, and customer engagement
- **Customer Communication**: Respond to inquiries and manage reviews
- **Mobile Money Integration**: Accept payments via MTN MoMo, Vodafone Cash, etc.

### For Customers
- **Browse Businesses**: Discover local businesses by category and location
- **Search & Filter**: Find specific products and services
- **Business Details**: View comprehensive business information, reviews, and ratings
- **Contact Businesses**: Call, message, or get directions to businesses
- **Reviews & Ratings**: Read and write customer reviews

## Tech Stack

- **React Native** with **Expo** for cross-platform development
- **React Navigation** for navigation and routing
- **Expo Linear Gradient** for beautiful UI gradients
- **React Native Vector Icons** for consistent iconography
- **React Native Paper** for UI components

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- React Native development environment

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd vendora-africa-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on device/simulator:
```bash
# For iOS
npm run ios

# For Android
npm run android

# For Web
npm run web
```

## Project Structure

```
src/
  screens/                 # Screen components
    HomeScreen.js          # Home feed with featured businesses
    BrowseScreen.js        # Browse and search businesses
    RegisterScreen.js      # Business registration form
    BusinessDetailScreen.js # Detailed business information
    PricingScreen.js       # Pricing plans comparison
    ProfileScreen.js       # User profile and settings
  components/              # Reusable UI components
  navigation/             # Navigation configuration
  utils/                  # Utility functions
  constants/              # App constants and configurations
```

## Key Screens

### HomeScreen
- Hero section with app value proposition
- Featured businesses carousel
- Category browsing
- Business statistics
- Key features highlight

### BrowseScreen
- Search functionality
- Category filtering
- Business grid layout
- Real-time search results
- Empty state handling

### RegisterScreen
- Multi-step registration form
- Business information collection
- Form validation
- Success feedback
- Terms and conditions

### BusinessDetailScreen
- Comprehensive business information
- Product/service listings
- Customer reviews
- Contact options (call, message, directions)
- Business hours and location

### PricingScreen
- Plan comparison
- Feature breakdown
- FAQ section
- Call-to-action for registration

### ProfileScreen
- User and business information
- Performance statistics
- Account management
- Settings and preferences
- Support options

## Design System

### Colors
- **Primary**: #1B4F72 (Deep Blue)
- **Secondary**: #2E86C1 (Light Blue)
- **Accent**: #85B7EB (Sky Blue)
- **Success**: #3B6D11 (Green)
- **Warning**: #BA7517 (Orange)
- **Error**: #A32D2D (Red)
- **Neutral**: #64748b, #94a3b8, #f1f5f9

### Typography
- **Headings**: Bold, 24-32px
- **Subheadings**: Semi-bold, 18-20px
- **Body**: Regular, 14-16px
- **Captions**: Regular, 12px

### Components
- Cards with subtle shadows
- Rounded corners (12-20px)
- Consistent spacing (8px grid)
- Touch feedback on interactive elements
- Loading states and skeletons

## Data Flow

### Business Data
```javascript
const business = {
  id: 1,
  name: "TechZone Ghana",
  type: "Phones & electronics",
  category: "phones",
  rating: 4.8,
  phone: "+233 30 123 4567",
  location: "Accra, Ghana",
  description: "Your trusted partner for mobile phones...",
  badge: "Premium",
  verified: true
}
```

### User Data
```javascript
const user = {
  name: "Al-amin Mohammed",
  businessName: "NAFATUS ALU WORKS",
  email: "alamin@nafatus.com",
  plan: "Standard",
  memberSince: "January 2024"
}
```

## API Integration

The app is designed to integrate with a RESTful API with the following endpoints:

- `GET /api/businesses` - List all businesses
- `GET /api/businesses/:id` - Get business details
- `POST /api/businesses` - Register new business
- `GET /api/businesses/search` - Search businesses
- `POST /api/reviews` - Submit business review
- `GET /api/users/profile` - Get user profile

## Performance Optimizations

- **FlatList** for efficient scrolling
- **Image caching** for business logos
- **Memoization** for expensive computations
- **Lazy loading** for business details
- **Debounced search** for better UX

## Accessibility

- Screen reader support
- High contrast mode
- Semantic HTML elements
- Touch target sizes (minimum 44px)
- Keyboard navigation support

## Testing

- Unit tests with Jest
- Integration tests for critical flows
- UI testing with React Native Testing Library
- Performance testing with Flipper

## Deployment

### Expo Build Service
```bash
# Build for production
expo build:android
expo build:ios

# Build for web
expo build:web
```

### App Stores
- Google Play Store (Android)
- Apple App Store (iOS)
- Progressive Web App (Web)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary to VENDORA AFRICA. All rights reserved.

## Support

For support and questions:
- Email: support@vendora.africa
- Phone: +233 30 123 4567
- Website: www.vendora.africa

---

**Built for Africa, by Africa**
