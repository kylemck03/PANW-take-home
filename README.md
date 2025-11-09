# PANW Take-Home: Health Tracking App

## Live Demo: 
https://www.youtube.com/watch?v=DcZcoXKSiLA

## Overview

A modern React Native health tracking application built with Expo Router, featuring Apple HealthKit integration, Google authentication, and a delightful character-driven UI. The app uses Beanie, an animated character companion, to create an engaging and friendly user experience.

## Features

### Character-Driven UI
- **Beanie Character** - An animated ghost companion (Rive animation) that appears throughout the app
- **AI-Powered Insights** - Real-time personalized health tips from GPT-5-mini

### Health Dashboard
Real-time health metrics from Apple HealthKit:
- **Steps** - Daily step count 
- **Calories** - Active energy burned
- **Water** - Daily water intake (converted from liters to cups)
- **Sleep** - Hours asleep from last night with progress toward 8 hours
- **Heart Rate** - Current or resting heart rate (BPM)

### Insights Tab
- **Full Insights Feed** - View all AI-generated health insights
- **Filter by Type** - Daily, Weekly, Anomalies, Patterns, Correlations
- **Mark as Read** - Track which insights you've reviewed
- **Pull to Refresh** - Get latest insights anytime

### Analytics Tab
- **Correlation Charts** - Discover relationships between health metrics
- **Trend Analysis** - Track changes over 30/60/90 days
- **Pattern Detection** - AI identifies behavioral patterns with confidence levels
- **Visual Charts** - Beautiful data visualizations with interactive elements
- **Time Range Selection** - Analyze 30, 60, or 90 days of data
- **Summary Statistics** - Quick overview of correlations, anomalies, and trends
- **On-Demand Analysis** - Run fresh ML analysis anytime
- **Anomaly Detection** - Identify unusual patterns in your health data

### Story Tab (Correlations Dashboard)
- **Metric Correlations** - Visualize relationships between health metrics
- **Interactive Charts** - Tap metrics to see correlations
- **AI-Generated Narratives** - Understand what correlations mean for your health
- **Multi-Metric View** - See how sleep, activity, nutrition, and more connect
- **Smart Insights** - Get personalized explanations of your health story

### Authentication
- Google Sign-In integration
- Supabase authentication backend
- Secure session management

### Prediction Dashboard
- **Tomorrow's Forecast** - AI-powered predictions for your health tomorrow
- **Personalized Insights** - Based on your historical data patterns
- **Trend-Based Predictions** - Uses correlations, trends, and patterns
- **Refresh Anytime** - Generate new predictions on demand
- **Embedded Mode** - Can be displayed within other screens

### User Experience
- **Loading Screen** - Animated Beanie character during app initialization
- **Login Screen** - Welcoming interface with character greeting
- **Home Dashboard** - Comprehensive health overview with quick stats
- **Quick Actions** - Easy access to common features
- **Tab Navigation** - Easy switching between Home, Insights, Analytics, and Story

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

# Run on physical iOS device or simulator
npx expo run:ios
```
**You need this file ``takehome.xcodeproj`` to open in Xcode so it is best to use the finder file explorer for this as seen below:**
Once opened you will create a new group called "Assets" in the root directory and then drag the ``beanie_loading.riv`` file into it and check the target box

<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/1451bc65-c473-4612-bba1-34bc25a5ed50" />
<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/cf05ef2e-0fe0-4674-9aaa-347e88e8fb47" />
<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/d64c7bcc-30ff-4b18-8ab4-237e101eca03" />
<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/d5758436-5d17-4c7d-8d3c-01144af2ab8b" />

**1. Start Backend:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

## Project Structure

```
take-home/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with auth state management
│   ├── (tabs)/                  # Tab navigation group
│   │   ├── _layout.tsx          # Tab layout configuration
│   │   ├── index.tsx            # Home tab → imports HomeScreen
│   │   ├── insights.tsx         # Insights tab → full insights feed
│   │   ├── analytics.tsx        # Analytics tab → ML analysis & charts
│   │   ├── dashboard.tsx        # Story tab → correlations dashboard
│   │   └── explore.tsx          # Explore tab (hidden)
│   │
│   ├── screens/                 # ACTUAL SCREEN COMPONENTS
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
│   ├── themed-view.tsx          # Themed view component
│   ├── insight-card.tsx         # Individual insight card component
│   ├── correlation-chart.tsx    # Correlation visualization chart
│   ├── trend-chart.tsx          # Trend analysis chart
│   ├── correlated-dashboard.tsx # Correlations dashboard (Story tab)
│   └── prediction-dashboard.tsx # Tomorrow's forecast component
│
├── hooks/
│   └── use-healthkit.ts         # HealthKit data fetching hook
│
├── contexts/
│   └── auth-context.tsx         # Authentication context provider
│
├── lib/
│   ├── supabase.ts              # Supabase client configuration
│   └── api.ts                   # Backend API client
│
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

#### CorrelatedDashboard (Story Tab)
- Interactive metric correlation visualization
- AI-generated narrative explanations
- Multi-metric correlation analysis
- Historical trend viewing
- Smart health story insights

#### PredictionDashboard
- Tomorrow's health forecast
- AI-powered predictions based on historical data
- Trend and pattern-based insights
- Refreshable predictions
- Embedded mode support


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

The app requests read and write access to health data. Privacy descriptions are provided in Info.plist explaining why each permission is needed. Users can grant or deny access to individual data types.

All health data is processed locally on the device and is not transmitted to external servers (except through standard HealthKit APIs).

## Development

### Environment Variables
Create a `.env` file in the `take-home` directory with:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_URL=http://localhost:8000
```

## Backend Integration

The mobile app is integrated with the FastAPI backend to fetch real AI-generated insights!

### Quick Start - Full Stack

**1. Start Backend:**
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload
```
### Environment Variables
Create a `.env` file in the `take-home` directory with:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
ENVIRONMENT=development
```

**4. Test:**
- Open the app
- Login with Google or Guest mode
- Watch the "Tip from Beanie" card load real insights

### API Endpoints

```bash
# Test backend health
curl http://localhost:8000/health

# Insights API
curl "http://localhost:8000/api/insights/YOUR_USER_ID/daily?user_name="
curl "http://localhost:8000/api/insights/YOUR_USER_ID/feed?type=daily&limit=50"
curl "http://localhost:8000/api/insights/YOUR_USER_ID/tomorrow-prediction?user_name="
curl -X POST "http://localhost:8000/api/insights/YOUR_USER_ID/mark-read/INSIGHT_ID"

# Analytics API
curl -X POST "http://localhost:8000/api/analytics/YOUR_USER_ID/analyze?days=90"
curl "http://localhost:8000/api/analytics/YOUR_USER_ID/correlations?days=30"
curl "http://localhost:8000/api/analytics/YOUR_USER_ID/trends?days=60"
curl "http://localhost:8000/api/analytics/YOUR_USER_ID/anomalies?days=90"

# Health Data API
curl "http://localhost:8000/api/health-data/YOUR_USER_ID?days=30"
```
