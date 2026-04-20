# 🛡️ GetIntern: AI-Powered Attendance System
**A Full-Stack Photo-Based Attendance Marking System with Real-Time Liveness Detection.**

[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20+%20Python-orange)](https://github.com/yourusername)
[![Build](https://img.shields.io/badge/Build-Advanced-blue)](#)

GetIntern is a sophisticated virtual internship and classroom management platform that replaces traditional manual attendance with **Automated Facial Recognition**. Built with a microservices architecture, it ensures secure, one-time attendance marking per session using real-time video stream analysis.

---

## 🚀 Key Features

### 👤 User & Admin Roles
- **Multi-Admin Support:** Different professors can manage different subjects independently.
- **Secure Onboarding:** Students register with College IDs and upload a baseline profile picture (stored securely in **Cloudinary**).
- **Dual Authentication:** Login via unique Entry Numbers and JWT-protected sessions.

### 📸 Smart Attendance Engine
- **Photo-ID Verification:** Every 10 seconds, the system captures a frame and verifies it against the database using **OpenCV** and **dlib**.
- **Liveness Detection:** Prevents spoofing (photos/videos held to camera) using **Laplacian Variance** sharpness checks and texture analysis.
- **One-Mark Rule:** Ensures a student is only marked present once per scheduled class duration.

### 📊 Real-Time Dashboards
- **Admin Panel:** Schedule classes, set durations, and view day-wise/subject-wise attendance reports.
- **Student Panel:** Track attendance percentage across all registered subjects.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Vite, Tailwind CSS, Socket.io-client |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB (Mongoose) |
| **AI/CV Service** | Python, FastAPI, OpenCV, Face_Recognition |
| **Storage** | Cloudinary (Image Hosting) |

---

## 🏗️ Architecture Flow

1. **Capture:** React frontend streams webcam frames via WebSockets.
2. **Process:** Node.js relays frames to the Python FastAPI microservice.
3. **Verify:** Python performs Liveness Check + Face Encoding comparison.
4. **Record:** If verified, Node.js updates the MongoDB attendance record and notifies the UI.

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v16+)
- Python (v3.9+)
- **C++ Build Tools for Visual Studio** (Required for `dlib`)
- **CMake**

### 2. Backend Setup (.env)
Create a `.env` in the `/server` folder:
```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173