# Deployment Guide: GuardPlus

## Backend Deployment (Render)

### Steps:

1. **Fork/Push your code to GitHub** (Render uses GitHub for deployment)

2. **Go to [render.com](https://render.com) and sign up**

3. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

4. **Configure the service:**
   - Name: `guardplus-api`
   - Environment: `Python 3.11`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `backend`

5. **Set Environment Variables:**
   - `MONGO_URI`: Your MongoDB connection string (get from MongoDB Atlas)
   - `GROQ_API_KEY`: Your Groq API key

6. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically deploy on every push to main branch

### Get Your Backend URL:
After deployment, you'll get a URL like: `https://guardplus-api.onrender.com`

---

## Frontend Deployment (Vercel)

### Steps:

1. **Go to [vercel.com](https://vercel.com) and sign up**

2. **Import your project:**
   - Click "New Project" → "Import Git Repository"
   - Connect your GitHub repository
   - Select the repository

3. **Configure the project:**
   - Framework Preset: `Create React App`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

4. **Set Environment Variables:**
   - Add `REACT_APP_API_URL` with value: `https://guardplus-api.onrender.com` (update with your actual backend URL)

5. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically deploy on every push to main branch

### Get Your Frontend URL:
After deployment, you'll get a URL like: `https://guardplus.vercel.app`

---

## Update Frontend API Configuration

**In `frontend/src/api.js`**, update the API base URL:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  // ... rest of config
});
```

---

## MongoDB Setup (if not already done)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with username and password
4. Get your connection string
5. Use this as `MONGO_URI` environment variable

---

## Additional Notes

- **Render free tier** has limitations (sleeps after 15 min of inactivity on free tier). Upgrade if needed.
- **Vercel free tier** is great for the frontend, no limitations.
- Always use environment variables for sensitive data (keys, URIs)
- After first deployment, enable automatic deployments from GitHub in both platforms
