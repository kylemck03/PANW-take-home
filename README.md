# PANW Take-Home: HealthKit Integration

## Overview

This project implements Apple HealthKit 

## Health Metrics Tracked

The app displays the following health data from Apple Health:

1. **Sleep Analysis** - Hours asleep and time in bed from last night
2. **Heart Rate** - Current heart rate and resting heart rate (BPM)
3. **Heart Rate Variability (HRV)** - SDNN measurement in milliseconds
4. **Step Count** - Total steps for today
5. **Active Energy Burned** - Calories burned through activity
6. **Dietary Energy Consumed** - Calories consumed (optional, only shown if logged)
7. **Mindful Sessions** - Minutes spent in mindfulness activities

## Quick Start

```bash
cd take-home

# Install
yarn install

# Open Xcode to add HealthKit capability
cd ios
open takehome.xcworkspace
# In Xcode: Add HealthKit capability in Signing & Capabilities tab

# Install iOS dependencies
pod install
cd ..

# Run on physical iOS device (NOT simulator)
npm run ios
```

## 📁 Project Structure

```
take-home/
├── app/
│   └── (tabs)/
│       └── index.tsx              # Home screen with HealthKit dashboard
├── components/
│   └── health-dashboard.tsx       # HealthKit UI component
├── hooks/
│   └── use-healthkit.ts           # HealthKit data fetching hook
├── ios/
│   └── takehome/
│       ├── Info.plist             # Privacy descriptions
│       └── takehome.entitlements  # HealthKit capability
├── scripts/
│   └── check-healthkit.js         # Configuration verification
├── QUICKSTART.md                  # Quick setup guide
├── HEALTHKIT_SETUP.md             # Detailed documentation
└── IMPLEMENTATION_SUMMARY.md      # Technical details
```

## Implementation Highlights

### Custom Hook (`use-healthkit.ts`)
- Handles authorization flow
- Fetches data from multiple HealthKit sources
- Manages loading and error states
- Provides refresh functionality
- Type-safe with TypeScript

### Dashboard Component (`health-dashboard.tsx`)
- Reusable HealthCard component
- Responsive grid layout
- Loading and error states
- Pull-to-refresh
- Dark mode support
- SF Symbols icons

### Configuration
- Privacy descriptions in Info.plist
- HealthKit entitlements enabled
- Proper TypeScript types
- No linting errors

## Privacy

The app requests read-only access to health data. Privacy descriptions are provided in Info.plist explaining why each permission is needed. Users can grant or deny access to individual data types.
