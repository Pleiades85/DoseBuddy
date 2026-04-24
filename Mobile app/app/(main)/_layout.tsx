import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from '../../services/authService';
import { RootState } from '../../store';
import { setUser } from '../../store/slices/authSlice';

export default function MainLayout() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check for persisted session on app start
  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const session = await authService.getStoredSession();
      if (session) {
        dispatch(setUser(session.patientData));
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Redirect based on authentication status
  useEffect(() => {
    if (!checkingAuth) {
      if (!isAuthenticated) {
        router.replace('/(main)/login');
      } else {
        // Redirect to home if authenticated
        router.replace('/(main)/');
      }
    }
  }, [isAuthenticated, checkingAuth, router]);

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E8B57',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        animation: 'slide_from_right', // Smooth transition
      }}
    >
      {/* Home Screen - No Header for immersive feel */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      {/* Login Screen - No Header */}
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />

      {/* Sub-screens - Show Back Button */}
      <Stack.Screen name="medications" options={{ title: 'My Medications' }} />
      <Stack.Screen name="scanner" options={{ title: 'Scan Medication' }} />
      <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
      <Stack.Screen name="cart" options={{ title: 'Pharmacy Cart' }} />
      <Stack.Screen name="orders" options={{ title: 'Order History' }} />
      <Stack.Screen name="chatbot" options={{ title: 'Health Assistant' }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
    </Stack>
  );
}