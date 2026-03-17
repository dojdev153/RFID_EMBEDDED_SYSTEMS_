import time
import network
import machine
import ubinascii
import ujson
from umqtt.simple import MQTTClient
from mfrc522 import MFRC522
TEAM = "team^_^TopDog"
WIFI_SSID = "nigga"
WIFI_PASS = "zoloz234"
MQTT_BROKER = "broker.benax.rw"
MQTT_PORT = 1883
T_STATUS = b"rfid/" + TEAM.encode() + b"/card/status"
T_TOPUP = b"rfid/" + TEAM.encode() + b"/card/topup"
T_TOPUP_RES = b"rfid/" + TEAM.encode() + b"/card/topup/result"
T_BALANCE = b"rfid/" + TEAM.encode() + b"/card/balance"
T_PAYMENT = b"rfid/" + TEAM.encode() + b"/card/payment"
T_PAY_RES = b"rfid/" + TEAM.encode() + b"/card/payment/result"
CLIENT_ID = b"esp_" + ubinascii.hexlify(machine.unique_id())
led = machine.Pin(2, machine.Pin.OUT)
led.value(1)
KEY = [0xFF] * 6
BLOCK = 5
rfid = None
client = None
def wifi_connect():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        print("WiFi OK:", wlan.ifconfig()[0])
        return True
    print("Connecting WiFi...")
    wlan.connect(WIFI_SSID, WIFI_PASS)
    for _ in range(20):
        if wlan.isconnected():
            print("WiFi OK:", wlan.ifconfig()[0])
            led.value(1)
            return True
        led.value(not led.value())
        time.sleep(0.5)
    print("WiFi FAILED")
    return False
def read_balance(uid):
    try:
        rfid.select_tag(uid)
        if rfid.auth(rfid.AUTHENT1A, BLOCK, KEY, uid) == rfid.OK:
            data = rfid.read(BLOCK)
            rfid.stop_crypto1()
            if data and len(data) >= 4:
                return data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24)
        rfid.stop_crypto1()
        return 0
    except:
        rfid.stop_crypto1()
        return 0
def execute_tx(uid, is_topup, amt):
    try:
        rfid.select_tag(uid)
        if rfid.auth(rfid.AUTHENT1A, BLOCK, KEY, uid) == rfid.OK:
            data = rfid.read(BLOCK)
            if not data or len(data) < 4:
                rfid.stop_crypto1()
                return False, 0, 0, "Read failed"
            bal = data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24)
            if not is_topup and bal < amt:
                rfid.stop_crypto1()
                return False, bal, bal, "Insufficient balance"
            new_bal = bal + amt if is_topup else bal - amt
            w_data = [new_bal & 0xFF, (new_bal >> 8) & 0xFF, (new_bal >> 16) & 0xFF, (new_bal >> 24) & 0xFF] + [0] * 12
            ok = rfid.write(BLOCK, w_data) == rfid.OK
            rfid.stop_crypto1()
            if ok:
                return True, bal, new_bal, "OK"
            return False, bal, bal, "Write error"
        rfid.stop_crypto1()
        return False, 0, 0, "Auth error"
    except:
        rfid.stop_crypto1()
        return False, 0, 0, "Error"
def scan_card():
    try:
        if rfid.request(rfid.REQIDL)[0] == rfid.OK:
            stat, uid = rfid.anticoll()
            if stat == rfid.OK:
                uid_str = "".join("{:02X}".format(x) for x in uid)
                return uid_str, uid
    except:
        pass
    return None, None
def mqtt_callback(topic, msg):
    try:
        data = ujson.loads(msg)
        uid = data.get("uid")
        amt = data.get("amount", 0)
        if not uid:
            return
        if topic == T_TOPUP:
            print(f"TOPUP: {amt} for {uid}")
            do_topup(uid, amt)
        elif topic == T_PAYMENT:
            print(f"PAY: {amt} for {uid}")
            do_payment(uid, amt)
    except:
        pass
def do_topup(target_uid, amt):
    print("Present card...")
    start = time.time()
    while time.time() - start < 10:
        uid_str, uid_bytes = scan_card()
        if uid_str == target_uid:
            success, old_bal, new_bal, msg = execute_tx(uid_bytes, True, amt)
            if success:
                print(f"OK: {old_bal} -> {new_bal}")
                client.publish(T_TOPUP_RES, ujson.dumps({
                    "uid": uid_str,
                    "amount": amt,
                    "success": True,
                    "message": "Top-up successful",
                    "new_balance": new_bal
                }))
                client.publish(T_BALANCE, ujson.dumps({"uid": uid_str, "new_balance": new_bal}))
                for _ in range(3):
                    led.value(0)
                    time.sleep(0.1)
                    led.value(1)
                    time.sleep(0.1)
                return
            else:
                print(f"FAIL: {msg}")
                client.publish(T_TOPUP_RES, ujson.dumps({
                    "uid": uid_str,
                    "amount": amt,
                    "success": False,
                    "message": msg,
                    "new_balance": old_bal
                }))
                return
        time.sleep(0.1)
    print("TIMEOUT")
    client.publish(T_TOPUP_RES, ujson.dumps({
        "uid": target_uid,
        "amount": amt,
        "success": False,
        "message": "Timeout"
    }))
def do_payment(target_uid, amt):
    print("Present card...")
    start = time.time()
    while time.time() - start < 10:
        uid_str, uid_bytes = scan_card()
        if uid_str == target_uid:
            success, old_bal, new_bal, msg = execute_tx(uid_bytes, False, amt)
            if success:
                print(f"PAID: {old_bal} -> {new_bal}")
                client.publish(T_PAY_RES, ujson.dumps({
                    "uid": uid_str,
                    "amount": amt,
                    "success": True,
                    "message": "OK",
                    "new_balance": new_bal
                }))
                client.publish(T_BALANCE, ujson.dumps({"uid": uid_str, "new_balance": new_bal}))
                for _ in range(3):
                    led.value(0)
                    time.sleep(0.1)
                    led.value(1)
                    time.sleep(0.1)
                return
            else:
                print(f"FAIL: {msg}")
                client.publish(T_PAY_RES, ujson.dumps({
                    "uid": uid_str,
                    "amount": amt,
                    "success": False,
                    "message": msg,
                    "new_balance": old_bal
                }))
                return
        time.sleep(0.1)
    print("TIMEOUT")
    client.publish(T_PAY_RES, ujson.dumps({
        "uid": target_uid,
        "amount": amt,
        "success": False,
        "message": "Timeout"
    }))
def main():
    global rfid, client
    print("\n" + "="*40)
    print("RFID Payment - ESP8266")
    print("Team:", TEAM)
    print("="*40 + "\n")
    if not wifi_connect():
        print("WiFi FAIL - Restarting...")
        time.sleep(5)
        machine.reset()
    try:
        rfid = MFRC522(sck=14, mosi=13, miso=12, rst=0, cs=15)
        print("RFID OK")
    except Exception as e:
        print("RFID FAIL:", e)
        return
    try:
        client = MQTTClient(CLIENT_ID, MQTT_BROKER, MQTT_PORT, keepalive=60)
        client.set_callback(mqtt_callback)
        client.connect()
        client.subscribe(T_TOPUP)
        client.subscribe(T_PAYMENT)
        print("MQTT OK")
    except Exception as e:
        print("MQTT FAIL:", e)
        time.sleep(5)
        machine.reset()
    print("\nReady - Scan cards\n")
    last_uid = None
    last_time = 0
    while True:
        try:
            client.check_msg()
            uid_str, uid_bytes = scan_card()
            if uid_str:
                now = time.time()
                if uid_str != last_uid or (now - last_time) > 3:
                    bal = read_balance(uid_bytes)
                    client.publish(T_STATUS, ujson.dumps({"uid": uid_str, "balance": bal}))
                    print(f"Card: {uid_str} | {bal} RWF")
                    led.value(0)
                    time.sleep(0.2)
                    led.value(1)
                    last_uid = uid_str
                    last_time = now
            time.sleep(0.3)
        except OSError:
            print("Reconnecting MQTT...")
            try:
                client = MQTTClient(CLIENT_ID, MQTT_BROKER, MQTT_PORT, keepalive=60)
                client.set_callback(mqtt_callback)
                client.connect()
                client.subscribe(T_TOPUP)
                client.subscribe(T_PAYMENT)
            except:
                time.sleep(5)
                machine.reset()
        except Exception as e:
            print("Error:", e)
            time.sleep(1)
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped")
    except Exception as e:
        print("Fatal:", e)
        time.sleep(5)
        machine.reset()
