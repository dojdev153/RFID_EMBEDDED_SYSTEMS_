"""
RFID Card Top-Up System - ESP8266 Edge Controller
Team: Darius_Divine_Louise
Instructor: Gabriel Baziramwabo

This module handles RFID card reading/writing and MQTT communication.
"""

import time
import network
import machine
import ubinascii
import ujson
from umqtt.simple import MQTTClient
from machine import Pin, SPI
from mfrc522 import MFRC522

# ================= CONFIGURATION =================
TEAM_ID = "team^_^TopDog"  # Unique team identifier for MQTT topics
WIFI_SSID = "RCA"
WIFI_PASS = "@RcaNyabihu2023"
MQTT_BROKER = "broker.benax.rw"
MQTT_PORT = 1883

# MQTT Topics - Following strict isolation rules
TOPIC_STATUS  = b"rfid/" + TEAM_ID.encode() + b"/card/status"
TOPIC_TOPUP   = b"rfid/" + TEAM_ID.encode() + b"/card/topup"
TOPIC_BALANCE = b"rfid/" + TEAM_ID.encode() + b"/card/balance"

CLIENT_ID = b"esp_" + ubinascii.hexlify(machine.unique_id())

# LED for status indication (optional)
led = Pin(2, Pin.OUT)
led.value(1)  # Off (inverted on ESP8266)

# ================= WIFI CONNECTION =================
def wifi_connect():
    """Connect to WiFi network with retry logic"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if wlan.isconnected():
        print("Already connected to WiFi")
        print("IP:", wlan.ifconfig()[0])
        return True
    
    print("Connecting to WiFi:", WIFI_SSID)
    wlan.connect(WIFI_SSID, WIFI_PASS)
    
    retry_count = 0
    max_retries = 20
    
    while not wlan.isconnected() and retry_count < max_retries:
        led.value(not led.value())  # Blink LED
        time.sleep(0.5)
        retry_count += 1
    
    if wlan.isconnected():
        led.value(1)  # Turn off LED
        print("WiFi connected successfully!")
        print("IP Address:", wlan.ifconfig()[0])
        return True
    else:
        print("Failed to connect to WiFi")
        return False

# ================= RFID SETUP =================
def setup_rfid():
    """Initialize RFID reader"""
    try:
        rfid_reader = MFRC522(sck=14, mosi=13, miso=12, rst=0, cs=15)
        print("RFID reader initialized")
        return rfid_reader
    except Exception as e:
        print("RFID initialization error:", e)
        return None


# In-memory card balance storage
card_balances = {}

# ================= MQTT CALLBACK =================
def on_mqtt_msg(topic, msg):
    """Handle incoming MQTT messages (top-up commands)"""
    try:
        data = ujson.loads(msg)
        uid = data.get("uid")
        amount = data.get("amount", 0)
        
        if not uid:
            print("Error: No UID in top-up command")
            return
        
        # Update balance
        if uid in card_balances:
            card_balances[uid] += amount
        else:
            card_balances[uid] = amount
        
        # Publish updated balance
        payload = {
            "uid": uid,
            "new_balance": card_balances[uid],
            "timestamp": time.time()
        }
        
        client.publish(TOPIC_BALANCE, ujson.dumps(payload))
        print("✓ Balance updated:", payload)
        
        # Blink LED to indicate success
        for _ in range(3):
            led.value(0)
            time.sleep(0.1)
            led.value(1)
            time.sleep(0.1)
            
    except Exception as e:
        print("Error processing top-up:", e)

# ================= MQTT CONNECTION =================
def mqtt_connect():
    """Connect to MQTT broker with error handling"""
    try:
        c = MQTTClient(CLIENT_ID, MQTT_BROKER, MQTT_PORT, keepalive=60)
        c.set_callback(on_mqtt_msg)
        c.connect()
        c.subscribe(TOPIC_TOPUP)
        print("MQTT connected successfully")
        print("Client ID:", CLIENT_ID)
        print("Subscribed to:", TOPIC_TOPUP)
        return c
    except Exception as e:
        print("MQTT connection error:", e)
        return None

# ================= RFID CARD READING =================
def read_rfid_card(rfid_reader):
    """Read RFID card and return UID if present"""
    try:
        (stat, tag_type) = rfid_reader.request(rfid_reader.REQIDL)
        
        if stat == rfid_reader.OK:
            (stat, raw_uid) = rfid_reader.anticoll()
            
            if stat == rfid_reader.OK:
                # Convert UID to hex string
                uid = "".join("{:02X}".format(x) for x in raw_uid)
                return uid
    except Exception as e:
        print("RFID read error:", e)
    
    return None

# ================= MAIN LOOP =================
def main():
    """Main application loop"""
    global client
    
    print("\n" + "="*50)
    print("RFID Card Top-Up System - ESP8266")
    print("Team ID:", TEAM_ID)
    print("="*50 + "\n")
    
    # Connect to WiFi
    if not wifi_connect():
        print("Cannot proceed without WiFi. Restarting...")
        time.sleep(5)
        machine.reset()
    
    # Initialize RFID
    rfid_reader = setup_rfid()
    if not rfid_reader:
        print("Cannot proceed without RFID reader. Halting...")
        return
    
    # Connect to MQTT
    client = mqtt_connect()
    if not client:
        print("Cannot proceed without MQTT. Restarting...")
        time.sleep(5)
        machine.reset()
    
    print("\n✓ System ready - Waiting for cards...\n")
    
    last_card_uid = None
    last_scan_time = 0
    scan_cooldown = 2  # seconds
    
    # Main loop
    while True:
        try:
            # Check for incoming MQTT messages
            client.check_msg()
            
            # Check for RFID card
            uid = read_rfid_card(rfid_reader)
            
            if uid:
                current_time = time.time()
                
                # Prevent duplicate scans
                if uid != last_card_uid or (current_time - last_scan_time) > scan_cooldown:
                    # Initialize balance if new card
                    if uid not in card_balances:
                        card_balances[uid] = 0
                    
                    # Publish card status
                    payload = {
                        "uid": uid,
                        "balance": card_balances[uid],
                        "timestamp": current_time
                    }
                    
                    client.publish(TOPIC_STATUS, ujson.dumps(payload))
                    print("📇 Card scanned:", payload)
                    
                    # Blink LED
                    led.value(0)
                    time.sleep(0.2)
                    led.value(1)
                    
                    last_card_uid = uid
                    last_scan_time = current_time
            
            time.sleep(0.1)
            
        except OSError as e:
            print("Connection error:", e)
            print("Reconnecting...")
            client = mqtt_connect()
            if not client:
                time.sleep(5)
                machine.reset()
        except Exception as e:
            print("Unexpected error:", e)
            time.sleep(1)

# ================= ENTRY POINT =================
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print("Fatal error:", e)
        time.sleep(5)
        machine.reset()