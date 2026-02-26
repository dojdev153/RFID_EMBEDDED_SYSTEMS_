/**
 * RFID Payment System - Backend Server
 * Team: ^_^TopDog
 * Assignment Extension: Payment Feature
 *
 * Features:
 * - HTTP API (top-up + payment)
 * - MQTT bridge to ESP8266
 * - WebSocket real-time updates
 * - SQLite transaction logging
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

// ==================== CONFIG ====================
const PORT = process.env.PORT || 9218;
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.benax.rw:1883';
const TEAM_ID = 'team^_^TopDog';

// MQTT Topics (strict isolation)
const TOPICS = {
  STATUS: `rfid/${TEAM_ID}/card/status`,
  TOPUP: `rfid/${TEAM_ID}/card/topup`,
  TOPUP_RESULT: `rfid/${TEAM_ID}/card/topup/result`,
  BALANCE: `rfid/${TEAM_ID}/card/balance`,
  PAYMENT: `rfid/${TEAM_ID}/card/payment`,
  PAYMENT_RESULT: `rfid/${TEAM_ID}/card/payment/result`
};

// ==================== EXPRESS ====================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== DATABASE ====================
const db = new sqlite3.Database('./rfid_transactions.db', (err) => {
  if (err) {
    console.error('❌ SQLite error:', err.message);
  } else {
    console.log('✅ SQLite connected');
    initDB();
  }
});

function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_before INTEGER,
      balance_after INTEGER,
      success INTEGER DEFAULT 1,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_uid ON transactions(uid)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_time ON transactions(timestamp)`);
}

function logTransaction(uid, type, amount, before, after, success = true, message = '') {
  db.run(
    `INSERT INTO transactions
     (uid, type, amount, balance_before, balance_after, success, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uid, type, amount, before, after, success ? 1 : 0, message]
  );
}

// ==================== MQTT ====================
const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: `backend_${TEAM_ID}_${Date.now()}`,
  clean: true,
  reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
  console.log('✅ MQTT connected');

  Object.values(TOPICS).forEach(topic => {
    mqttClient.subscribe(topic);
  });
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`📨 MQTT [${topic}]`, data);

    broadcast({
      type: 'mqtt',
      topic,
      data
    });

    if (topic === TOPICS.PAYMENT_RESULT) {
      handlePaymentResult(data);
    }
    if (topic === TOPICS.TOPUP_RESULT) {
      handleTopupResult(data);
    }
  } catch (err) {
    console.error('❌ MQTT parse error:', err.message);
  }
});

function handleTopupResult(data) {
  if (data.success) {
    logTransaction(
      data.uid,
      'TOPUP',
      data.amount,
      data.new_balance - data.amount,
      data.new_balance,
      true,
      data.message
    );
  } else {
    logTransaction(
      data.uid,
      'TOPUP',
      data.amount,
      data.new_balance || 0,
      data.new_balance || 0,
      false,
      data.message
    );
  }
}

function handlePaymentResult(data) {
  if (data.success) {
    logTransaction(
      data.uid,
      'PAYMENT',
      data.amount,
      data.new_balance + data.amount,
      data.new_balance,
      true,
      data.message
    );
  } else {
    logTransaction(
      data.uid,
      'PAYMENT',
      data.amount,
      data.new_balance || 0,
      data.new_balance || 0,
      false,
      data.message
    );
  }
}

// ==================== WEBSOCKET ====================
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to RFID Payment System',
    team_id: TEAM_ID
  }));

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// ==================== API ====================

// Health
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    mqtt_connected: mqttClient.connected,
    websocket_clients: clients.size,
    team_id: TEAM_ID
  });
});

// Top-up
app.post('/api/topup', (req, res) => {
  const { uid, amount } = req.body;

  if (!uid || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid UID or amount' });
  }

  mqttClient.publish(TOPICS.TOPUP, JSON.stringify({ uid, amount }));
  res.json({ success: true, uid, amount, message: 'Top-up request sent to card reader' });
});

// Payment (NEW)
app.post('/api/pay', (req, res) => {
  const { uid, amount } = req.body;

  if (!uid || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid UID or amount' });
  }

  mqttClient.publish(TOPICS.PAYMENT, JSON.stringify({ uid, amount }));
  res.json({ success: true, uid, amount, message: 'Payment request sent to card reader' });
});

// Transactions
app.get('/api/transactions', (req, res) => {
  const { uid, limit = 50 } = req.query;

  let sql = 'SELECT * FROM transactions';
  let params = [];

  if (uid) {
    sql += ' WHERE uid = ?';
    params.push(uid);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(Number(limit));

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, transactions: rows });
  });
});

// ==================== START ====================
server.listen(PORT, () => {
  console.log('\n🚀 RFID Payment Backend');
  console.log(`HTTP  : http://localhost:${PORT}`);
  console.log(`WS    : ws://localhost:${PORT}`);
  console.log(`MQTT  : ${MQTT_BROKER}`);
  console.log(`TEAM  : ${TEAM_ID}\n`);
});

// ==================== SHUTDOWN ====================
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  mqttClient.end();
  db.close(() => process.exit(0));
});