# GuardPlus - Visitor Management & Security System

**GuardPlus** is a comprehensive visitor management and security system designed to streamline facility access control, visitor registration, and security monitoring. It combines facial recognition, QR code scanning, and intelligent pass management to provide a modern security solution.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

GuardPlus is a full-stack web application that provides:

- **Visitor Registration**: Quick and easy visitor check-in with photograph capture
- **QR Code Generation**: Automatic QR code pass generation for visitors
- **QR Code Scanning**: Real-time QR code scanning for entry/exit tracking
- **Facial Recognition**: AI-powered face detection using DeepFace library
- **Pass Management**: Digital pass creation, storage, and PDF export
- **Dashboard Analytics**: Real-time monitoring and statistics
- **Guard Management**: Administrative panel for guard and security staff management
- **Email Notifications**: Automated email notifications for pass generation

---

## ✨ Features

### Core Features

- 📸 **Facial Recognition**: Real-time facial detection and verification using DeepFace
- 🔲 **QR Code System**: Generate, scan, and track visitor passes with QR codes
- 👥 **Visitor Database**: Comprehensive visitor registration and tracking
- 📊 **Dashboard**: Real-time analytics and monitoring
- 👮 **Guard Management**: Manage security staff and permissions
- 📧 **Email Integration**: Automated notifications and pass delivery
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔒 **Secure Authentication**: Backend security with environment-based configuration

### Technical Features

- FastAPI backend with MongoDB integration
- Real-time QR code scanning using html5-qrcode
- Secure API endpoints with CORS configuration
- Environment-based configuration management
- PDF generation for visitor passes
- Camera and webcam integration

---

## 🛠 Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **AI/ML**: DeepFace (facial recognition), OpenCV (image processing)
- **Email**: FastMail (FastAPI Mail)
- **LLM**: Groq API (AI features)
- **Server**: Uvicorn
- **Additional**: Motor (async MongoDB driver), Pydantic (data validation)

### Frontend
- **Framework**: React 19.2.4
- **Routing**: React Router DOM v7
- **QR Code**: html5-qrcode, qrcode.react, react-qr-scanner
- **UI Components**: Lucide React icons
- **Utilities**: html2canvas, jspdf (PDF generation)
- **Build Tool**: Create React App with Webpack

### Deployment
- **Backend**: Render.com
- **Frontend**: Vercel
- **Version Control**: GitHub

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### System Requirements

- **Node.js**: v16 or higher ([Download](https://nodejs.org/))
- **Python**: 3.10 or higher ([Download](https://www.python.org/))
- **Git**: Latest version ([Download](https://git-scm.com/))
- **MongoDB**: Local installation or MongoDB Atlas account ([Setup Guide](https://docs.mongodb.com/manual/installation/))

### Accounts Required

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- [Groq API Key](https://console.groq.com/) (free tier available)
- [Gmail Account](https://mail.google.com/) (for email notifications - optional)

### Tools & IDE

- Visual Studio Code (recommended) or any code editor
- Postman (for API testing - optional)

---

## 🚀 Installation

### Backend Setup

#### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/guardplus.git
cd guardplus
```

#### Step 2: Set Up Python Environment

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

#### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This will install all required packages including:
- FastAPI and Uvicorn (web framework)
- Motor and PyMongo (MongoDB async driver)
- DeepFace and OpenCV (facial recognition)
- FastMail (email service)
- Groq (AI API)
- Python-dotenv (environment configuration)

#### Step 4: Configure Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/guardplus?retryWrites=true&w=majority

# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Email Configuration (Optional)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Getting API Keys:**

- **MongoDB URI**: 
  1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  2. Create a cluster and database user
  3. Click "Connect" and copy the connection string
  4. Replace `username`, `password`, and `password` with your credentials

- **Groq API Key**:
  1. Visit [Groq Console](https://console.groq.com/)
  2. Sign up and create an API key
  3. Copy the key to your `.env` file

#### Step 5: Verify Backend Installation

```bash
python main.py
```

You should see output like:
```
Uvicorn running on http://127.0.0.1:8000
```

---

### Frontend Setup

#### Step 1: Navigate to Frontend Directory

```bash
cd ../frontend
```

#### Step 2: Install Node Dependencies

```bash
npm install
```

This will install all required packages including:
- React and React DOM
- React Router for navigation
- QR code libraries (html5-qrcode, qrcode.react)
- Lucide icons for UI
- Testing libraries

#### Step 3: Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000

# Optional: Add any other configuration
REACT_APP_VERSION=1.0.0
```

#### Step 4: Verify Frontend Installation

```bash
npm test
```

This will run the test suite to ensure everything is set up correctly.

---

## ⚙️ Configuration

### Backend Configuration Details

The backend uses environment variables for all sensitive configuration. Here's what each variable does:

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/guardplus` |
| `GROQ_API_KEY` | API key for Groq LLM service | `gsk_xxxxxxxxxxxxx` |
| `MAIL_USERNAME` | Email address for sending notifications | `noreply@guardplus.com` |
| `MAIL_PASSWORD` | Email app password (not regular password) | `xxxx xxxx xxxx xxxx` |
| `FRONTEND_URL` | Frontend URL for CORS configuration | `http://localhost:3000` |

### Frontend Configuration Details

The frontend uses environment variables to configure API endpoints:

| Variable | Purpose | Default |
|----------|---------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:8000` |

---

## 🏃 Running Locally

### Step 1: Start MongoDB (if running locally)

```bash
# On Windows with MongoDB installed
mongod

# Or use MongoDB Atlas (cloud)
```

### Step 2: Start Backend Server

```bash
cd backend

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Start the server
python main.py
```

Backend will be available at: `http://localhost:8000`

**Access API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Step 3: Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm start
```

Frontend will be available at: `http://localhost:3000`

### Step 4: Test the Application

Open your browser and navigate to `http://localhost:3000`

**Test Flow:**
1. Go to `/register` to register a visitor
2. Capture or upload a photo
3. Generate a pass with QR code
4. Open `/scan` to test QR code scanning
5. View dashboard at `/dashboard`

---

## 📁 Project Structure

```
guardplus/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt         # Python dependencies
│   ├── render.yaml              # Render deployment config
│   ├── test_verify.py           # Testing utils
│   ├── dataset/                 # Face recognition datasets
│   └── __pycache__/             # Python cache
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── api.js               # API client configuration
│   │   ├── App.js               # Main App component
│   │   ├── index.js             # React entry point
│   │   ├── styles.css           # Global styles
│   │   ├── components/
│   │   │   ├── CameraCapture.js    # Camera interface
│   │   │   ├── Navbar.js           # Navigation bar
│   │   │   ├── PassCard.js         # Pass display card
│   │   │   ├── QRScanner.js        # QR scanner
│   │   │   └── VisitorCard.js      # Visitor info card
│   │   └── pages/
│   │       ├── Home.js          # Landing page
│   │       ├── Register.js      # Visitor registration
│   │       ├── Pass.js          # Pass details
│   │       ├── Scan.js          # QR scanning
│   │       ├── Dashboard.js     # Analytics dashboard
│   │       └── Guards.js        # Guard management
│   ├── build/                   # Production build
│   ├── package.json
│   └── .env                     # Environment configuration
│
├── README.md                    # This file
├── DEPLOYMENT.md                # Deployment guide
├── package.json                 # Root package config
├── vercel.json                  # Vercel deployment config
└── .env                         # Root environment vars
```

---

## 📡 API Endpoints

### Base URL
- Development: `http://localhost:8000`
- Production: `https://guardplus-api.onrender.com`

### Key Endpoints

#### Visitor Management
- `POST /register` - Register a new visitor
- `GET /visitors` - Get all visitors
- `GET /visitors/{id}` - Get visitor details
- `PUT /visitors/{id}` - Update visitor info

#### Pass Management
- `POST /pass/generate` - Generate a new pass
- `GET /pass/{id}` - Get pass details
- `GET /pass/qr/{id}` - Get QR code image
- `PUT /pass/{id}/status` - Update pass status
- `GET /pass/export/{id}` - Export pass as PDF

#### Facial Recognition
- `POST /recognize` - Analyze facial features
- `POST /verify` - Verify face match
- `POST /upload-face` - Upload face image

#### Dashboard & Analytics
- `GET /dashboard/stats` - Get system statistics
- `GET /dashboard/visitors-today` - Today's visitors
- `GET /dashboard/analytics` - Analytics data

#### Guard Management
- `GET /guards` - List all guards
- `POST /guards` - Create new guard
- `PUT /guards/{id}` - Update guard info
- `DELETE /guards/{id}` - Remove guard

### Full API Documentation

After starting the backend, access interactive API documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 🚀 Deployment

### Quick Deployment Guide

Full deployment instructions are in [DEPLOYMENT.md](DEPLOYMENT.md). Quick steps:

#### Backend Deployment (Render)

```bash
# 1. Push code to GitHub
git add .
git commit -m "Deploy guardplus"
git push origin main

# 2. Go to render.com
# 3. Create Web Service
# 4. Configure:
#    - Build: pip install -r requirements.txt
#    - Start: uvicorn main:app --host 0.0.0.0 --port $PORT
#    - Root: backend

# 5. Set environment variables in dashboard
```

#### Frontend Deployment (Vercel)

```bash
# 1. Push code to GitHub (same repo)
# 2. Go to vercel.com
# 3. Import project
# 4. Configure:
#    - Framework: Create React App
#    - Root: frontend
#    - Build: npm run build

# 5. Set REACT_APP_API_URL to your Render backend URL
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed steps.

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'fastapi'`
- **Solution**: Ensure virtual environment is activated and run `pip install -r requirements.txt`

**Issue**: `Connection refused - MongoDB not running`
- **Solution**: 
  - If local: Start MongoDB with `mongod`
  - If Atlas: Verify MongoDB URI in `.env` and check IP whitelist on Atlas

**Issue**: `GROQ_API_KEY not found`
- **Solution**: Create a Groq API key at https://console.groq.com/ and add to `.env`

**Issue**: CORS errors in browser console
- **Solution**: Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL

#### Frontend Issues

**Issue**: `npm install` fails
- **Solution**: 
  ```bash
  rm -rf node_modules package-lock.json
  npm cache clean --force
  npm install
  ```

**Issue**: Environmental variable not loading
- **Solution**: 
  - Restart development server after changing `.env`
  - Ensure `.env` is in `frontend` directory (not root)
  - Variables must start with `REACT_APP_`

**Issue**: QR Scanner not working on mobile
- **Solution**: Ensure HTTPS is enabled or app is served over HTTPS for camera access

#### General Issues

**Issue**: `git push` fails with permission error
- **Solution**: 
  ```bash
  git remote set-url origin https://github.com/yourusername/guardplus.git
  ```

**Issue**: Port already in use
- **Solution**:
  - Backend (8000): `lsof -ti:8000 | xargs kill -9`
  - Frontend (3000): `fuser -k 3000/tcp`

### Getting Help

1. Check logs in browser console (`F12`)
2. Check network tab for API errors
3. Check backend terminal for stack traces
4. Review API documentation: `/docs`

---

## 📝 Development Tips

### Best Practices

1. **Always use `.env` files** - Never hardcode sensitive data
2. **Test locally before deployment** - Use `http://localhost:3000`
3. **Keep branches updated** - Regularly pull latest changes
4. **Use meaningful commit messages**
   ```bash
   git commit -m "feat: add facial recognition"
   git commit -m "fix: QR scanner timeout issue"
   ```

### Testing

```bash
# Backend testing
cd backend
pytest test_verify.py -v

# Frontend testing
cd frontend
npm test
```

### Building for Production

```bash
# Frontend production build
cd frontend
npm run build

# Backend production ready (Render handles this)
# Just push code to GitHub
```

---

## 🤝 Contributing

We welcome contributions! Here's how to help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to your fork**: `git push origin feature/amazing-feature`
6. **Open a Pull Request** with a clear description

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📞 Support & Contact

For support, questions, or feature requests:

- Create an issue on GitHub
- Check existing documentation in [DEPLOYMENT.md](DEPLOYMENT.md)
- Review API docs at `/docs` (when backend is running)

---

## 🎉 Getting Started Checklist

- [ ] Clone repository
- [ ] Install Node.js and Python
- [ ] Create MongoDB Atlas account
- [ ] Create Groq API key
- [ ] Set up backend environment
- [ ] Set up frontend environment
- [ ] Run backend server
- [ ] Run frontend development server
- [ ] Test application at `localhost:3000`
- [ ] Deploy to Render and Vercel

---

**Last Updated**: March 2026
**Version**: 2.0.0
