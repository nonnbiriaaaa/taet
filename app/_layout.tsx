import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const GREEN = "#1A7A4A";
const GRAY = "#8E8E93";

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#E5E5EA" },
        headerStyle: { backgroundColor: GREEN },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ダッシュボード",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="daily"
        options={{
          title: "日次記録",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pencil" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="weekly"
        options={{
          title: "週次レポート",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "目標設定",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
