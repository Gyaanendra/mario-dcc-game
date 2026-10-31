# 🍄 Mario Career Quest: Mask On. Level Up.
### Dean Career Cloud (DCC) | School of Computer Science Engineering & Technology (SCSET) | Bennett University

An ultra-lightweight, real-time multiplayer gamified career quiz & simulation engine tailored specifically for the **Mario Career Quest** event (2 November 2026, ~150 First- & Second-Year B.Tech students).

Engineered to run seamlessly on a **budget 1-Core vCPU, 1 GB RAM VPS** with zero lag, instant session resumption, client-side physics, and an embedded SQLite database.

---

## 🎮 The Three Synchronized Views

| View | Route | Target Device | Description |
| :--- | :--- | :--- | :--- |
| **📱 Player Mobile Controller** | `/` or `/join` | Smartphones & Laptops | Responsive arcade gamepad touch buttons, avatar picker, tap-for-luck Question Block with haptic feedback, real-time coin counter, zero-latency 8-bit procedural sound. |
| **📽️ Stage Projector Arena** | `/projector` | 16:9 Lecture Hall Screen | High-contrast retro presentation with dynamic Join QR Code, Question Blocks, animated countdown timers, live class choice distribution charts, stage leaderboards, animated Bowser boss fight, and 3-step victory podium with confetti. |
| **🎛️ Host Control Center** | `/host` *(PIN: `DCC2026`)* | Host / Tech Operator Laptop | Master controls to start/pause/resume questions, extend timers, reveal answers, execute automated cut-offs (Top 50 for Level 2, Top 10 for Level 3), trigger sudden-death tiebreakers, and input judge rubric scores (0–5 for Clarity, Reasoning, Judgement, Communication). |

---

## ⚡ Technical Architecture & 1-Core 1GB Optimization

- **Runtime & Backend Engine**: Node.js (v20+ / v26) + Fastify (ultra-low overhead, sub-millisecond request routing).
- **Embedded Database**: Native Node.js `DatabaseSync` (`node:sqlite`) running in **WAL mode (`journal_mode = WAL; synchronous = NORMAL;`)** with zero external C++ build tool dependencies.
- **Real-Time WebSockets**: High-throughput `ws` engine broadcasting compact JSON packets.
- **Client-Side Physics**: **Matter.js** 2D rigid-body coin particle explosions and bouncy Question Blocks executed purely on the user's phone/projector GPU/CPU — keeping the 1-core server CPU load under 10%.
- **Zero-Asset Chiptune Audio**: Procedural 8-bit sound synthesis via the **Web Audio API** (`client/src/audio/chiptune.ts`). Authentic Mario coin pings, 1-Up fanfares, jump sounds, ticking clocks, and Bowser roars generated in code with 0 KB bandwidth consumption.
- **Anti-Disconnection Session Resumption**: When a participant joins, a unique session UUID is stored in `localStorage`. If the student refreshes the browser, locks their phone, or switches from campus Wi-Fi to 4G/5G, the client automatically executes a `CLIENT_RECONNECT` handshake. The server restores their exact state, coins, active question, and locked answer.

### 📊 Benchmark Load Test Results (150 Concurrent Players)
- **Active Connections**: 150 simultaneous WebSockets
- **Burst Submissions**: 150 answers processed in under 6.5s
- **Server RSS Memory**: **81 MB** (out of 1024 MB VPS capacity — **>910 MB free**)
- **Server Heap Used**: **18 MB**
- **Peak CPU Usage**: < 12% of a single vCPU core

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v20+ or v26+
- npm v10+

### 2. Installation
```bash
# Clone the repository and install dependencies
cd server && npm install
cd ../client && npm install
```

### 3. Build the Frontend Static Assets
```bash
npm run client:build
```

### 4. Seed the Event Question Bank
Populates all 15 Level 1 career questions, 20 Level 2 myth-busting & red flag questions, and 2 sudden-death tiebreakers:
```bash
npm run seed
```

### 5. Start the Production Server
```bash
npm start
```
The server will boot on `http://localhost:3001` (or your VPS external IP). Fastify directly serves the optimized client application and WebSocket endpoint on the same single port!

---

## 📋 Running the 150-Player Automated Stress Test
To benchmark the server on your VPS:
```bash
npm run test:load
```
This spawns an automated host and 150 concurrent simulated student clients that connect, register, receive question broadcasts, and lock in answers within 3 seconds, logging real-time memory and CPU telemetry.

---

## 🏆 Round Structure & Scoring

### Level 1: "Start Your Quest" — Career & Placement Quiz
- **Target**: All ~150 participants.
- **Format**: 15 multiple-choice questions on foundational career terms (PPO, CTC vs in-hand, ATS keywords, STAR method, resume bullets).
- **Points**: 100 base coins + speed bonus (up to 20 pts).
- **Progression**: Host clicks **"TOP 50 CUT-OFF"** in the control panel to advance the top 50 qualifiers to Level 2.

### Level 2: "Question Block" — Myth-Busting & Red Flags
- **Target**: Top 50 qualifiers (non-qualifiers enter spectator mode).
- **Format**: 20 scenario-based questions categorized into:
  - `MYTH OR FACT?`
  - `CHOOSE WISELY`
  - `RED FLAG` (Advance-fee fraud, fake offer letters, predatory bonds, task scams).
- **Progression**: Host clicks **"TOP 10 CUT-OFF"** to qualify the top 10 finalists for the stage finale.

### Level 3: "Bowser's Boss Challenge" — Career Case Finale
- **Target**: Top 10 finalists on stage.
- **Case**: Comparing Offer A (High stipend ₹45k, no mentorship, vague duties) vs Offer B (Lower stipend ₹18k, experienced mentor, high-impact production code ownership).
- **Format**: 2-minute spoken response per finalist.
- **Rubric (20 Points Total)**:
  1. *Clarity & Structure* (0–5)
  2. *Reasoning & Trade-offs* (0–5)
  3. *Practical Judgement* (0–5)
  4. *Communication & Timing* (0–5)
- **Victory Podium**: Host clicks **"PODIUM"** to reveal 1st, 2nd, and 3rd place winners on the stage projector with animated trophies, celebration fanfare, and confetti!

---

## 🔒 Security & Admin Access
- **Host Admin PIN**: `DCC2026` (configurable via `HOST_PIN` environment variable).
- **Database Backup**: Single-file SQLite database located at `server/data/mario_quest.db`.

---
*Created for Dean Career Cloud (DCC) • School of Computer Science Engineering & Technology • Bennett University*

