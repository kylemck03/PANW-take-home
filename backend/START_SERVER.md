# 🚀 How to Start the Server

## The Correct Way

```bash
# Navigate to backend directory
cd /Users/kylemcknight/Downloads/PANW-take-home/backend

# Activate virtual environment
source venv/bin/activate

# Option 1: Use Python module (RECOMMENDED - always uses venv Python)
python -m uvicorn app.main:app --reload

# Option 2: Use uvicorn directly (only if venv is activated)
uvicorn app.main:app --reload
```

## ✅ What You Should See

```
INFO:     Will watch for changes in these directories: ['/Users/kylemcknight/Downloads/PANW-take-home/backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     🚀 Health Insights API starting up (env: development)
INFO:     📊 ML Configuration: min_data_points=30, baseline_days=90
INFO:     Application startup complete.
```

## 🔧 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'pydantic_settings'"

**Problem:** You're using the system Python instead of the venv Python.

**Solution:** Use `python -m uvicorn` instead of just `uvicorn`:
```bash
python -m uvicorn app.main:app --reload
```

### Error: "Address already in use"

**Problem:** Port 8000 is already taken by another process.

**Solution 1:** Kill the existing process
```bash
lsof -ti:8000 | xargs kill -9
```

**Solution 2:** Use a different port
```bash
python -m uvicorn app.main:app --reload --port 8001
```

### Error: "Can't find .env file" or config errors

**Problem:** Missing or incorrect `.env` file.

**Solution:** Make sure `.env` exists with correct values:
```bash
# Check if .env exists
ls -la .env

# View contents (be careful - contains secrets!)
cat .env

# Should have:
# SUPABASE_URL=...
# SUPABASE_SERVICE_KEY=...
# OPENAI_API_KEY=...
```

## 🧪 Quick Test

Once server is running, test it:

```bash
# In a NEW terminal window
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","environment":"development"}
```

## 📚 API Documentation

Once server is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 🎯 Next Steps After Server Starts

1. **Test Health Check**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Run ML Analysis** (replace YOUR_USER_UUID)
   ```bash
   curl -X POST "http://localhost:8000/api/analytics/YOUR_USER_UUID/analyze?days=90"
   ```

3. **Generate Daily Insights**
   ```bash
   curl "http://localhost:8000/api/insights/YOUR_USER_UUID/daily?user_name=Kyle"
   ```

4. **View in Browser**
   - Go to: http://localhost:8000/docs
   - Try out endpoints interactively

## 💡 Pro Tips

1. **Keep this terminal open** - The server needs to stay running
2. **Use a new terminal** for testing API calls
3. **Check logs** in the server terminal for debugging
4. **Press CTRL+C** to stop the server

## 🔍 Verifying Your Setup

```bash
# Make sure you're using the venv Python
which python
# Should show: /Users/kylemcknight/Downloads/PANW-take-home/backend/venv/bin/python

# Check uvicorn is from venv
which uvicorn
# Should show: /Users/kylemcknight/Downloads/PANW-take-home/backend/venv/bin/uvicorn

# Verify packages
pip list | grep -E "fastapi|uvicorn|pydantic"
```

## ✅ You're Ready!

Your backend is fully set up. Just run:
```bash
python -m uvicorn app.main:app --reload
```

And you're good to go! 🚀

