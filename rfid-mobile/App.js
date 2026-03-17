import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import TopUpScreen from './screens/TopUpScreen';
import PaymentScreen from './screens/PaymentScreen';
import DashboardScreen from './screens/DashboardScreen';


import WebSocketService from './services/websocket';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Connect to WebSocket on app start
    WebSocketService.connect((message) => {
      console.log('Card update:', message);
    });

    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#7c7cff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ title: '📝 Create Account' }}
        />
        <Stack.Screen
          name="TopUp"
          component={TopUpScreen}
          options={{ title: '💰 Wallet Top-Up' }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: '💳 Process Payment' }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: '📊 Dashboard' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}