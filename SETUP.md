# VENDORA AFRICA - Setup Guide

This guide will help you set up and run the complete VENDORA AFRICA platform on your local machine.

## 📋 Prerequisites

### Required Software
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/)
- **Git** - [Download here](https://git-scm.com/)
- **Code Editor** (VS Code recommended)

### Mobile Development (Optional)
- **Android Studio** - For Android development
- **Xcode** - For iOS development (macOS only)
- **Expo CLI** - `npm install -g expo-cli`

## 🚀 Quick Setup

### 1. Clone the Project
```bash
git clone <repository-url>
cd "VENDORA_AFRICA BUSINESS"
```

### 2. Web Application Setup
The web application is a single HTML file with embedded CSS and JavaScript.

#### Option A: Simple Browser Open
1. Double-click `index.html` to open in your default browser
2. Or drag `index.html` into any browser window

#### Option B: Local Web Server (Recommended)
```bash
# Using Python (if installed)
python -m http.server 8000

# Using Node.js (if installed)
npx serve .

# Using PHP (if installed)
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

### 3. Backend API Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# At minimum, update these values:
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vendora-africa
JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### Start MongoDB
```bash
# On Windows (if installed as service)
net start MongoDB

# On macOS (using Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# Or run directly
mongod
```

#### Start the API Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5000`

### 4. Mobile App Setup

#### Install Dependencies
```bash
cd mobile-app
npm install
```

#### Start Development Server
```bash
npm start
```

This will open the Expo Developer Tools in your browser.

#### Run on Device/Simulator
```bash
# For Android (requires Android Studio)
npm run android

# For iOS (requires Xcode, macOS only)
npm run ios

# For Web
npm run web
```

## 🔧 Configuration Details

### Environment Variables (.env)

Create a `.env` file in the `backend` directory with these variables:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/vendora-africa

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Mobile Money (optional for development)
MTN_MOMO_API_KEY=your-mtn-momo-api-key
VODAFONE_CASH_API_KEY=your-vodafone-cash-api-key
ORANGE_MONEY_API_KEY=your-orange-money-api-key
MPESA_API_KEY=your-mpesa-api-key
```

### Mobile App Configuration

The mobile app is configured to connect to the local API by default. To change the API endpoint:

1. Open `mobile-app/App.js`
2. Find the API base URL configuration
3. Update it to your server URL

## 📱 Testing the Setup

### 1. Test Web Application
1. Open `index.html` in your browser
2. Verify all sections load correctly
3. Test the registration form
4. Test business browsing and filtering

### 2. Test Backend API
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test API documentation
curl http://localhost:5000/api

# Test business listing
curl http://localhost:5000/api/businesses
```

### 3. Test Mobile App
1. Start the Expo development server
2. Scan the QR code with Expo Go app
3. Test all screens and functionality

## 🗄️ Database Setup

### Using MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get the connection string
4. Update `MONGODB_URI` in your `.env` file

### Using Local MongoDB
1. Install MongoDB on your system
2. Start the MongoDB service
3. The database will be created automatically on first connection

## 🚀 Common Issues & Solutions

### Port Already in Use
```bash
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm start
```

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"

# Start MongoDB manually
mongod --dbpath /path/to/your/db
```

### Mobile App Build Issues
```bash
# Clear Expo cache
expo start -c

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### CORS Issues
Make sure your `.env` file has the correct `FRONTEND_URL`:
```bash
FRONTEND_URL=http://localhost:3000
```

## 📊 Development Workflow

### 1. Making Changes
- **Web**: Edit `index.html` and refresh browser
- **Backend**: Edit backend files, server auto-restarts
- **Mobile**: Edit mobile app files, Expo auto-reloads

### 2. Testing
```bash
# Run backend tests
cd backend
npm test

# Test API endpoints
# Use Postman, Insomnia, or curl
```

### 3. Debugging
- **Web**: Use browser developer tools
- **Backend**: Check console output and use debugger
- **Mobile**: Use Expo developer tools and device logs

## 🚀 Production Deployment

### Web Application
1. Upload `index.html` to a web server
2. Configure domain and SSL
3. Update API endpoint in the JavaScript

### Backend API
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up SSL certificates
4. Configure reverse proxy (nginx/Apache)

### Mobile App
1. Build for production:
```bash
expo build:android
expo build:ios
```

2. Submit to app stores

## 📞 Getting Help

If you encounter issues:

1. **Check the logs**: Backend console output
2. **Verify configuration**: Environment variables
3. **Check dependencies**: All packages installed correctly
4. **Network issues**: Firewall, antivirus blocking
5. **Permissions**: Administrator privileges if needed

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Expo Documentation](https://docs.expo.dev/)

---

**Happy coding! 🚀**

Built for Africa, by Africa 🌍
