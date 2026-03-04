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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

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
      role TEXT,
      category TEXT,
      service_name TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_uid ON transactions(uid)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_time ON transactions(timestamp)`);
}

function logTransaction(uid, type, amount, before, after, success = true, message = '', role = '', category = '', service_name = '') {
  db.run(
    `INSERT INTO transactions
     (uid, type, amount, balance_before, balance_after, success, message, role, category, service_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uid, type, amount, before, after, success ? 1 : 0, message, role, category, service_name]
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

// Since ESP8266 only knows amounts, not services, we temporarily cache pending transactions
// Map of UID -> { serviceName, role, category }
const pendingPayments = new Map();

function handleTopupResult(data) {
  if (data.success) {
    logTransaction(
      data.uid, 'TOPUP', data.amount, data.new_balance - data.amount, data.new_balance, true, data.message, 'Agent', 'System', 'Wallet Top-Up'
    );
  } else {
    logTransaction(
      data.uid, 'TOPUP', data.amount, data.new_balance || 0, data.new_balance || 0, false, data.message, 'Agent', 'System', 'Wallet Top-Up'
    );
  }
}

function handlePaymentResult(data) {
  const cache = pendingPayments.get(data.uid) || { category: 'Unknown', serviceName: 'Unknown Product', role: 'Salesperson' };

  if (data.success) {
    logTransaction(
      data.uid, 'PAYMENT', data.amount, data.new_balance + data.amount, data.new_balance, true, data.message, cache.role, cache.category, cache.serviceName
    );
  } else {
    logTransaction(
      data.uid, 'PAYMENT', data.amount, data.new_balance || 0, data.new_balance || 0, false, data.message, cache.role, cache.category, cache.serviceName
    );
  }

  // Clear cache for this UID
  pendingPayments.delete(data.uid);
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

// Real Auth
app.post('/api/signup', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  db.run(
    `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
    [username, password, role],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ success: false, message: 'Username already exists.' });
        }
        return res.status(500).json({ success: false, message: 'Database error.' });
      }
      res.json({ success: true, message: 'Account created successfully.' });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE username = ? AND password = ?`,
    [username, password],
    (err, user) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error.' });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid username or password.' });

      res.json({ success: true, username: user.username, role: user.role, message: `Logged in as ${user.username}` });
    }
  );
});

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

// Payment
app.post('/api/pay', (req, res) => {
  const { uid, amount, category, service_name, role } = req.body;

  if (!uid || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid UID or amount' });
  }

  // Cache the service context so we can log it when the ESP8266 confirms the transaction
  pendingPayments.set(uid, {
    category: category || 'Service',
    serviceName: service_name || 'Standard Payment',
    role: role || 'Salesperson'
  });

  mqttClient.publish(TOPICS.PAYMENT, JSON.stringify({ uid, amount }));
  res.json({ success: true, uid, amount, category, service_name, message: 'Payment request sent to card reader' });
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