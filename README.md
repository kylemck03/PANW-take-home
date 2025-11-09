# PANW Take-Home: Health Tracking App

## Overview

A modern React Native health tracking application built with Expo Router, featuring Apple HealthKit integration, Google authentication, and a delightful character-driven UI. The app uses Beanie, an animated character companion, to create an engaging and friendly user experience.

## Features

### 🎨 Character-Driven UI
- **Beanie Character** - An animated ghost companion (Rive animation) that appears throughout the app
- **Personalized Greetings** - Time-aware greetings (Good morning/afternoon/evening)
- **Motivational Tips** - Daily health tips from Beanie
- **Smooth Animations** - Entrance animations and transitions throughout

### 📊 Health Dashboard
Real-time health metrics from Apple HealthKit:
- **Steps** - Daily step count with progress toward 10,000 goal
- **Calories** - Active energy burned
- **Water** - Daily water intake (converted from liters to cups)
- **Sleep** - Hours asleep from last night with progress toward 8 hours
- **Heart Rate** - Current or resting heart rate (BPM)
- **Weight** - Most recent weight (converted from kg to lbs)

### 🔐 Authentication
- Google Sign-In integration
- Supabase authentication backend
- Secure session management
- Guest mode option

### 🎯 User Experience
- **Loading Screen** - Animated Beanie character during app initialization
- **Login Screen** - Welcoming interface with character greeting
- **Home Dashboard** - Comprehensive health overview with quick stats
- **Profile Header** - User info with safe area support (notch/Dynamic Island compatible)
- **Quick Actions** - Easy access to common features

## Quick Start

```bash
cd take-home

# Install dependencies
yarn install

# Open Xcode to add HealthKit capability
cd ios
open takehome.xcworkspace
# In Xcode: Add HealthKit capability in Signing & Capabilities tab

# Install iOS dependencies
pod install
cd ..

# Run on physical iOS device (NOT simulator - HealthKit requires real device)
npm run ios
```

## 📁 Project Structure

```
take-home/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with auth state management
│   ├── (tabs)/                  # Tab navigation group
│   │   ├── _layout.tsx          # Tab layout configuration
│   │   ├── index.tsx            # Home tab → imports HomeScreen
│   │   └── explore.tsx          # Explore tab
│   │
│   ├── screens/                 # 🎯 ACTUAL SCREEN COMPONENTS
│   │   ├── LoadingScreen.tsx    # Loading screen with Beanie animation
│   │   ├── LoginScreen.tsx      # Login/authentication screen
│   │   └── HomeScreen.tsx        # Main home/dashboard screen
│   │
│   └── login.tsx                # Route → imports LoginScreen
│
├── components/
│   ├── health-dashboard.tsx     # HealthKit metrics dashboard
│   ├── profile-header.tsx        # User profile header with safe area
│   ├── themed-text.tsx          # Themed text component
│   └── themed-view.tsx          # Themed view component
│
├── hooks/
│   └── use-healthkit.ts         # HealthKit data fetching hook
│
├── contexts/
│   └── auth-context.tsx         # Authentication context provider
│
├── lib/
│   └── supabase.ts              # Supabase client configuration
│
├── assets/
│   └── animations/
│       └── beanie_loading.riv    # Rive animation file for Beanie character
│
└── ios/
    └── takehome/
        ├── Info.plist            # Privacy descriptions
        └── takehome.entitlements # HealthKit capability
```

## Architecture

### Screen Components Pattern
Following Expo Router best practices, the app separates routing from UI logic:

- **Route files** (`app/login.tsx`, `app/(tabs)/index.tsx`) handle navigation
- **Screen components** (`app/screens/*.tsx`) contain the actual UI and business logic

This pattern makes the codebase more maintainable and testable.

### Key Components

#### LoadingScreen
- Displays animated Beanie character during app initialization
- Shown while checking authentication state
- Uses Rive animation (`beanie_loading.riv`)

#### LoginScreen
- Welcome screen with Beanie character greeting
- Google Sign-In integration
- Guest mode option
- Smooth entrance animations
- Responsive design

#### HomeScreen
- Personalized greeting with time-of-day awareness
- Beanie character companion
- Quick stats (streak, progress, achievements)
- Daily tips from Beanie
- Health metrics dashboard
- Quick action cards
- Profile header with user info

#### HealthDashboard
- Real-time HealthKit data integration
- Scrollable metric cards
- Progress indicators
- Loading states
- Automatic data refresh
- Proper formatting (commas, decimals)
- Handles missing data gracefully

#### ProfileHeader
- User information display
- Sign out functionality
- Safe area support (notch/Dynamic Island compatible)
- Themed styling

## Health Metrics

The app displays the following health data from Apple HealthKit:

1. **Steps** - Total steps for today with progress toward 10,000 goal
2. **Calories** - Active energy burned (kcal)
3. **Water** - Daily water intake (cups, converted from liters)
4. **Sleep** - Hours asleep from last night with progress toward 8 hours
5. **Heart Rate** - Current or resting heart rate (BPM)
6. **Weight** - Most recent weight (lbs, converted from kg)

All metrics are fetched in real-time from HealthKit and update automatically.

## Implementation Highlights

### Custom Hook (`use-healthkit.ts`)
- Handles authorization flow
- Fetches data from multiple HealthKit sources
- Manages loading and error states
- Provides refresh functionality
- Type-safe with TypeScript
- Handles iOS-specific requirements

### Authentication (`auth-context.tsx`)
- Supabase integration
- Google Sign-In support
- Session management
- Automatic navigation based on auth state

### UI Components
- Themed components for light/dark mode support
- Safe area handling for modern iOS devices
- Responsive design
- Smooth animations
- Loading states
- Error handling

### Configuration
- Privacy descriptions in Info.plist
- HealthKit entitlements enabled
- Google Sign-In configuration
- Supabase environment variables
- Proper TypeScript types
- No linting errors

## Dependencies

### Core
- `expo` - Expo framework
- `expo-router` - File-based routing
- `react-native` - React Native core
- `@supabase/supabase-js` - Supabase client

### Health & Auth
- `@kingstinct/react-native-healthkit` - HealthKit integration
- `@react-native-google-signin/google-signin` - Google authentication

### UI & Animation
- `rive-react-native` - Rive animation support
- `@expo/vector-icons` - Icon library
- `react-native-safe-area-context` - Safe area handling
- `react-native-reanimated` - Animations

## Privacy

The app requests read-only access to health data. Privacy descriptions are provided in Info.plist explaining why each permission is needed. Users can grant or deny access to individual data types.

All health data is processed locally on the device and is not transmitted to external servers (except through standard HealthKit APIs).

## Development

### Running the App
```bash
# Start development server
npm start

# Run on iOS device
npm run ios

# Run on Android device
npm run android
```

### Environment Variables
Create a `.env` file with:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Notes

- HealthKit is only available on physical iOS devices (not simulators)
- The app requires HealthKit permissions to display health metrics
- Google Sign-In requires proper OAuth configuration
- Rive animations require the `beanie_loading.riv` file in `assets/animations/`

## License

Private - Take-home project
