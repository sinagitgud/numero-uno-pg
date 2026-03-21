import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../src/i18n';
import { useAuthStore } from '../src/store/authStore';

// Brand colors
export const Colors = {
  primary: '#1E3A5F',    // Deep navy blue
  secondary: '#F4A261',  // Warm orange accent
  success: '#2D9E6B',    // Green
  danger: '#E63946',     // Red
  warning: '#F4A261',    // Orange
  background: '#F8F9FA', // Light grey background
  card: '#FFFFFF',       // White card
  text: '#1A1A2E',       // Dark text
  textMuted: '#6B7280',  // Grey text
  border: '#E5E7EB',     // Light border
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={Colors.primary} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(staff)" />
        <Stack.Screen name="(tenant)" />
      </Stack>
    </SafeAreaProvider>
  );
}
