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
- **Build Tool**: Vite

### Deployment
- **Backend**: Render.com
- **Frontend**: Vercel
- **Version Control**: GitHub

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### System Requirements

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **Python**: 3.10 or higher ([Download](https://www.python.org/))
- **Git**: Latest version ([Download](https://git-scm.com/))
- **MongoDB**: Local installation or MongoDB Atlas account ([Setup Guide](https://docs.mongodb.com/manual/installation/))

### Accounts Required

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- [Groq API Key](https://console.groq.com/) (free tier available)
- [Gmail Account](https://mail.google.com/) (for email notifications - optional)

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

#### Step 4: Configure Environment Variables

Create a `.env` file in the `backend` directory.

#### Step 5: Verify Backend Installation

```bash
python main.py
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

#### Step 3: Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_BASE=http://localhost:8000

# Optional: Add any other configuration
VITE_VERSION=1.0.0
```

#### Step 4: Verify Frontend Installation

```bash
npm run build
```

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

### Step 3: Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:3000`

---

## 📁 Project Structure

```
guardplus/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt         # Python dependencies
│   ├── render.yaml              # Render deployment config
│   └── dataset/                 # Face recognition datasets
│
├── frontend/
│   ├── index.html               # Vite entry HTML
│   ├── vite.config.js           # Vite configuration
│   ├── src/
│   │   ├── api.js               # API client configuration
│   │   ├── App.jsx              # Main App component
│   │   ├── index.jsx            # React entry point
│   │   ├── styles.css           # Global styles
│   │   ├── components/
│   │   │   ├── CameraCapture.jsx   # Camera interface
│   │   │   ├── Navbar.jsx          # Navigation bar
│   │   │   ├── PassCard.jsx        # Pass display card
│   │   │   ├── QRScanner.jsx       # QR scanner
│   │   │   └── VisitorCard.jsx     # Visitor info card
│   │   └── pages/
│   │       ├── Home.jsx         # Landing page
│   │       ├── Register.jsx     # Visitor registration
│   │       ├── Pass.jsx         # Pass details
│   │       ├── Scan.jsx         # QR scanning
│   │       ├── Dashboard.jsx    # Analytics dashboard
│   │       └── Guards.jsx       # Guard management
│   ├── dist/                    # Production build (Vite)
│   ├── package.json
│   └── .env                     # Environment configuration
│
├── README.md                    # This file
├── DEPLOYMENT.md                # Deployment guide
├── vercel.json                  # Vercel deployment config
└── .env                         # Root environment vars
```

---

## 📡 API Endpoints

### Base URL
- Development: `http://localhost:8000`
- Production: `https://guardplus-api.onrender.com`

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
#    - Framework: Vite
#    - Root: frontend
#    - Build: npm run build
#    - Output: dist

# 5. Set VITE_API_BASE to your Render backend URL
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed steps.

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Frontend Issues

**Issue**: `npm install` fails
- **Solution**: 
  ```bash
  rm -rf node_modules package-lock.json
  npm install --legacy-peer-deps
  ```

**Issue**: Environmental variable not loading
- **Solution**: 
  - Restart development server after changing `.env`
  - Ensure `.env` is in `frontend` directory (not root)
  - Variables must start with `VITE_`

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

**Last Updated**: May 2026
**Version**: 3.0.0
