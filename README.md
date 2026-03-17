# RFID Payment & Top-Up System - Team ^_^ TopDog

This project implements a complete IoT solution for managing RFID card balances, supporting **both Top-Ups and Payments**. It utilizes an **ESP8266** edge controller, a **Node.js cloud backend**, **SQLite logging**, and a **Real-time Pro Web Dashboard**.

## 🌐 Live Application
The web dashboard is accessible at the following URL:
**[http://157.173.101.159:9218](http://157.173.101.159:9218)** *(Update IP if deploying elsewhere)*

---

## 🏗️ System Architecture

The implementation follows a strict architectural pattern where the backend serves as a translator and logger between different communication protocols.

* **ESP8266 (Edge Controller):** Communicates exclusively via **MQTT**. It runs memory-optimized (`mpy-cross`) MicroPython firmware to read/write MIFARE Classic 1K RFID cards atomically.
* **Backend API Service (Node.js):** Acts as the bridge. It receives HTTP commands, communicates with the ESP8266 via MQTT, logs all transactions to a local SQLite database, and pushes real-time event updates via WebSockets.
* **Expo Mobile App (React Native):** A comprehensive mobile solution for field operations. It supports role-based navigation for Agents (Top-Ups) and Salespersons (Payments), real-time status updates, and professional PDF receipt generation.
* **Pro Web Dashboard:** A premium, glassmorphism-themed browser interface for administrative monitoring and transaction management.

---

## 🛠️ Key Features

* **Dual Operations:** Support for adding funds (Top-Up) and deducting funds (Payment) with fail-safe UI/Hardware timeouts.
* **Role-Based Mobile Access:** Specialized interfaces for different user roles (Admin, Agent, Salesperson).
* **Professional PDF Receipts:** Instant generation of downloadable and printable receipts for every transaction, featuring custom branding and "Verified" watermarks.
* **Atomic Card Operations:** Overcomes MIFARE card HALT state issues by executing Authentication, Read, Calculate, and Write in a single atomic transaction.
* **Real-time Monitoring:** WebSocket integration ensures that live card scans and results are reflected instantly across both web and mobile platforms.
* **Pro UX/UI:** Dark mode glassmorphism aesthetic with interactive components and live activity logs.

---

## 📱 Mobile App Features

* **Instant Top-Ups & Payments**: Process transactions by simply scanning the RFID card through the edge reader.
* **Receipt Download & Share**: Professional PDF receipts generated instantly. Supports printing or sharing via WhatsApp/Email.
* **Transaction History**: View and reprint receipts for any past transaction directly from the mobile dashboard.
* **Cross-Platform**: Built with Expo, compatible with both Android and iOS.

---

## 📡 MQTT Topic Namespace

This project strictly adheres to isolated topics under `rfid/team^_^TopDog/`:

| Action | Topic | Payload Example |
| --- | --- | --- |
| **Card Status** | `rfid/team^_^TopDog/card/status` | `{"uid": "A1B2C3D4", "balance": 3000}` |
| **Top-Up Command** | `rfid/team^_^TopDog/card/topup` | `{"uid": "A1B2C3D4", "amount": 500}` |
| **Top-Up Result** | `rfid/team^_^TopDog/card/topup/result` | `{"success": true, "uid": "...", "amount": 500, "new_balance": 3500, "message": "Success"}` |
| **Payment Command**| `rfid/team^_^TopDog/card/payment` | `{"uid": "A1B2C3D4", "amount": 500}` |
| **Payment Result** | `rfid/team^_^TopDog/card/payment/result` | `{"success": true, "uid": "...", "amount": 500, "new_balance": 3000, "message": "Success"}` |

---

## 🚀 Installation & Deployment

### Backend (Node.js)
1. Navigate to the `backend-dashboard` directory.
2. Install dependencies: `npm install` (requires `express`, `mqtt`, `sqlite3`, `ws`, `cors`).
3. Start the server: `node server.js`

### Mobile App (Expo)
1. Navigate to the `rfid-mobile` directory.
2. Install dependencies: `npm install`.
3. Configure your local IP in `config.js`.
4. Start the app: `npx expo start`.

### Hardware (ESP8266 MicroPython)
1. Ensure the MQTT broker is set to `broker.benax.rw` on port `1883`.
2. Upload the `mfrc522.py` library and the minified `main.py` script to the board.

---

## 📄 Repository Structure

* `/ESP8266`: Minified firmware for the edge controller + `mfrc522` library.
* `/backend-dashboard`: Node.js server and SQLite DB.
* `/rfid-mobile`: React Native / Expo mobile application.
* `/backend-dashboard/public`: Pro Web Dashboard frontend.
