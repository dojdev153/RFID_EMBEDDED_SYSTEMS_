const express = require('express');
const mqtt = require('mqtt');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Configuration
const TEAM_ID = 'team^_^TopDog';
const MQTT_BROKER = 'mqtt://157.173.101.159:1883';
const HTTP_PORT = 9218;
const WS_PORT =9219;

// MQTT Topics
const TOPIC_CARD_STATUS = `rfid/${TEAM_ID}/card/status`;

    console.log('✓ Connected to MQTT broker');
    
    // Subscribe to card status and balance updates
    mqttClient.subscribe(TOPIC_CARD_STATUS, (err) => {
        if (!err) console.log(`✓ Subscribed to: ${TOPIC_CARD_STATUS}`);
    });
    
    mqttClient.subscribe(TOPIC_CARD_BALANCE, (err) => {
        if (!err) console.log(`✓ Subscribed to: ${TOPIC_CARD_BALANCE}`);
    });
});

mqttClient.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        console.log(`📨 MQTT received on ${topic}:`, data);
        
        if (topic === TOPIC_CARD_STATUS) {
            // Card status update
            currentCardData = {
                uid: data.uid,
                balance: data.balance,
                lastUpdate: new Date().toISOString()
            };
            
            // Broadcast to all WebSocket clients
            broadcastToClients({
                type: 'card_status',
                data: currentCardData
            });
        }
        
        if (topic === TOPIC_CARD_BALANCE) {
            // Balance update
            currentCardData = {
                uid: data.uid,
                balance: data.new_balance,
                lastUpdate: new Date().toISOString()
            };
            
            // Broadcast to all WebSocket clients
            broadcastToClients({
                type: 'balance_update',
                data: currentCardData
            });
        }
    } catch (error) {
        console.error('❌ Error processing MQTT message:', error);
    }
});

mqttClient.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
});

// ==================== WebSocket Server ====================
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`✓ WebSocket server running on port ${WS_PORT}`);

wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket client connected');
    
    // Send current card data to newly connected client
    if (currentCardData.uid) {
        ws.send(JSON.stringify({
            type: 'card_status',
            data: currentCardData
        }));
    }
    
    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// Broadcast message to all connected WebSocket clients
function broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    let clientCount = 0;
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
            clientCount++;
        }
    });
    
    if (clientCount > 0) {
        console.log(`📤 Broadcasted to ${clientCount} client(s)`);
    }
}

// ==================== HTTP API Routes ====================

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        team: TEAM_ID,
        mqtt: mqttClient.connected ? 'connected' : 'disconnected',
        currentCard: currentCardData,
        timestamp: new Date().toISOString()
    });
});

// Get current card status
app.get('/status', (req, res) => {
    res.json({
        success: true,
        data: currentCardData
    });
});

// Top-up endpoint
app.post('/topup', (req, res) => {
    const { uid, amount } = req.body;
    
    console.log(`💰 Top-up request received: ${amount} RWF for card ${uid}`);
    
    // Validation
    if (!uid || !amount) {
        return res.status(400).json({
            success: false,
            message: 'Missing uid or amount'
        });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
        });
    }
    
    // Check if MQTT is connected
    if (!mqttClient.connected) {
        return res.status(503).json({
            success: false,
            message: 'MQTT broker not connected'
        });
    }
    
    // Publish top-up command to MQTT
    const payload = JSON.stringify({ uid, amount });
    
    mqttClient.publish(TOPIC_TOPUP_CMD, payload, (err) => {
        if (err) {
            console.error('❌ Failed to publish top-up command:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to send top-up command'
            });
        }
        
        console.log(`✓ Top-up command sent: ${payload}`);
        res.json({
            success: true,
            message: 'Top-up command sent successfully',
            data: { uid, amount }
        });
    });
});

// Start HTTP server
app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 RFID Top-Up System Backend - Team WATASHI');
    console.log('='.repeat(60));
    console.log(`✓ HTTP server running on port ${HTTP_PORT}`);
    console.log(`✓ WebSocket server running on port ${WS_PORT}`);
    console.log('\n📍 Access URLs:');
    console.log(`   Dashboard: http://157.173.101.159:${HTTP_PORT}`);
    console.log(`   Health:    http://157.173.101.159:${HTTP_PORT}/health`);
    console.log(`   Status:    http://157.173.101.159:${HTTP_PORT}/status`);
    console.log('\n📡 MQTT Topics:');
    console.log(`   Status:  ${TOPIC_CARD_STATUS}`);
    console.log(`   Top-up:  ${TOPIC_TOPUP_CMD}`);
    console.log(`   Balance: ${TOPIC_CARD_BALANCE}`);
    console.log('='.repeat(60) + '\n');
});
