import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useSettingsStore } from '../../stores/useSettingsStore';

function TabIcon({ name, color }: { name: string; color: string }) {
  return <MaterialCommunityIcons name={name as never} size={24} color={color} />;
}

export default function TabLayout() {
  const { settings } = useSettingsStore();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.unpaid,
        tabBarStyle: {
          backgroundColor: settings.dark_mode ? Colors.surfaceDark : Colors.surface,
          borderTopColor: Colors.border,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/settings')} style={{ marginRight: 16 }}>
            <MaterialCommunityIcons name="cog" size={24} color="#ffffff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Početna',
          tabBarIcon: ({ color }) => <TabIcon name="view-dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="months"
        options={{
          title: 'Mjeseci',
          tabBarIcon: ({ color }) => <TabIcon name="calendar-month" color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Kategorije',
          tabBarIcon: ({ color }) => <TabIcon name="tag-multiple" color={color} />,
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          href: null,
          title: 'Statistika',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Postavke',
        }}
      />
    </Tabs>
  );
}
