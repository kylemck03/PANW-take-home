# 🚀 Implementation Plan: Health Insights App

## ✅ What's Already Done

- [x] **ML Models** - Complete anomaly detection, correlation analysis, trend analysis, pattern detection
- [x] **Database Schema** - Comprehensive Supabase schema with 8 tables, RLS policies, indexes
- [x] **Mobile App Foundation** - React Native app with auth, navigation, basic UI
- [x] **Synthetic Data Generator** - 90 days of realistic health data for testing

---

## 📍 Current Status

**You are here:** Database schema created, ready to build the backend.

**Next milestone:** Backend API that serves ML insights to mobile app.

---

## 🎯 Phase 1: Backend Setup (This Week - 8-12 hours)

### Step 1: Initialize FastAPI Project (30 mins)

```bash
# Navigate to backend directory
cd /Users/kylemcknight/Downloads/PANW-take-home/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install core dependencies
pip install fastapi uvicorn python-dotenv
pip install supabase
pip install pandas numpy scikit-learn scipy
pip install openai

# Save dependencies
pip freeze > requirements.txt
```

**Create project structure:**
```bash
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py          # Pydantic models
│   │   └── ml_models.py        # ML functions from notebook
│   ├── services/
│   │   ├── __init__.py
│   │   ├── supabase_service.py # Database operations
│   │   ├── ml_service.py       # ML analysis pipeline
│   │   └── openai_service.py   # GPT-4 integration
│   └── api/
│       ├── __init__.py
│       ├── health_data.py      # /health-data endpoints
│       ├── analytics.py        # /analytics endpoints
│       └── insights.py         # /insights endpoints
├── .env
├── .gitignore
├── requirements.txt
└── supabase_schema.sql         ✅ (Already created!)
```

### Step 2: Apply Database Schema (10 mins)

1. **Go to your Supabase project**
   - Visit: https://supabase.com/dashboard
   - Select your project
   - Go to SQL Editor

2. **Run the schema**
   - Copy contents of `backend/supabase_schema.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Verify all tables created (8 tables expected)

3. **Save your credentials**
   ```bash
   # Create .env file
   touch .env
   ```

   ```env
   # Add to .env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-key
   ENVIRONMENT=development
   ```

### Step 3: Create Core Files (2-3 hours)

#### A. `app/config.py`
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    openai_api_key: str
    environment: str = "development"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

#### B. `app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health_data, analytics, insights

app = FastAPI(
    title="Health Insights API",
    version="1.0.0",
    description="ML-powered health analytics backend"
)

# CORS for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_data.router, prefix="/api/health-data", tags=["health-data"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])

@app.get("/")
def root():
    return {"message": "Health Insights API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

#### C. `app/services/supabase_service.py`
```python
from supabase import create_client, Client
from app.config import get_settings
from typing import List, Dict, Optional
import pandas as pd
from datetime import datetime, timedelta

settings = get_settings()
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)

class SupabaseService:
    """Service for all database operations"""
    
    async def get_health_data(self, user_id: str, days: int = 90) -> pd.DataFrame:
        """Fetch user's health data for ML analysis"""
        start_date = (datetime.now() - timedelta(days=days)).date()
        
        response = supabase.table("health_data") \
            .select("*") \
            .eq("user_id", user_id) \
            .gte("date", str(start_date)) \
            .order("date", desc=False) \
            .execute()
        
        if not response.data:
            return pd.DataFrame()
        
        return pd.DataFrame(response.data)
    
    async def upsert_health_data(self, user_id: str, date: str, metrics: Dict) -> Dict:
        """Insert or update health data for a specific date"""
        data = {
            "user_id": user_id,
            "date": date,
            **metrics
        }
        
        response = supabase.table("health_data").upsert(data).execute()
        return response.data[0] if response.data else None
    
    async def store_anomaly(self, user_id: str, anomaly_data: Dict) -> Dict:
        """Store detected anomaly"""
        response = supabase.table("anomalies").insert(anomaly_data).execute()
        return response.data[0] if response.data else None
    
    async def store_correlation(self, user_id: str, correlation_data: Dict) -> Dict:
        """Store detected correlation"""
        response = supabase.table("correlations").insert(correlation_data).execute()
        return response.data[0] if response.data else None
    
    async def store_pattern(self, user_id: str, pattern_data: Dict) -> Dict:
        """Store detected behavioral pattern"""
        response = supabase.table("patterns").insert(pattern_data).execute()
        return response.data[0] if response.data else None
    
    async def create_insight(self, user_id: str, insight_data: Dict) -> Dict:
        """Create AI-generated insight"""
        response = supabase.table("insights").insert(insight_data).execute()
        return response.data[0] if response.data else None
    
    async def get_insights(
        self, 
        user_id: str, 
        insight_type: Optional[str] = None,
        unread_only: bool = False
    ) -> List[Dict]:
        """Fetch user's insights"""
        query = supabase.table("insights") \
            .select("*") \
            .eq("user_id", user_id)
        
        if insight_type:
            query = query.eq("insight_type", insight_type)
        
        if unread_only:
            query = query.eq("is_read", False)
        
        response = query.order("priority", desc=True) \
            .order("created_at", desc=True) \
            .execute()
        
        return response.data
    
    async def get_user_baselines(self, user_id: str) -> Optional[Dict]:
        """Get user's latest baselines"""
        response = supabase.table("user_baselines") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("calculation_date", desc=True) \
            .limit(1) \
            .execute()
        
        return response.data[0] if response.data else None
    
    async def store_baselines(self, user_id: str, baselines: Dict) -> Dict:
        """Store calculated baselines"""
        response = supabase.table("user_baselines").insert(baselines).execute()
        return response.data[0] if response.data else None

db_service = SupabaseService()
```

### Step 4: Port ML Functions (2-3 hours)

**Copy your notebook functions to `app/models/ml_models.py`:**

Key functions to port:
1. `analyze_correlations()` ✅
2. `detect_anomalies()` ✅
3. `analyze_trends()` ✅
4. `analyze_lagged_correlations()` ✅
5. `detect_sleep_sugar_pattern()` ✅
6. `analyze_anomaly_context()` ✅
7. `analyze_anomaly_precursors()` ✅
8. `generate_anomaly_explanation()` ✅

**Wrap them in a service class (`app/services/ml_service.py`):**

```python
from app.models.ml_models import *
from app.services.supabase_service import db_service
import pandas as pd
from datetime import datetime

class MLAnalysisService:
    """Orchestrates ML analysis pipeline"""
    
    async def run_full_analysis(self, user_id: str, days: int = 90) -> Dict:
        """Run complete ML pipeline for a user"""
        
        # 1. Fetch data
        df = await db_service.get_health_data(user_id, days)
        
        if len(df) < 30:  # Need minimum data
            return {"error": "Insufficient data (need at least 30 days)"}
        
        results = {}
        
        # 2. Correlation Analysis
        correlations_df, _ = analyze_correlations(df)
        results['correlations'] = correlations_df.to_dict('records')
        
        # Store top correlations in DB
        for _, corr in correlations_df.head(10).iterrows():
            await db_service.store_correlation(user_id, {
                "user_id": user_id,
                "metric_a": corr['metric_a'],
                "metric_b": corr['metric_b'],
                "correlation_value": float(corr['correlation']),
                "p_value": float(corr['p_value']),
                "strength": corr['strength'],
                "direction": corr['direction'],
                "sample_size": len(df)
            })
        
        # 3. Anomaly Detection
        anomalies_df, analyzed_features = detect_anomalies(df)
        anomalies = anomalies_df[anomalies_df['is_anomaly']]
        results['anomalies'] = anomalies.to_dict('records')
        
        # Analyze context for recent anomalies
        baseline_stats = {
            col: {'mean': df[col].mean(), 'std': df[col].std()}
            for col in analyzed_features
        }
        
        for _, anomaly_row in anomalies.tail(5).iterrows():
            # Store anomaly
            await db_service.store_anomaly(user_id, {
                "user_id": user_id,
                "date": str(anomaly_row['date'].date()),
                "primary_metric": "multi_metric",
                "anomaly_score": float(anomaly_row['anomaly_score']),
                "severity": "high" if anomaly_row['anomaly_score'] < -0.6 else "moderate"
            })
        
        # 4. Trend Analysis
        _, trends_df = analyze_trends(df)
        results['trends'] = trends_df.to_dict('records')
        
        # 5. Pattern Detection
        sleep_sugar_pattern = detect_sleep_sugar_pattern(df)
        if sleep_sugar_pattern['pattern_detected']:
            await db_service.store_pattern(user_id, {
                "user_id": user_id,
                "pattern_type": "sleep_sugar",
                "pattern_name": "Poor Sleep Leads to Sugar Cravings",
                "predictor_metric": "sleep_hours",
                "outcome_metric": "dietary_sugar",
                "lag_days": 1,
                "p_value": float(sleep_sugar_pattern['p_value']),
                "percent_change": float(sleep_sugar_pattern['percent_change']),
                "threshold_value": float(sleep_sugar_pattern['sleep_threshold']),
                "confidence_level": "high" if sleep_sugar_pattern['statistically_significant'] else "medium",
                "narrative": f"When you sleep less than {sleep_sugar_pattern['sleep_threshold']}h, your sugar intake changes by {sleep_sugar_pattern['percent_change']:.0f}% the next day."
            })
        
        results['patterns'] = {
            'sleep_sugar': sleep_sugar_pattern
        }
        
        return results

ml_service = MLAnalysisService()
```

### Step 5: Create API Endpoints (2 hours)

#### `app/api/analytics.py`
```python
from fastapi import APIRouter, HTTPException
from app.services.ml_service import ml_service

router = APIRouter()

@router.post("/{user_id}/analyze")
async def run_analysis(user_id: str, days: int = 90):
    """Run full ML analysis for user"""
    try:
        results = await ml_service.run_full_analysis(user_id, days)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/correlations")
async def get_correlations(user_id: str):
    """Get user's detected correlations"""
    # Implement fetching from DB
    pass

@router.get("/{user_id}/anomalies")
async def get_anomalies(user_id: str, days: int = 30):
    """Get recent anomalies"""
    # Implement fetching from DB
    pass
```

### Step 6: Test the Backend (1 hour)

```bash
# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/

# Test with synthetic data (next step)
```

### Step 7: Load Synthetic Data for Testing (1 hour)

Create `scripts/load_test_data.py`:

```python
import sys
sys.path.append('..')

from app.services.supabase_service import db_service
import pandas as pd
import asyncio

async def load_synthetic_data():
    """Load synthetic data from notebook CSV"""
    
    # Read the CSV generated by your notebook
    df = pd.read_csv('../synthetic_health_data.csv')
    
    # Use a test user ID (create this user in Supabase first)
    test_user_id = "YOUR_TEST_USER_UUID"
    
    print(f"Loading {len(df)} days of data for user {test_user_id}...")
    
    for _, row in df.iterrows():
        metrics = {
            "sleep_hours": float(row['sleep_hours']),
            "step_count": int(row['step_count']),
            "resting_heart_rate": int(row['resting_heart_rate']),
            "hrv_sdnn": int(row['hrv_sdnn']),
            "heart_rate_avg": int(row['heart_rate_avg']),
            "active_energy_burned": int(row['active_energy_burned']),
            "exercise_time_minutes": int(row['exercise_time_minutes']),
            "distance_walking_running": float(row['distance_walking_running']),
            "distance_cycling": float(row['distance_cycling']),
            "walking_speed": float(row['walking_speed']),
            "vo2_max": float(row['vo2_max']),
            "dietary_energy_consumed": int(row['dietary_energy_consumed']),
            "dietary_sugar": int(row['dietary_sugar']),
            "dietary_water": float(row['dietary_water']),
            "body_mass": float(row['body_mass']),
            "height": float(row['height'])
        }
        
        date = str(pd.to_datetime(row['date']).date())
        await db_service.upsert_health_data(test_user_id, date, metrics)
        print(f"Loaded data for {date}")
    
    print("✅ Test data loaded successfully!")

if __name__ == "__main__":
    asyncio.run(load_synthetic_data())
```

Run it:
```bash
cd backend
python scripts/load_test_data.py
```

---

## 🎯 Phase 2: AI Integration (Next Week - 4-6 hours)

### Step 8: OpenAI Service (2 hours)

Create `app/services/openai_service.py`:

```python
import openai
from app.config import get_settings
from typing import Dict, List

settings = get_settings()
openai.api_key = settings.openai_api_key

class OpenAIService:
    """Service for GPT-4 insight generation"""
    
    async def generate_daily_insights(self, health_summary: Dict) -> str:
        """Generate morning insights"""
        prompt = f"""You are a caring health coach.

Yesterday's Health Summary:
- Sleep: {health_summary['sleep_hours']}h
- Steps: {health_summary['step_count']:,}
- Resting HR: {health_summary['resting_heart_rate']}bpm
- HRV: {health_summary['hrv_sdnn']}ms

Generate 1-2 brief, actionable insights (2-3 sentences each).
Be warm, encouraging, and specific."""

        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an empathetic health coach."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        return response.choices[0].message.content
    
    async def explain_anomaly(self, anomaly_context: Dict) -> str:
        """Generate empathetic anomaly explanation"""
        prompt = f"""Explain this health anomaly caringly:

On {anomaly_context['date']}, {anomaly_context['metric']} was unusually {anomaly_context['direction']}.

Context:
{', '.join(anomaly_context['possible_causes'][:3])}

Write 2-3 sentences that are reassuring but informative."""

        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a caring health advisor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        return response.choices[0].message.content

openai_service = OpenAIService()
```

### Step 9: Insights Generation Endpoint (1 hour)

Create `app/api/insights.py`:

```python
from fastapi import APIRouter, HTTPException
from app.services.openai_service import openai_service
from app.services.supabase_service import db_service
from app.services.ml_service import ml_service

router = APIRouter()

@router.get("/{user_id}/daily")
async def get_daily_insights(user_id: str):
    """Get today's AI-generated insights"""
    try:
        # Get yesterday's data
        df = await db_service.get_health_data(user_id, days=1)
        
        if len(df) == 0:
            raise HTTPException(status_code=404, detail="No recent data")
        
        latest = df.iloc[-1]
        
        # Generate insights
        summary = {
            'sleep_hours': latest['sleep_hours'],
            'step_count': latest['step_count'],
            'resting_heart_rate': latest['resting_heart_rate'],
            'hrv_sdnn': latest['hrv_sdnn']
        }
        
        insights_text = await openai_service.generate_daily_insights(summary)
        
        # Store in database
        await db_service.create_insight(user_id, {
            "user_id": user_id,
            "insight_type": "daily",
            "title": "Your Daily Health Snapshot",
            "narrative": insights_text,
            "priority": 8
        })
        
        return {
            "type": "daily",
            "content": insights_text,
            "date": str(latest['date'])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/feed")
async def get_insights_feed(user_id: str, unread_only: bool = False):
    """Get all insights sorted by priority"""
    insights = await db_service.get_insights(user_id, unread_only=unread_only)
    return insights
```

### Step 10: Test AI Integration (1 hour)

```bash
# Test daily insights
curl http://localhost:8000/api/insights/YOUR_USER_ID/daily

# Check results in Supabase dashboard
```

---

## 🎯 Phase 3: Mobile App Integration (Week After Next - 8-12 hours)

### Step 11: Connect Mobile to Backend (2 hours)

Create `take-home/lib/api.ts`:

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  // Health Data
  syncHealthData: async (userId: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/api/health-data/${userId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  // Analytics
  runAnalysis: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/analytics/${userId}/analyze`, {
      method: 'POST'
    });
    return response.json();
  },
  
  // Insights
  getDailyInsights: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/insights/${userId}/daily`);
    return response.json();
  },
  
  getInsightsFeed: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/insights/${userId}/feed`);
    return response.json();
  }
};
```

### Step 12: Update HomeScreen with Real Data (3 hours)

Modify `take-home/app/screens/HomeScreen.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export default function HomeScreen() {
  const { user } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadInsights();
  }, []);
  
  const loadInsights = async () => {
    try {
      const data = await api.getInsightsFeed(user.id);
      setInsights(data);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update UI to show real insights...
}
```

### Step 13: Build Insights Screen (3 hours)

Create `take-home/app/(tabs)/insights.tsx`:

```typescript
// Full insights feed with AI-generated cards
// Filter by type (daily, weekly, anomaly, pattern)
// Mark as read functionality
```

### Step 14: Integrate HealthKit (2 hours)

Use your existing `use-healthkit.ts` hook to fetch real data and sync to backend.

---

## 🎯 Phase 4: Polish & Deploy (Final Week - 10-15 hours)

### Step 15: Error Handling & Loading States (2 hours)
### Step 16: Animations & UI Polish (3 hours)
### Step 17: Testing (3 hours)
### Step 18: Deploy Backend (Railway/Render) (2 hours)
### Step 19: TestFlight Build (2 hours)
### Step 20: Final Demo (2 hours)

---

## 📊 Progress Tracking

### Week 1: Backend Foundation ⏳
- [ ] Step 1: Initialize FastAPI
- [ ] Step 2: Apply database schema
- [ ] Step 3: Create core files
- [ ] Step 4: Port ML functions
- [ ] Step 5: Create API endpoints
- [ ] Step 6: Test backend
- [ ] Step 7: Load test data

### Week 2: AI Integration ⏳
- [ ] Step 8: OpenAI service
- [ ] Step 9: Insights endpoints
- [ ] Step 10: Test AI integration

### Week 3: Mobile Integration ⏳
- [ ] Step 11: Connect mobile to backend
- [ ] Step 12: Update HomeScreen
- [ ] Step 13: Build Insights screen
- [ ] Step 14: Integrate HealthKit

### Week 4: Polish & Deploy ⏳
- [ ] Steps 15-20

---

## 🚨 Critical Path (Minimum Viable Product)

If you're short on time, focus on these essentials:

1. **Backend Core** (6 hours)
   - Steps 1-3: Basic FastAPI setup
   - Step 4: Port 3 key ML functions (correlations, anomalies, trends)
   - Step 5: Create 1 endpoint: `/analytics/{user_id}/analyze`

2. **Data Flow** (2 hours)
   - Step 7: Load synthetic data
   - Test ML pipeline works end-to-end

3. **Mobile Display** (3 hours)
   - Step 11: API client
   - Step 12: Show analysis results in HomeScreen

4. **Demo** (1 hour)
   - Prepare demo flow showing:
     - Data unification (multiple metrics)
     - Correlation insights
     - Anomaly detection with context

**Total: 12 hours for MVP** ✨

---

## 🆘 Troubleshooting

### Common Issues:

**Issue:** `ModuleNotFoundError` for app modules
**Fix:** Make sure `PYTHONPATH` includes backend directory
```bash
export PYTHONPATH="${PYTHONPATH}:/Users/kylemcknight/Downloads/PANW-take-home/backend"
```

**Issue:** Supabase connection fails
**Fix:** Check `.env` has correct credentials, test with:
```python
from supabase import create_client
client = create_client(URL, KEY)
print(client.table("health_data").select("*").limit(1).execute())
```

**Issue:** CORS errors from mobile app
**Fix:** Update `allow_origins` in `main.py` to include your device's IP

**Issue:** OpenAI API errors
**Fix:** Check API key, ensure billing is set up, try gpt-3.5-turbo first

---

## 📞 Next Actions

**Choose your starting point:**

1. **Option A - Start Backend Now (Recommended)**
   ```bash
   cd backend
   # Follow Step 1
   ```

2. **Option B - Test with Synthetic Data First**
   ```bash
   cd backend
   # Follow Step 7 (load test data)
   # Then build API around it
   ```

3. **Option C - Mobile UI First (if backend intimidates you)**
   ```bash
   cd take-home
   # Build insights screen with mock data
   # Connect to backend later
   ```

**I recommend Option A** - building the backend foundation first gives you something tangible to connect the mobile app to.

Ready to start? Let me know which step you want help with! 🚀

