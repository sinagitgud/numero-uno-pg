import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from './_layout';

/**
 * Root screen: decides where to route the user based on auth state.
 * - Not logged in → (auth)/login
 * - Staff (owner/manager) → (staff)/dashboard
 * - Tenant → (tenant)/home
 */
export default function Index() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/(auth)/login');
    } else if (user.role === 'TENANT') {
      router.replace('/(tenant)/home');
    } else {
      router.replace('/(staff)/dashboard');
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
