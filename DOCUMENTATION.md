# Design Documentation

## Health Tracking Application - Technical Design & Architecture

**Author:** Kyle McKnight


---

## Executive Summary

This document outlines the design, architecture, and technical decisions for a full-stack health tracking application. The system integrates Apple HealthKit for real-time health data collection, Supabase for data storage, a FastAPI backend for machine learning analytics, and OpenAI GPT models for generating personalized health insights. The mobile application is built with React Native and Expo, providing a character-driven user experience that makes health tracking approachable and engaging.

## Technology Choices & Approach Rationale

This app was built with speed, scalability, and real-world usefulness in mind from day one. The stack was chosen to balance rapid iteration with production-grade performance. On the frontend, I went with React Native and Expo to ship a cross-platform mobile app that still feels fully native — especially important for HealthKit integration, which relies on iOS-specific APIs. React native was chosen over swift, which has better Apple Healthkit support, due to cross functionality and lower development time as React is something that I have experience in.

For the backend, I chose FastAPI over Django or Flask because it’s modern, async-friendly, and fast which matters when you’re crunching large health datasets for ML analysis. Python made sense across the board, since I could move straight from Jupyter notebooks to production using pandas, scikit-learn, and numpy. Supabase powers the database layer because it gives me managed Postgres, auth, and real-time updates all in one place — no need for extra infra for the MVP.

For insights, I leaned on OpenAI’s GPT models + basic ML statistical models instead of training custom NLP models. The goal was to get high-quality, natural-language feedback fast without spending too much time on model training and data collection. Since HealthKit doesn’t allow bulk data imports, I generated synthetic health data upfront to jumpstart the system and train models before real data comes in. This hybrid setup — synthetic baseline data plus live HealthKit updates means the app can deliver meaningful insights immediately while getting more personalized over time.

Finally, the animated character “Beanie” brings personality to the UI. The idea was to make health tracking feel less like a chore and more like an interactive experience. Using Rive for animations keeps everything smooth and lightweight without hurting performance.


### Key Features
- **Real-time Health Data Integration**: Direct Apple HealthKit with integration (plans to integrate Google Fit for android) for steps, calories, heart rate, sleep, and water intake
- **Machine Learning Analytics**: Correlation analysis, anomaly detection, trend analysis, and pattern recognition that runs in the backend
- **AI-Powered Insights**: Personalized health recommendations using LLM's(gpt-5-mini)
- **Character-Driven UI**: Animated companion (Beanie) using Rive for enhanced user engagement
- **Full-Stack Architecture**: Mobile app, RESTful API, and cloud database

---

## System Overview

### Problem Statement

Health data is vast and unstructured, making it difficult for users to understand the bigger picture of their health. Raw metrics alone don't provide actionable insights, and users often lack the context to interpret their health data meaningfully and make meaning lifestlye changes.

### Solution Approach

The application addresses this challenge by unifying data sources through direct integration with Apple HealthKit to consolidate health metrics into a single, comprehensive view. The system then applies advanced machine learning analytics to identify meaningful patterns, correlations, and anomalies within the user's health data, transforming raw metrics into actionable intelligence. To make these insights accessible and engaging, the application leverages AI-powered natural language generation to provide personalized, contextual recommendations that explain what the data means and how users can act on it. Finally, the solution employs a character-driven interface featuring an animated companion (Beanie) that makes health tracking feel less clinical and more approachable, encouraging consistent engagement with health data and insights.


### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                         │
│  (React Native + Expo Router + TypeScript)                   │
│  - HealthKit Integration                                      │
│  - Character-Driven UI (Rive)                               │
│  - Real-time Health Dashboard                                 │
│  - Insights Feed                                              │
│  - Analytics Visualizations                                   │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       │ HTTPS/REST API
                       │
┌──────────────────────▼────────────────────────────────────────┐
│              FastAPI Backend Service                           │
│  - ML Analysis Pipeline (scikit-learn)                        │
│  - OpenAI Integration (GPT-5)                                 │
│  - RESTful API Endpoints                                      │
│  - Data Validation & Sanitization                              │
└──────────────────────┬────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
┌────────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
│  Supabase    │ │  OpenAI  │ │ HealthKit│
│  PostgreSQL  │ │   API    │ │   iOS    │
│  Database    │ │          │ │          │
└──────────────┘ └──────────┘ └──────────┘
```

---

## Architecture

### High-Level Architecture

The system follows a **three-tier architecture**:

1. **Presentation Layer** (Mobile App)
   - React Native application with Expo Router
   - Native iOS HealthKit integration
   - Character-driven UI components
   - Real-time data visualization

2. **Application Layer** (Backend API)
   - FastAPI RESTful service
   - ML analysis pipeline
   - AI insight generation
   - Data orchestration

3. **Data Layer**
   - Supabase (PostgreSQL) for persistent storage
   - HealthKit for real-time health data
   - OpenAI API for AI insights

### Mobile Application Architecture

#### File-Based Routing (Expo Router)


**Key Design Patterns:**
- **Custom Hooks**: `use-healthkit.ts` encapsulates HealthKit logic
- **Context API**: `auth-context.tsx` manages authentication state
- **Component Composition**: Themed components for consistent styling
- **Error Boundaries**: Graceful error handling throughout

### Backend Architecture

#### Service-Oriented Design

The backend follows a **service-oriented architecture** with clear separation of concerns:

```
backend/app/
├── main.py                  # FastAPI app & routing
├── config.py                # Configuration management
├── api/                     # API route handlers
│   ├── health_data.py       # Health data endpoints
│   ├── analytics.py         # ML analysis endpoints
│   └── insights.py          # AI insights endpoints
├── services/                # Business logic layer
│   ├── supabase_service.py  # Database operations
│   ├── ml_service.py        # ML pipeline orchestration
│   └── openai_service.py    # AI insight generation
└── models/                  # Data models & ML functions
    ├── schemas.py           # Pydantic models
    └── ml_models.py         # ML analysis functions
```

#### API Design Principles

1. **RESTful Conventions**: Standard HTTP methods and status codes
2. **Resource-Based URLs**: `/api/health-data/{user_id}`
3. **Query Parameters**: For filtering and pagination (`?days=90`)
4. **Consistent Error Responses**: Standardized error format
5. **Type Safety**: Pydantic models for request/response validation

#### ML Pipeline Architecture

The ML analysis pipeline follows a **modular design**:

```
Data Fetching → Data Cleaning → Feature Engineering → Analysis → Results Serialization
     ↓              ↓                  ↓                ↓              ↓
Supabase      NaN Handling      Normalization    Correlation    JSON Response
             Outlier Removal    Scaling         Anomaly Detection
             Type Conversion                    Trend Analysis
                                                Pattern Detection
```

**Key Design Decisions:**
- **Statistical Methods**: Pearson correlation, Z-scores for anomaly detection
- **Isolation Forest**: For multi-dimensional anomaly detection
- **Baseline Calculation**: Rolling averages for trend analysis
- **Data Sanitization**: Robust handling of missing/incomplete data

---

## Technical Stack

### Frontend (Mobile Application)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **Expo** | ~54.0.23 | Development platform & tooling |
| **Expo Router** | ~6.0.14 | File-based routing |
| **TypeScript** | ~5.9.2 | Type safety & developer experience |
| **React** | 19.1.0 | UI library |
| **@kingstinct/react-native-healthkit** | ^11.1.2 | HealthKit integration |
| **@supabase/supabase-js** | ^2.47.14 | Supabase client |
| **@react-native-google-signin/google-signin** | ^11.0.1 | Google authentication |
| **rive-react-native** | ^9.6.2 | Rive animation support |
| **react-native-reanimated** | ~4.1.1 | Smooth animations |
| **react-native-safe-area-context** | ~5.6.0 | Safe area handling |

**Why These Technologies?**

- **React Native + Expo**: Rapid development, code sharing between platforms, excellent developer experience
- **Expo Router**: Type-safe navigation, file-based routing reduces boilerplate
- **TypeScript**: Catch errors at compile time, better IDE support, self-documenting code
- **HealthKit Library**: Native iOS integration with proper permission handling
- **Rive**: High-performance animations for character-driven UI

### Backend (API Service)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.10+ | Backend language |
| **FastAPI** | 0.104.1 | Modern async web framework |
| **Uvicorn** | 0.24.0 | ASGI server |
| **Pydantic** | >=2.6.0 | Data validation & settings |
| **pandas** | 2.1.3 | Data manipulation & analysis |
| **numpy** | 1.26.2 | Numerical computing |
| **scikit-learn** | 1.3.2 | Machine learning algorithms |
| **scipy** | 1.11.4 | Statistical functions |
| **OpenAI** | >=1.40.0 | GPT-4 API client |
| **Supabase** | >=2.24.0 | Database client |
| **httpx** | >=0.27.0 | Async HTTP client |

**Why These Technologies?**

- **FastAPI**: High performance, automatic API docs, async support, type hints
- **pandas + scikit-learn**: Industry-standard data science tools, well-documented
- **Pydantic**: Runtime type validation, automatic serialization, settings management
- **Supabase**: PostgreSQL with real-time capabilities, built-in auth, easy deployment

### Infrastructure & Services

| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database, authentication, real-time subscriptions |
| **OpenAI API** | GPT-5 for generating personalized health insights |
| **Apple HealthKit** | Native iOS health data source |
| **Google Sign-In** | OAuth authentication |

---

## Design Decisions

### 1. Mobile Application Architecture


#### Decision: Custom Hook for HealthKit Integration

**Rationale:**
- Encapsulates complex HealthKit authorization and data fetching logic
- Reusable across multiple components
- Centralized error handling
- Type-safe with TypeScript

**Implementation:**
```typescript
// hooks/use-healthkit.ts
export function useHealthKit() {
  // Authorization, data fetching, error handling
  return { data, loading, error, refresh };
}
```

### 2. Backend Architecture

#### Decision: Service-Oriented Architecture

**Rationale:**
- Clear separation of concerns (API routes, business logic, data access)
- Easy to test individual services
- Scalable - services can be extracted to microservices if needed
- Maintainable - changes isolated to specific layers

**Structure:**
```
API Layer (routes) → Service Layer (business logic) → Data Layer (Supabase)
```

#### Decision: Modular ML Pipeline

**Rationale:**
- Each ML function is independent and testable
- Easy to add new analysis types
- Can be ported from Jupyter notebooks incrementally
- Clear data flow: Data → Analysis → Results

**ML Functions:**
- `analyze_correlations()`: Pearson correlation with p-values
- `detect_anomalies()`: Isolation Forest + Z-score methods
- `analyze_trends()`: Rolling averages and percent changes
- `analyze_lagged_correlations()`: Time-delayed relationships
- `detect_sleep_sugar_pattern()`: Domain-specific pattern detection


### 3. Data Management

#### Decision: Supabase (PostgreSQL) for Persistent Storage

**Rationale:**
- **PostgreSQL**: Robust, supports complex queries
- **Supabase**: Built-in authentication, real-time subscriptions, easy to pick up and deploy

**Schema Design:**
- `health_data`: Time-series health metrics
- `insights`: AI-generated insights with read/unread tracking
- `analysis_results`: Cached ML analysis results
- `users`: User authentication and profile data

#### Decision: HealthKit as Data Source

**Rationale:**
- **Native Integration**: Direct access to iOS health data
- **User Control**: Users grant permissions per data type
- **Comprehensive**: Aggregates data from multiple sources (Apple Watch, third-party apps)
- **Privacy-First**: Data stays on device until user syncs

**Data Flow:**
```
HealthKit → Mobile App → API → Supabase
```

#### Decision: Synthetic Data Generation for Development & Testing

**Rationale:**
- **Development Challenge**: Apple HealthKit does not provide an easy way to bulk import large amounts of historical health data for testing and development purposes
- **ML Model Requirements**: Machine learning models require substantial historical data (30-90 days minimum) to produce meaningful correlations, trends, and patterns
- **Testing Needs**: Comprehensive testing of analytics features requires diverse datasets with various patterns and edge cases

**Benefits:**
- **Immediate Testing**: ML models can be tested and validated immediately
- **Realistic Scenarios**: Synthetic data includes patterns that may take months to observe in real data
- **Development Speed**: Faster iteration on analytics features
- **Production Ready**: System works seamlessly when real HealthKit data accumulates over time

**Trade-offs:**
- Synthetic data may not capture all real-world edge cases
- Initial insights may be based on synthetic patterns, but this transitions naturally to real data


### 4. AI Integration

#### Decision: OpenAI GPT-5 for Insight Generation

## Rationale  

GPT-5 was chosen because it consistently produces natural, human-like insights that feel authentic and relevant. It’s flexible enough to handle multiple types of outputs — from daily summaries to weekly reflections and anomaly detection — without needing a different setup for each case.  

## Prompt Engineering Strategy  

The prompting strategy is designed to make GPT’s output structured, consistent, and apporpiate for the nature of the app. Each prompt follows a defined template with clear instructions and expected output formats. User-specific context, like their name, health stats, and recent patterns, is always included to improve personalization. The output format is standardized in JSON so the app can easily parse and display insights. Prompts are refined over time based on real output quality and user feedback to continuously improve the system’s accuracy and tone.  


### 5. Performance & Optimization

#### Decision: Caching ML Analysis Results

**Rationale:**
- ML analysis is computationally expensive
- Results don't change unless new data is added
- Cache TTL of 1 hour balances freshness and performance
- Reduces backend load and improves response times

**Implementation:**
- Store analysis results in `analysis_results` table
- Check cache before running new analysis
- Invalidate cache when new health data is synced

#### Decision: Batch Health Data Sync

**Rationale:**
- Reduces number of API calls
- More efficient database operations
- Better error handling (retry failed batches)
- Improved user experience (faster sync)

**Implementation:**
```typescript
api.healthData.batchSync(userId, records);
```

## Data Flow

### Initial Data Setup (Development)


### Health Data Collection Flow

```
1. User opens app
   ↓
2. App requests HealthKit authorization
   ↓
3. User grants/denies permissions
   ↓
4. App fetches health data from HealthKit
   ↓
5. Data formatted and sent to backend API
   ↓
6. Backend validates and stores in Supabase
   - New HealthKit data is added to existing dataset
   - Combines with synthetic baseline data (if present)
   ↓
7. Backend triggers ML analysis (if needed)
   ↓
8. Results cached for future requests
```

### ML Analysis Flow

```
1. User requests analytics (or automatic trigger)
   ↓
2. Backend checks cache for recent analysis
   ↓
3. If cache miss or stale:
   a. Fetch health data from Supabase
      - Includes both synthetic baseline and real HealthKit data
      - Combined dataset provides sufficient history for analysis
   b. Clean and preprocess data
   c. Run ML analysis pipeline:
      - Correlation analysis
      - Anomaly detection
      - Trend analysis
      - Pattern detection
   d. Store results in cache
   ↓
4. Return results to mobile app
   ↓
5. App visualizes results in charts/graphs
```

**Note:** ML models run on the combined dataset (synthetic + real HealthKit data). As users continue using the app, real HealthKit data gradually replaces the synthetic baseline, providing increasingly personalized insights.

### AI Insight Generation Flow

```
1. User views Insights tab (or daily tip requested)
   ↓
2. Backend fetches user's health data and ML analysis
   ↓
3. Backend constructs prompt with:
   - User context (name, recent metrics)
   - ML analysis results (correlations, anomalies)
   - Insight type (daily, weekly, anomaly)
   ↓
4. Backend calls OpenAI API with prompt
   ↓
5. GPT-5 generates personalized insight
   ↓
6. Backend stores insight in database
   ↓
7. Mobile app displays insight to user
```
---

### Privacy & Security Implementation

Privacy and security are baked into how the app handles health data from end to end. Every HealthKit permission is requested individually, with clear explanations in the iOS `Info.plist` so users always know why data is being accessed. Users stay in control — they can approve or deny any metric, revoke access anytime in iOS Settings, and sync data only when they choose. The app follows data minimization principles, collecting only what’s needed to power insights, nothing more.  

All data is encrypted both at rest and in transit. Supabase’s PostgreSQL handles storage with built-in encryption and row-level security, so each user’s data is fully isolated by `user_id`. API calls run over HTTPS/TLS, and the app never logs or exposes health data in debugging or error messages. OpenAI is the only external service that ever touches data — strictly for generating insights. 

---

### Key Privacy & Security Considerations

Even with these safeguards, scaling to production brings a few realities worth noting. Because health data lives in Supabase (a managed cloud service), users should understand their data is stored off-device. Supabase’s SOC 2 and GDPR compliance provide strong protection, but self-hosting could be an option later for users who want full control.  

When anonymized health data is sent to OpenAI’s API for insights, it falls under OpenAI’s data usage policies. Future updates could add more control — like opting out of data retention or running models locally for privacy-sensitive users. Similarly, data currently stays in Supabase until the user deletes their account; adding automatic deletion policies for old data would reduce long-term exposure.  

Cross-device sync and potential breaches are always risks for apps handling sensitive info. Strengthening rate limiting, intrusion detection, and incident response plans will further harden security. Finally, building an in-app privacy dashboard could help users see exactly what’s stored, how it’s used, and give them full control over their data.  


## Future Enhancements

### Short-Term 

1. **Android Support**
   - Google Fit integration
   - Android-specific UI optimizations
   - Cross-platform testing

2. **Enhanced ML Models**
   - Time series forecasting
   - Personalized health score
   - Risk prediction models

3. **Social Features**
   - Share insights with friends
   - Group challenges
   - Leaderboards

4. **Notifications**
   - Push notifications for insights
   - Daily reminders
   - Anomaly alerts

### Medium-Term 

1. **Multi-User Support**
   - Family health tracking
   - Caregiver access
   - Shared health goals

2. **Advanced Visualizations**
   - Interactive 3D charts
   - Heat maps for patterns
   - Customizable dashboards

3. **Integration Expansion**
   - More health data sources
   - Wearable device integration
   - Nutrition tracking apps

4. **Personalization**
   - Custom health goals
   - Personalized recommendations
   - Adaptive UI based on usage

### Long-Term 

1. **Predictive Health**
   - Disease risk assessment
   - Early warning systems
   - Preventive care recommendations

2. **Healthcare Integration**
   - Provider data sharing
   - Telemedicine integration
   - Prescription tracking

---

## Conclusion

This health tracking application demonstrates a modern, full-stack approach to health data analytics. By combining real-time data collection, machine learning analytics, and AI-powered insights, the system transforms raw health metrics into actionable, personalized recommendations.

The technical stack leverages industry-standard tools and best practices, ensuring the application is production-ready and can evolve with user needs and technological advances.

