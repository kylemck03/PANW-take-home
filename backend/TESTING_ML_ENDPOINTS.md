# Testing ML Endpoints Guide

This guide shows you how to test all ML endpoints using your user account.

## Your User ID
From your Supabase dashboard:
```
c181dde3-f98c-45ca-b3fa-94be3a482a62
```

## Prerequisites

1. **Server must be running:**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. **Verify health check:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"healthy","environment":"development"}`

3. **Associate data with your user (IMPORTANT!):**
   
   Your `health_data` table currently has NULL `user_id` values. You need to associate data with your user before testing ML endpoints.
   
   **Option A: Associate existing data (Quick)**
   
   Run this SQL in Supabase SQL Editor:
   ```sql
   -- Disable trigger temporarily (fixes updated_at column error)
   ALTER TABLE public.health_data DISABLE TRIGGER update_health_data_updated_at;
   
   -- Update user_id
   UPDATE public.health_data
   SET user_id = 'c181dde3-f98c-45ca-b3fa-94be3a482a62'
   WHERE user_id IS NULL;
   
   -- Re-enable trigger
   ALTER TABLE public.health_data ENABLE TRIGGER update_health_data_updated_at;
   ```
   
   Or use the provided script:
   ```bash
   # Copy the SQL from scripts/associate_data_to_user.sql
   # Paste and run in Supabase SQL Editor
   ```
   
   **Option B: Load new test data (Recommended)**
   
   This creates fresh synthetic data associated with your user:
   ```bash
   cd backend
   source venv/bin/activate
   python scripts/load_test_data.py --days 90
   ```
   
   This will generate 90 days of realistic health data.

4. **Verify you have data:**
   ```bash
   curl "http://localhost:8000/api/health-data/c181dde3-f98c-45ca-b3fa-94be3a482a62?days=30"
   ```
   Should return data with `count > 0`
   
   Or check in Supabase:
   - Go to Supabase Dashboard → Table Editor → `health_data`
   - Filter by `user_id = c181dde3-f98c-45ca-b3fa-94be3a482a62`
   - You should see health data records

## Method 1: Using cURL Commands

### 1. Run Full ML Analysis
This is the main endpoint that runs all ML models:
```bash
curl -X POST "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/analyze?days=90"
```

**What it does:**
- Analyzes correlations between health metrics
- Detects anomalies using Isolation Forest
- Calculates trends over time
- Detects behavioral patterns (sleep-sugar relationships, etc.)
- Stores results in database

**Expected response:**
```json
{
  "correlations": [
    {
      "metric1": "sleep_hours",
      "metric2": "resting_heart_rate",
      "correlation": -0.65,
      "p_value": 0.001,
      "significance": "strong"
    }
  ],
  "anomalies": [
    {
      "date": "2025-11-05",
      "metric": "heart_rate_avg",
      "value": 95,
      "baseline": 72,
      "severity": "moderate"
    }
  ],
  "trends": [
    {
      "metric": "step_count",
      "direction": "increasing",
      "change_percent": 15.3,
      "period_days": 30
    }
  ],
  "patterns": {
    "sleep_sugar_correlation": {
      "exists": true,
      "strength": 0.58
    }
  }
}
```

### 2. Get Correlations Only
```bash
curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/correlations?days=90"
```

### 3. Get Anomalies Only
```bash
curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/anomalies?days=90"
```

### 4. Get Trends Only
```bash
curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/trends?days=90"
```

### 5. Get Health Summary
Quick summary for recent days (useful for insights):
```bash
curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/summary?days=7"
```

### 6. Get User Baselines
View calculated baselines (must run analysis first):
```bash
curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/baselines"
```

### 7. Generate Daily AI Insights
Uses GPT-4 to generate personalized insights:
```bash
curl "http://localhost:8000/api/insights/c181dde3-f98c-45ca-b3fa-94be3a482a62/daily?user_name=Kyle"
```

**Note:** Requires OpenAI API key in `.env`

### 8. Generate Weekly Digest
Comprehensive weekly analysis with AI insights:
```bash
curl "http://localhost:8000/api/insights/c181dde3-f98c-45ca-b3fa-94be3a482a62/weekly?user_name=Kyle"
```

### 9. Get Insights Feed
View all stored insights:
```bash
# All insights
curl "http://localhost:8000/api/insights/c181dde3-f98c-45ca-b3fa-94be3a482a62/feed"

# Only unread insights
curl "http://localhost:8000/api/insights/c181dde3-f98c-45ca-b3fa-94be3a482a62/feed?unread_only=true"

# Filter by type
curl "http://localhost:8000/api/insights/c181dde3-f98c-45ca-b3fa-94be3a482a62/feed?insight_type=daily"
```

## Method 2: Using FastAPI Interactive Docs (Recommended)

The easiest way to test endpoints:

1. **Start your server:**
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Open in browser:**
   ```
   http://localhost:8000/docs
   ```

3. **Test endpoints:**
   - Click on any endpoint (e.g., `POST /api/analytics/{user_id}/analyze`)
   - Click "Try it out"
   - Enter your user_id: `c181dde3-f98c-45ca-b3fa-94be3a482a62`
   - Adjust query parameters (e.g., `days=90`)
   - Click "Execute"
   - See the response below

## Method 3: Using Python Script

Create a test script:

```python
# test_ml_endpoints.py
import requests
import json

BASE_URL = "http://localhost:8000"
USER_ID = "c181dde3-f98c-45ca-b3fa-94be3a482a62"

def test_full_analysis():
    """Test full ML analysis endpoint"""
    url = f"{BASE_URL}/api/analytics/{USER_ID}/analyze"
    response = requests.post(url, params={"days": 90})
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def test_correlations():
    """Test correlations endpoint"""
    url = f"{BASE_URL}/api/analytics/{USER_ID}/correlations"
    response = requests.get(url, params={"days": 90})
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def test_anomalies():
    """Test anomalies endpoint"""
    url = f"{BASE_URL}/api/analytics/{USER_ID}/anomalies"
    response = requests.get(url, params={"days": 90})
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def test_daily_insights():
    """Test daily insights endpoint"""
    url = f"{BASE_URL}/api/insights/{USER_ID}/daily"
    response = requests.get(url, params={"user_name": "Kyle"})
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

if __name__ == "__main__":
    print("Testing ML Endpoints...\n")
    
    print("1. Full Analysis:")
    test_full_analysis()
    
    print("\n2. Correlations:")
    test_correlations()
    
    print("\n3. Anomalies:")
    test_anomalies()
    
    print("\n4. Daily Insights:")
    test_daily_insights()
```

Run it:
```bash
cd backend
source venv/bin/activate
pip install requests  # if not already installed
python test_ml_endpoints.py
```

## Testing Workflow

### Recommended Testing Order:

1. **First, verify data exists:**
   ```bash
   curl "http://localhost:8000/api/health-data/c181dde3-f98c-45ca-b3fa-94be3a482a62?days=30"
   ```

2. **Run full analysis:**
   ```bash
   curl -X POST "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/analyze?days=90"
   ```

3. **Check individual components:**
   ```bash
   # Correlations
   curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/correlations?days=90"
   
   # Anomalies
   curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/anomalies?days=90"
   
   # Trends
   curl "http://localhost:8000/api/analytics/c181dde3-f98c-45ca-b3fa-94be3a482a62/trends?days=90"
   ```

4. **Generate AI insights:**
   ```bash
   curl "http://localhost:8000/api/insights/c181dde3-f98c-45ca-b3fa-94be3a482a62/daily?user_name=Kyle"
   ```

5. **View insights feed:**
   ```bash
   curl "http://localhost:8000/api/insights/c181dde3-f98c-45ca-b3fa-94be3a482a62/feed"
   ```

## Common Issues & Solutions

### Issue: "Insufficient data" error
**Solution:** Make sure you have at least 30 days of data. Check in Supabase:
```sql
SELECT COUNT(DISTINCT date) 
FROM health_data 
WHERE user_id = 'c181dde3-f98c-45ca-b3fa-94be3a482a62';
```

### Issue: Empty correlations/anomalies
**Possible reasons:**
- Not enough data points
- Data doesn't have enough variation
- Try increasing `days` parameter (e.g., `days=180`)

### Issue: OpenAI API errors (for insights endpoints)
**Solution:**
- Check `.env` has valid `OPENAI_API_KEY`
- Verify billing is set up on OpenAI account
- The endpoint will still work but may return fallback insights

### Issue: Connection refused
**Solution:**
- Make sure server is running: `uvicorn app.main:app --reload`
- Check port 8000 is not in use: `lsof -i :8000`

## Expected Response Times

- **Full Analysis:** 2-5 seconds (depends on data size)
- **Individual endpoints:** 0.5-2 seconds
- **AI Insights:** 3-10 seconds (depends on OpenAI API)

## Verifying Results in Supabase

After running analysis, check these tables:

1. **`correlations` table:**
   ```sql
   SELECT * FROM correlations 
   WHERE user_id = 'c181dde3-f98c-45ca-b3fa-94be3a482a62'
   ORDER BY created_at DESC;
   ```

2. **`anomalies` table:**
   ```sql
   SELECT * FROM anomalies 
   WHERE user_id = 'c181dde3-f98c-45ca-b3fa-94be3a482a62'
   ORDER BY date DESC;
   ```

3. **`insights` table:**
   ```sql
   SELECT * FROM insights 
   WHERE user_id = 'c181dde3-f98c-45ca-b3fa-94be3a482a62'
   ORDER BY created_at DESC;
   ```

## Next Steps

Once endpoints are working:
1. Integrate with your React Native app
2. Set up scheduled analysis (cron job or background task)
3. Add more ML models as needed
4. Monitor performance and optimize

