import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../_layout';

export default function TenantLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }} />
      <Tabs.Screen name="rent" options={{ title: t('rent.title'), tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} /> }} />
      <Tabs.Screen name="support" options={{ title: t('tickets.title'), tabBarIcon: ({ color }) => <TabIcon emoji="🎫" color={color} /> }} />
      <Tabs.Screen name="info" options={{ title: 'Info', tabBarIcon: ({ color }) => <TabIcon emoji="ℹ️" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title'), tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === Colors.primary ? 1 : 0.5 }}>{emoji}</Text>;
}
