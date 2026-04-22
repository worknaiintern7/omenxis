import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'vs AI',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="multiplayer"
        options={{
          title: 'vs People',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="multiplayer-game"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="level-select"
        options={{ href: null }}
      />
    </Tabs>
  );
}
