/**
 * RFID Card Top-Up System - Backend API Service
 * Team: Darius_Divine_Louise
 * Instructor: Gabriel Baziramwabo
 * 
 * This server acts as a bridge between:
 * - Web clients (HTTP/WebSocket)
 * - ESP8266 devices (MQTT)
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mqtt = require("mqtt");
const path = require("path");
const cors = require("cors");
const HOST = "157.173.101.159";

// ================= CONFIGURATION =================
const TEAM_ID = "team^_^TopDog";
const PORT = process.env.PORT || 9218;
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.benax.rw:1883";

// MQTT Topics - Following strict isolation rules
const TOPIC_STATUS  = `rfid/${TEAM_ID}/card/status`;
const TOPIC_TOPUP   = `rfid/${TEAM_ID}/card/topup`;
const TOPIC_BALANCE = `rfid/${TEAM_ID}/card/balance`;

// ================= EXPRESS SETUP =================
const app = express();
app.use(cors());
app.use(express.json());
//app.use(express.static(path.join(__dirname, "../dashboard")));
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "dashboard.html"));
// });


// ================= HTTP SERVER =================
const server = http.createServer(app);

// ================= WEBSOCKET SERVER =================
const wss = new WebSocket.Server({ server });

// Track connected WebSocket clients
let wsClients = new Set();

wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] New client connected from ${clientIp}`);
  wsClients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: "connection",
    message: "Connected to RFID Top-Up System",
    team_id: TEAM_ID,
    timestamp: new Date().toISOString()
  }));

  ws.on("close", () => {
    console.log(`[WebSocket] Client disconnected from ${clientIp}`);
    wsClients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error(`[WebSocket] Error:`, error.message);
    wsClients.delete(ws);
  });
});

// Broadcast to all connected WebSocket clients
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  let sent = 0;
  
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        sent++;
      } catch (error) {
        console.error("[WebSocket] Send error:", error.message);
      }
    }
  });
  
  console.log(`[WebSocket] Broadcast to ${sent} client(s)`);
}

// ================= MQTT CLIENT =================
const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: `backend_${TEAM_ID}_${Date.now()}`,
  clean: true,
  reconnectPeriod: 5000
});

mqttClient.on("connect", () => {
  console.log("[MQTT] Connected to broker:", MQTT_BROKER);
  
  // Subscribe to relevant topics
  mqttClient.subscribe([TOPIC_STATUS, TOPIC_BALANCE], (err) => {
    if (err) {
      console.error("[MQTT] Subscription error:", err);
    } else {
      console.log("[MQTT] Subscribed to topics:");
      console.log("  -", TOPIC_STATUS);
      console.log("  -", TOPIC_BALANCE);
    }
  });
});

mqttClient.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    // Add topic info and timestamp
    const enrichedData = {
      ...data,
      topic: topic,
      received_at: new Date().toISOString()
    };
    
    console.log(`[MQTT] Message from ${topic}:`, data);
    
    // Broadcast to all WebSocket clients
    broadcastToClients(enrichedData);
    
  } catch (error) {
    console.error("[MQTT] Message parsing error:", error.message);
  }
});

mqttClient.on("error", (error) => {
  console.error("[MQTT] Connection error:", error.message);
});

mqttClient.on("reconnect", () => {
  console.log("[MQTT] Reconnecting...");
});

mqttClient.on("offline", () => {
  console.log("[MQTT] Client offline");
});

// ================= HTTP API ENDPOINTS =================

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    team_id: TEAM_ID,
    mqtt_connected: mqttClient.connected,
    websocket_clients: wsClients.size,
    timestamp: new Date().toISOString()
  });
});

// Get system status
app.get("/status", (req, res) => {
  res.json({
    team_id: TEAM_ID,
    mqtt_broker: MQTT_BROKER,
    mqtt_connected: mqttClient.connected,
    active_connections: wsClients.size,
    topics: {
      status: TOPIC_STATUS,
      topup: TOPIC_TOPUP,
      balance: TOPIC_BALANCE
    },
    timestamp: new Date().toISOString()
  });
});

// Top-up endpoint (main functionality)
app.post("/topup", (req, res) => {
  const { uid, amount } = req.body;
  
  // Validation
  if (!uid) {
    return res.status(400).json({
      error: "Missing required field: uid"
    });
  }
  
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      error: "Invalid amount: must be a positive number"
    });
  }
  
  // Check MQTT connection
  if (!mqttClient.connected) {
    return res.status(503).json({
      error: "MQTT broker not connected"
    });
  }
  
  // Prepare payload
  const payload = {
    uid: uid.toUpperCase(),
    amount: amount,
    timestamp: new Date().toISOString()
  };
  
  // Publish to MQTT
  mqttClient.publish(TOPIC_TOPUP, JSON.stringify(payload), (err) => {
    if (err) {
      console.error("[MQTT] Publish error:", err);
      return res.status(500).json({
        error: "Failed to send top-up command",
        details: err.message
      });
    }
    
    console.log("[HTTP] Top-up command sent:", payload);
    
    res.json({
      status: "success",
      message: "Top-up command sent to ESP8266",
      data: payload
    });
  });
});

// Serve dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[Error]", err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

// ================= SERVER START =================
server.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("  RFID Card Top-Up System - Backend Server");
  console.log("  Team ID:", TEAM_ID);
  console.log("=".repeat(60));
  console.log(`\n✓ HTTP Server running on port ${PORT}`);
  console.log(`✓ WebSocket Server ready`);
  console.log(`✓ MQTT Client connecting to ${MQTT_BROKER}`);
  console.log(`\n📍 Dashboard: http://localhost:${PORT}`);
  console.log(`📍 API Health: http://localhost:${PORT}/health`);
  console.log(`📍 API Status: http://localhost:${PORT}/status`);
  console.log("\nWaiting for connections...\n");
});

// ================= GRACEFUL SHUTDOWN =================
process.on("SIGINT", () => {
  console.log("\n\nShutting down gracefully...");
  
  // Close WebSocket connections
  wsClients.forEach(ws => {
    ws.close();
  });
  
  // Close MQTT connection
  mqttClient.end();
  
  // Close HTTP server
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
