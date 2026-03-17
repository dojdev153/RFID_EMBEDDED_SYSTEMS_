// Backend server configuration
export const API_URL = 'http://192.168.0.3:9218';
export const WS_URL = 'ws://192.168.0.3:9218';
export const TEAM_ID = 'team^_^TopDog';

// MQTT Topics (for reference - backend handles MQTT)
export const TOPICS = {
  STATUS: `rfid/${TEAM_ID}/card/status`,
  TOPUP: `rfid/${TEAM_ID}/card/topup`,
  BALANCE: `rfid/${TEAM_ID}/card/balance`,
  PAYMENT: `rfid/${TEAM_ID}/card/payment`,
  PAYMENT_RESULT: `rfid/${TEAM_ID}/card/payment/result`,
};