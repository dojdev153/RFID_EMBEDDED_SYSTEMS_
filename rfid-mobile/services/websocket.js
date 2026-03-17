// WebSocket service for real-time card updates
import { WS_URL } from '../config';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = [];
    this.reconnectInterval = null;
  }

  connect(onCardUpdate) {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message);

          // Notify all listeners
          this.listeners.forEach((listener) => listener(message));

          // Call the callback for card updates
          if (message.type === 'mqtt' && onCardUpdate) {
            onCardUpdate(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        // Auto-reconnect after 5 seconds
        if (!this.reconnectInterval) {
          this.reconnectInterval = setInterval(() => {
            console.log('🔄 Reconnecting WebSocket...');
            this.connect(onCardUpdate);
          }, 5000);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}

export default new WebSocketService();