
# RFID Card Top-Up System - Team ^_^ TopDog

This project implements a complete IoT solution for managing RFID card balances. It utilizes an **ESP8266** edge controller, a **Node.js cloud backend**, and a **real-time Web Dashboard**. 

## 🌐 Live Application

The web dashboard is accessible at the following URL:
**[http://157.173.101.159:9218](https://www.google.com/search?q=http://157.173.101.159:9218)**

---

## 🏗️ System Architecture

The implementation follows a strict architectural pattern where the backend serves as a translator between different communication protocols. 

* **ESP8266 (Edge Controller):** Communicates exclusively via **MQTT**. It reads/writes RFID card data and publishes status updates. 


* **Backend API Service (VPS):** Acts as the bridge. It receives HTTP commands from the dashboard, communicates with the ESP8266 via MQTT, and pushes real-time updates via WebSockets. 


* 
**Web Dashboard:** A browser-based interface that sends top-up requests via **HTTP** and receives live balance updates via **WebSockets**. 



---

## 🛠️ Features

* 
**Real-time Monitoring:** WebSocket integration ensures that balance changes are reflected instantly on the dashboard without page refreshes. 


* 
**MQTT Topic Isolation:** To ensure stability in a shared broker environment, this project uses a unique namespace: `rfid/team^_^TopDog/`. 


* 
**Hardware Integration:** Full SPI communication between the ESP8266 and the RFID R/W module. 



---

## 📡 MQTT Topic Namespace

This project strictly adheres to the assigned topic isolation rules: 

| Action | Topic | Payload Example |
| --- | --- | --- |
| **Card Status** | `rfid/team^_^TopDog/card/status` | <br>`{"uid": "A1B2C3D4", "balance": 3000}` 

 |
| **Top-Up Command** | `rfid/team^_^TopDog/card/topup` | <br>`{"uid": "A1B2C3D4", "amount": 500}` 

 |
| **Balance Update** | `rfid/team^_^TopDog/card/balance` | <br>`{"uid": "A1B2C3D4", "new balance": 3500}` 

 |

---

## 🚀 Installation & Deployment

### Backend

1. Navigate to the `rfid-backend-topdog` directory.
2. Install dependencies: `npm install`.
3. Start the server: `node server.js`.
* *Note: For 24/7 uptime on the VPS, use `nohup node server.js &` if sudo access is unavailable.*



### Hardware (ESP8266)

1. Open the source code in the Arduino IDE.
2. Ensure the MQTT broker is set to `broker.benax.rw` on port `1883`.
3. Flash the firmware to the ESP8266.

---

## 📄 Repository Structure

* `/ESP8266`: Firmware for the edge controller.
* `/backend-dashboard`:Node.js API service source code and Web interface files (HTML/JS).
* `/README.md`: Project documentation in Markdown format.

