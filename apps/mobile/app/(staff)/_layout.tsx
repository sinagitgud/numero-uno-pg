import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../_layout';

export default function StaffLayout() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER';
  const isSales = user?.role === 'SALES_MANAGER' || isOwner;
  const isOps = user?.role === 'OPS_MANAGER' || isOwner;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { borderTopColor: Colors.border },
      }}
    >
      {/* Dashboard — Owner only */}
      {isOwner && (
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('dashboard.title'),
            tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />,
          }}
        />
      )}

      {/* Properties — all staff */}
      <Tabs.Screen
        name="properties"
        options={{
          title: t('properties.title'),
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />

      {/* Tenants — sales */}
      {isSales && (
        <Tabs.Screen
          name="tenants"
          options={{
            title: t('tenants.title'),
            tabBarIcon: ({ color }) => <TabIcon emoji="👥" color={color} />,
          }}
        />
      )}

      {/* Rent — sales */}
      {isSales && (
        <Tabs.Screen
          name="rent"
          options={{
            title: t('rent.title'),
            tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} />,
          }}
        />
      )}

      {/* Expenses — ops */}
      {isOps && (
        <Tabs.Screen
          name="expenses"
          options={{
            title: t('expenses.title'),
            tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
          }}
        />
      )}

      {/* Tickets — all staff */}
      <Tabs.Screen
        name="tickets"
        options={{
          title: t('tickets.title'),
          tabBarIcon: ({ color }) => <TabIcon emoji="🎫" color={color} />,
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === Colors.primary ? 1 : 0.5 }}>{emoji}</Text>;
}
