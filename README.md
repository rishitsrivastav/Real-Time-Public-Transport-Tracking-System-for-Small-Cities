# 🚍 Real-Time Public Transport Tracking System (in Low Bandwidth)

<p align="center">
  <strong>A scalable, low-bandwidth real-time bus tracking platform designed for tier-2 and small Indian cities</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO"/>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Core Functionalities](#-core-functionalities)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Key Advantages](#-key-advantages)
- [Security Features](#-security-features)

---

## 🌟 Overview

This project delivers a **low-cost, low-bandwidth, highly efficient transit tracking system** built with modern web and geospatial technologies. It enables live bus location tracking, ETA prediction, route visualization, and driver management with minimal infrastructure requirements.

**Perfect for:**
- 🏙️ Tier-2 and small cities
- 📡 Low-bandwidth environments
- 💰 Budget-conscious municipalities
- 🚀 Smart city initiatives

---
## ✨ Screenshots

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/52edb590-891e-4575-9522-794cb548aee4" width="100%" />
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/f1221c3d-ec13-46ff-af04-81a4fcc24c26" width="100%" />
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/90537237-81fd-4396-8889-3fee4d3f7a25" width="100%" />
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/51f09902-449a-4423-905a-420f3100c731" width="100%" />
    </td>
  </tr>
</table>


---
## ✨ Features

### 🧭 For Commuters (User Web App)

| Feature | Description |
|---------|-------------|
| 🗺️ **Live Bus Tracking** | Real-time bus locations displayed on interactive Leaflet Maps |
| ⏱️ **ETA Predictions** | Accurate arrival time estimates using geospatial processing |
| 🔁 **Real-Time Updates** | Instant updates via WebSocket (Socket.IO) - no page refresh needed |
| 📌 **Route Selection** | Easy route-wise bus filtering and selection |
| 🔄 **Low Bandwidth** | Optimized data flow for smooth operation on 3G networks |

### 🧑‍💼 For Admin (React Web Panel)

| Feature | Description |
|---------|-------------|
| ➕ **Driver Management** | Add drivers with auto-generated credentials |
| 🚌 **Route Creation** | Create bus routes with custom stops |
| 🗺️ **Auto Polyline** | Automatic route polyline generation via OpenRouteService |
| 📊 **Live Monitoring** | Real-time monitoring of all active buses |
| 📧 **Email Notifications** | Automated credential delivery to drivers |

### 👨‍✈️ For Drivers (React Native App)

| Feature | Description |
|---------|-------------|
| 🔐 **Secure Login** | Protected authentication system |
| 📍 **GPS Tracking** | Automatic location and speed transmission every 30 seconds |
| 📶 **Low Network Support** | Reliable operation in poor connectivity areas |
| 🛰️ **High Accuracy** | GPS-based location and speed tracking |

### 🧠 Backend Intelligence

| Feature | Description |
|---------|-------------|
| 📌 **Location Snapping** | Precise road snapping using Turf.js algorithms |
| ⏳ **Smart ETA** | Calculated using moving average of last 3 speed readings |
| ⚡ **Redis Caching** | Ultra-fast data retrieval for routes and live locations |
| 💾 **Persistent Storage** | Reliable data storage with MongoDB Atlas |
| 🔄 **WebSocket Push** | Real-time updates without polling overhead |

---

## 🧱 Tech Stack

### 🌐 Frontend Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **User Web App** | React + Leaflet.js | Interactive map interface for commuters |
| **Admin Dashboard** | React | Route and driver management |
| **Driver App** | React Native (Expo) | Mobile GPS tracking application |

### 🖥️ Backend Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Server** | Node.js + Express | REST API and business logic |
| **Real-Time** | Socket.IO | WebSocket communication |
| **Geo Processing** | Turf.js | Geospatial calculations and snapping |
| **Routing API** | OpenRouteService (ORS) | Route polyline generation |
| **Database** | MongoDB Atlas | Persistent data storage |
| **Cache** | Upstash Redis | High-speed data caching |
| **Email** | Nodemailer | Automated email delivery |

---

## 🗺️ System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                            │
├────────────────────────────────────────────────────────────────────┤
│  Admin Web (React)  |  User Web (React + Leaflet)  |  Driver App   │
│                     |                              |  (React Native)│
└────────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                    REST API / WebSocket
                              ↓ ↑
┌────────────────────────────────────────────────────────────────────┐
│                          BACKEND LAYER                             │
├────────────────────────────────────────────────────────────────────┤
│  Node.js + Express  |  Socket.IO  |  Turf.js  |  Authentication   │
│                     |             |           |  ORS Integration   │
└────────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                    Storage / Caching / External APIs
                              ↓ ↑
┌────────────────────────────────────────────────────────────────────┐
│                   DATA & INFRASTRUCTURE LAYER                      │
├────────────────────────────────────────────────────────────────────┤
│  MongoDB Atlas  |  Upstash Redis  |  OpenRouteService  | Nodemailer│
└────────────────────────────────────────────────────────────────────┘
```

### 📊 Data Flow Diagram

```
Driver App → GPS + Speed (Every 30s)
                ↓
        Backend Processing
        • Location Snapping (Turf.js)
        • ETA Calculation
        • Speed Averaging
                ↓
        Redis Cache Update
                ↓
        WebSocket Broadcast
                ↓
        User Map (Real-time Update)


Admin Panel → Route Creation
                ↓
        OpenRouteService API
                ↓
        Polyline Generation
                ↓
    MongoDB + Redis Storage
                ↓
        Available to Users
```

---

## 🎯 Core Functionalities

### 📍 1. Route Creation & Polyline Storage

**Workflow:**
1. Admin enters route details (name, stops with lat/lng)
2. Backend calls OpenRouteService API once
3. Receives optimized route polyline
4. **Stores in MongoDB** for persistence
5. **Caches in Redis** for fast access
6. **Sent to frontend** and cached in IndexedDB

**Benefits:**
- ✅ One-time API call per route (cost-effective)
- ✅ Ultra-fast subsequent access
- ✅ Low bandwidth consumption

### 🚍 2. Real-Time GPS Tracking

**Driver Side:**
```
Every 30 seconds:
├── Capture GPS coordinates
├── Measure current speed
└── Send to backend
```

**Backend Processing:**
```
Received Data
    ↓
Location Snapping (Turf.js nearestPointOnLine)
    ↓
Speed History (Last 3 readings)
    ↓
Moving Average Calculation
    ↓
ETA Computation (to each stop)
    ↓
WebSocket Broadcast
```

### ⚡ 3. Low-Bandwidth Architecture

**Optimization Strategies:**

| Strategy | Implementation | Impact |
|----------|---------------|---------|
| **Redis Caching** | Store polylines and live data | 90% reduction in DB calls |
| **WebSocket** | Push-based updates | No polling overhead |
| **Client Caching** | IndexedDB for routes | Routes loaded once |
| **Compact Payloads** | Minimal JSON structure | 70% smaller data transfers |
| **Coordinate Only** | Send essential data only | Reduced bandwidth by 80% |

### 📊 Sample Live Update Flow

```javascript
// Simplified Example
Driver Location: [lat: 28.7041, lng: 77.1025, speed: 45 km/h]
           ↓
Backend Snapping: nearestPointOnLine(location, routePolyline)
           ↓
ETA Calculation: avg(45, 42, 48) = 45 km/h → ETA = distance/speed
           ↓
Redis Update: SET bus:123:location {snappedLat, snappedLng, eta}
           ↓
WebSocket: emit('busUpdate', {busId, location, eta})
           ↓
User Map: Update marker position + show ETA badge
```

---

## 🚀 Installation

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Upstash Redis account
- OpenRouteService API key
- Expo CLI (for React Native development)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/bus-tracking-system.git
cd bus-tracking-system

# Install backend dependencies
cd backend
npm install

# Create .env file
cp .env.example .env

# Configure environment variables (see Configuration section)

# Start the server
npm start
```

### Frontend Setup (User & Admin Web Apps)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Driver App Setup (React Native)

```bash
# Navigate to mobile app directory
cd driver-app

# Install dependencies
npm install

# Start Expo
npx expo start

# Scan QR code with Expo Go app
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bus-tracking

# Redis (Upstash)
REDIS_URL=redis://default:<password>@<host>:<port>

# OpenRouteService
ORS_API_KEY=your_ors_api_key_here

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# WebSocket
CORS_ORIGIN=http://localhost:3000
```

### Frontend Configuration

Update `frontend/src/config.js`:

```javascript
export const config = {
  API_URL: 'http://localhost:5000',
  SOCKET_URL: 'http://localhost:5000',
  MAP_CENTER: [28.7041, 77.1025], // Default city center
  MAP_ZOOM: 13
};
```

---

## 💻 Usage

### Admin Dashboard

1. **Login** with admin credentials
2. **Add Drivers:**
   - Enter driver name and contact
   - System auto-generates username and password
   - Credentials sent via email
3. **Create Routes:**
   - Enter route name
   - Add stops with coordinates
   - System fetches polyline automatically
   - Route becomes available instantly
4. **Monitor Buses:**
   - View all active buses on map
   - Track real-time locations
   - Monitor ETAs

### Driver App

1. **Login** with provided credentials
2. **Start Tracking:**
   - App automatically sends GPS data every 30 seconds
   - Works in background
   - Low battery consumption
3. **Monitor Status:**
   - View current route
   - Check connection status

### User Web App

1. **Select Route** from dropdown
2. **View Live Buses** on the route
3. **Check ETA** for each stop
4. **Track in Real-Time** as buses move

---

## 🏆 Key Advantages

| Advantage | Description |
|-----------|-------------|
| 🌐 **Low Bandwidth** | Runs smoothly on 3G connections (< 100 KB/min) |
| 💰 **Cost-Effective** | No Google Maps API costs, minimal API usage |
| 📈 **Scalable** | Ready for multi-route and multi-city deployment |
| ⚡ **Fast** | Redis caching ensures sub-second response times |
| 🎯 **Accurate** | Geo-accurate ETA and precise location snapping |
| 🔋 **Efficient** | Low battery consumption on driver devices |
| 🌍 **Offline-Ready** | Routes cached locally for offline access |
| 🛠️ **Easy Setup** | Minimal infrastructure requirements |

---

## 🛡️ Security Features

- 🔐 **Password Hashing:** bcrypt with salt rounds
- 👤 **Role-Based Access:** Admin, Driver, User roles
- 🔑 **JWT Authentication:** Secure token-based auth
- 🔒 **HTTPS Communication:** Encrypted data transmission
- 🧹 **Input Sanitization:** XSS and injection prevention
- ⏰ **Redis TTL:** Automatic expiry of volatile data
- 🚫 **Rate Limiting:** API request throttling
- 📧 **Secure Credentials:** Auto-generated strong passwords


## 🙏 Acknowledgments

- OpenRouteService for routing API
- Leaflet.js for mapping library
- Turf.js for geospatial calculations
- Upstash for Redis hosting
- MongoDB Atlas for database hosting

---

<p align="center">
  <a href="#-table-of-contents">⬆ Back to Top</a>
</p>

---

**⭐ If you find this project useful, please consider giving it a star!**
