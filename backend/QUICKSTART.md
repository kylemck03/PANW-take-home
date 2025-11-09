# 🚀 Quick Start Guide

Get your backend running in under 10 minutes!

## Step 1: Set Up Environment (2 mins)

```bash
# Navigate to backend
cd /Users/kylemcknight/Downloads/PANW-take-home/backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Step 2: Configure Environment Variables (2 mins)

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use any text editor
```

**Required credentials:**

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
OPENAI_API_KEY=sk-your-openai-key-here
```

**Where to find them:**
- **Supabase**: https://supabase.com/dashboard → Your Project → Settings → API
  - Copy "Project URL" → `SUPABASE_URL`
  - Copy "service_role" key → `SUPABASE_SERVICE_KEY`
- **OpenAI**: https://platform.openai.com/api-keys
  - Create new key → `OPENAI_API_KEY`

## Step 3: Apply Database Schema (2 mins)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in sidebar
4. Click "New Query"
5. Copy entire contents of `supabase_schema.sql`
6. Paste and click "Run"
7. Verify: Check "Table Editor" - should see 8 tables

## Step 4: Start the Server (1 min)

```bash
# Start development server
uvicorn app.main:app --reload

# You should see:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     🚀 Health Insights API starting up
```

**Test it:**
```bash
# In another terminal:
curl http://localhost:8000/health

# Should return: {"status":"healthy","environment":"development"}
```

## Step 5: ✅ Data Already Loaded!

Your health data is already in Supabase - you're all set!

**Optional: Add more data via API**

```bash
# Example: Sync today's data
curl -X POST http://localhost:8000/api/health-data/YOUR_USER_UUID/sync \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-09",
    "metrics": {
      "sleep_hours": 7.5,
      "step_count": 8500,
      "resting_heart_rate": 62,
      "hrv_sdnn": 55
    },
    "source": "healthkit"
  }'
```

## Step 6: Test the ML Pipeline (2 mins)

```bash
# Run full ML analysis
curl -X POST "http://localhost:8000/api/analytics/YOUR_USER_UUID/analyze?days=90"

# This will:
# ✓ Analyze correlations
# ✓ Detect anomalies
# ✓ Calculate trends
# ✓ Detect patterns (sleep-sugar, etc.)
# ✓ Store results in database

# Should return JSON with:
# {
#   "correlations": [...],
#   "anomalies": [...],
#   "trends": [...],
#   "patterns": {...}
# }
```

## Step 7: Generate AI Insights (1 min)

```bash
# Generate daily insights using GPT-4
curl "http://localhost:8000/api/insights/YOUR_USER_UUID/daily?user_name=Kyle"

# Should return AI-generated insights like:
# {
#   "insights": "Great job on getting 7.5 hours of sleep! Your body..."
# }
```

## 🎉 Success!

Your backend is now running! Next steps:

### View API Documentation
Visit: http://localhost:8000/docs

Interactive API docs with all endpoints.

### Check Your Data
1. Go to Supabase dashboard
2. Click "Table Editor"
3. Browse tables: `health_data`, `insights`, `correlations`, `anomalies`

### Connect Mobile App
Now you can connect your React Native app:

```typescript
// take-home/lib/api.ts
const API_URL = 'http://localhost:8000';

export const api = {
  analyzeHealth: async (userId: string) => {
    const res = await fetch(`${API_URL}/api/analytics/${userId}/analyze`, {
      method: 'POST'
    });
    return res.json();
  },
  
  getDailyInsights: async (userId: string) => {
    const res = await fetch(`${API_URL}/api/insights/${userId}/daily`);
    return res.json();
  }
};
```

## Common Issues & Solutions

### Issue: "ModuleNotFoundError"
**Solution:** Make sure virtual environment is activated:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: "Supabase connection error"
**Solution:** 
1. Check `.env` has correct URL and key
2. Make sure you used `SUPABASE_SERVICE_KEY` not `SUPABASE_ANON_KEY`
3. Test connection:
```python
from app.config import settings
print(settings.supabase_url)  # Should print your URL
```

### Issue: "Insufficient data" error
**Solution:** Make sure you have at least 30 days of data in Supabase. Check the `health_data` table in your Supabase dashboard.

### Issue: OpenAI API errors
**Solution:**
1. Check API key is valid: https://platform.openai.com/api-keys
2. Ensure billing is set up
3. For testing, the app has fallback insights if OpenAI fails

## Next: Mobile Integration

Now that your backend works, integrate with your React Native app:

1. **Create API client** (`take-home/lib/api.ts`)
2. **Update HomeScreen** to fetch insights
3. **Add HealthKit sync** to send real data
4. **Display insights** in a beautiful UI

See `IMPLEMENTATION_PLAN.md` for detailed steps!

---

**Need help?** Check the logs:
```bash
# Backend logs show detailed info
tail -f uvicorn.log  # If you redirected output
# Or just watch the terminal where uvicorn is running
```

