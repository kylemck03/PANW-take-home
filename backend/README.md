# Health Insights Backend API

ML-powered health analytics backend built with FastAPI.

## Quick Start

### 1. Set Up Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key (from Supabase dashboard)
- `OPENAI_API_KEY` - OpenAI API key for GPT-4 insights

### 3. Apply Database Schema

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase_schema.sql`
4. Run the schema

### 4. Run the Server

```bash
# Development mode (auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Server will be available at: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration & settings
│   ├── models/
│   │   ├── __init__.py
│   │   ├── ml_models.py     # ML functions from notebook
│   │   └── schemas.py       # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── supabase_service.py  # Database operations
│   │   ├── ml_service.py        # ML analysis pipeline
│   │   └── openai_service.py    # GPT-4 integration
│   └── api/
│       ├── __init__.py
│       ├── health_data.py   # Health data endpoints
│       ├── analytics.py     # ML analysis endpoints
│       └── insights.py      # AI insights endpoints
├── scripts/
│   └── load_test_data.py    # Load synthetic data
├── .env.example
├── .gitignore
├── requirements.txt
├── supabase_schema.sql
└── README.md
```

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check

### Health Data
- `POST /api/health-data/{user_id}/sync` - Sync health data
- `GET /api/health-data/{user_id}?days=90` - Fetch historical data

### Analytics
- `POST /api/analytics/{user_id}/analyze` - Run full ML analysis
- `GET /api/analytics/{user_id}/correlations` - Get correlations
- `GET /api/analytics/{user_id}/anomalies` - Get anomalies
- `GET /api/analytics/{user_id}/trends` - Get trends
- `GET /api/analytics/{user_id}/patterns` - Get behavioral patterns

### Insights
- `GET /api/insights/{user_id}/daily` - Daily insights
- `GET /api/insights/{user_id}/weekly` - Weekly digest
- `GET /api/insights/{user_id}/feed` - All insights feed
- `POST /api/insights/{user_id}/mark-read/{insight_id}` - Mark insight as read

## Testing

### Verify Your Data

Check that your data is loaded in Supabase:
1. Go to Supabase Dashboard → Table Editor
2. Click on `health_data` table
3. Verify you have data for your user

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Run ML analysis
curl -X POST http://localhost:8000/api/analytics/USER_ID/analyze

# Get insights
curl http://localhost:8000/api/insights/USER_ID/feed
```

## Development

### Adding New ML Models

1. Add function to `app/models/ml_models.py`
2. Integrate in `app/services/ml_service.py`
3. Create endpoint in appropriate router

### Adding New Endpoints

1. Create route in `app/api/` directory
2. Import router in `app/main.py`
3. Test with FastAPI docs at `/docs`

## Deployment

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Render

1. Connect GitHub repository
2. Select "Web Service"
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## License

MIT

