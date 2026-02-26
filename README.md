# RFID Payment & Top-Up System - Team ^_^ TopDog

This project implements a complete IoT solution for managing RFID card balances, supporting **both Top-Ups and Payments**. It utilizes an **ESP8266** edge controller, a **Node.js cloud backend**, **SQLite logging**, and a **Real-time Pro Web Dashboard**.

## 🌐 Live Application
The web dashboard is accessible at the following URL:
**[http://157.173.101.159:9218](http://157.173.101.159:9218)** *(Update IP if deploying elsewhere)*

---

## 🏗️ System Architecture

The implementation follows a strict architectural pattern where the backend serves as a translator and logger between different communication protocols.

* **ESP8266 (Edge Controller):** Communicates exclusively via **MQTT**. It runs memory-optimized (`mpy-cross`) MicroPython firmware to read/write MIFARE Classic 1K RFID cards atomically, and publishes status/result updates.
* **Backend API Service (Node.js):** Acts as the bridge. It receives HTTP commands from the dashboard, communicates with the ESP8266 via MQTT, logs all transactions to a local SQLite database, and pushes real-time event updates via WebSockets.
* **Pro Web Dashboard:** A premium, glassmorphism-themed browser interface that allows users to seamlessly send top-up/payment requests via **HTTP API** and receives live scanning updates and transaction results via **WebSockets**.

---

## 🛠️ Key Features

* **Dual Operations:** Support for adding funds (Top-Up) and deducting funds (Payment) with fail-safe UI timeouts.
* **Atomic Card Operations:** Overcomes MIFARE card HALT state issues by executing Authentication, Read, Calculate, and Write in a single atomic transaction function.
* **Memory-Optimized Firmware:** ESP8266 MicroPython code is heavily minified to prevent `MemoryError` crashes on boot.
* **Transaction Logging:** All successful and failed Top-ups and Payments are saved to an `rfid_transactions.db` SQLite database with timestamps and status messages.
* **Real-time Monitoring:** WebSocket integration ensures that live card scans, balance changes, and transaction results are reflected instantly on the dashboard without page refreshes.
* **Pro UX/UI:** The dashboard features a FinTech-inspired design with a dark mode glassmorphism aesthetic, interactive quick-amount buttons, and live activity logs.

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
   *(Database table `transactions` is created automatically on first run).*

### Hardware (ESP8266 MicroPython)
1. Ensure the MQTT broker is set to `broker.benax.rw` on port `1883`.
2. Upload the `mfrc522.py` library to the board.
3. Upload the minified `main.py` script. *(To update the python code, edit the readable version, run it through a minifier, and upload the minified code to save RAM).*

---

## 📄 Repository Structure

* `/ESP8266`: Minified firmware for the edge controller + `mfrc522` library.
* `/backend-dashboard`: Node.js express/websocket/mqtt server (`server.js`) and SQLite DB.
* `/backend-dashboard/public`: Pro Web Dashboard frontend (`index.html`).
