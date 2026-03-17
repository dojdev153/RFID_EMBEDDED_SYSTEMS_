// API service for communicating with backend
import { API_URL } from '../config';

class APIService {
  // Login
  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // Signup
  async signup(username, password, role) {
    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // Top-up
  async topup(uid, amount) {
    try {
      const response = await fetch(`${API_URL}/api/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, amount }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Top-up error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // Payment
  async payment(uid, amount, category, service_name, role) {
    try {
      const response = await fetch(`${API_URL}/api/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          amount,
          category,
          service_name,
          role,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Payment error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // Get transactions
  async getTransactions(limit = 20) {
    try {
      const response = await fetch(`${API_URL}/api/transactions?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get transactions error:', error);
      return { success: false, transactions: [] };
    }
  }

  // Get status
  async getStatus() {
    try {
      const response = await fetch(`${API_URL}/api/status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get status error:', error);
      return { status: 'offline' };
    }
  }
}

export default new APIService();