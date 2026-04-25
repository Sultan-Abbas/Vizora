# 🎬 Vizora

A web-based motion capture editor that extracts human pose data from video using AI and visualizes it in a real-time 3D environment.

Built with **React + TypeScript + Vite + Tailwind CSS**, powered by **TensorFlow BlazePose**, **Firebase**, and **Three.js**.

---

## 🚀 Features

### 🔐 Authentication & Backend
- Google Sign-In via Firebase Authentication
- Firestore database for persistent project storage
- User dashboard to create, manage, and delete motion capture projects

---

### 🧠 AI Motion Extraction
- Uses `@tensorflow-models/pose-detection`
- MediaPipe BlazePose (full model)
- Processes uploaded videos directly in-browser
- Extracts 3D keypoints `[x, y, z]` frame-by-frame
- Optimized coordinate precision for smooth animation
- Stores motion data in Firestore

---

### 🌐 3D Viewport
- Built with `@react-three/fiber` and `@react-three/drei`
- Features:
  - Responsive grid
  - Lighting system
  - OrbitControls camera navigation
- Real-time 3D motion rendering

---

### 🦴 Animation Mapping
- `<Viewport3D />` reads motion data from Firestore
- Normalizes and processes vectors
- Applies SLERP (Spherical Linear Interpolation)
- Supports:
  - Primitive skeleton (cylinder joints)
  - Imported `.glb` humanoid rigs (X-Bot, Y-Bot)

---

### 🎛 Editor UI
- Timeline system with play/pause controls
- Frame-synced scrubber
- Side panel:
  - Import `.glb` models via URL
  - Select preset humanoid rigs
- Real-time log viewer for AI processing pipeline

---

## 🏗 Tech Stack

**Frontend**
- React (Vite)
- TypeScript
- Tailwind CSS

**3D Engine**
- Three.js
- React Three Fiber
- Drei

**AI / ML**
- TensorFlow.js
- MediaPipe BlazePose

**Backend**
- Firebase Authentication
- Firestore

---

## 📁 Project Structure
src/
├── components/
│ ├── Viewport3D.tsx
│ ├── Timeline.tsx
│ ├── Sidebar.tsx
│ └── LogViewer.tsx
│
├── pages/
│ ├── Dashboard.tsx
│ ├── Editor.tsx
│ └── Login.tsx
│
├── services/
│ ├── firebase.ts
│ ├── motionProcessor.ts
│ └── poseDetection.ts
│
├── hooks/
├── utils/
└── types/
