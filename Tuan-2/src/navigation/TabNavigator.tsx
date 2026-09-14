/**
 * ================================================================
 * Tab Navigator — Bottom Tab Navigation
 * ================================================================
 *
 * 5 tabs:
 *   Dashboard  → Giám sát realtime
 *   Timer      → Hẹn Giờ relay
 *   History    → Lịch sử sensor (Firestore)
 *   Settings   → Cài đặt ngưỡng
 *   System     → Hệ thống (MQTT, Node ID, Auth)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, FONT_SIZES, RADIUS } from '../constants/theme';
import { useNodeStore } from '../store/useNodeStore';

import DashboardScreen from '../screens/DashboardScreen';
import TimerScreen from '../screens/TimerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SystemScreen from '../screens/SystemScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

// ─── Tab Icon Component ─────────────────────────────────────────

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
  badge?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ emoji, label, focused, badge }) => (
  <View style={styles.tabIconContainer}>
    <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
      {badge && <View style={styles.tabBadge} />}
    </View>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  </View>
);

// ─── Navigator ──────────────────────────────────────────────────

const TabNavigator: React.FC = () => {
  const nodes = useNodeStore((s) => s.nodes);

  // Check if any node has active alarm (for badge)
  const hasAlarm = Object.values(nodes).some(
    (n) => n.data?.isAlarm && n.alarmStatus === 'active'
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Giám sát" focused={focused} badge={hasAlarm} />
          ),
        }}
      />
      <Tab.Screen
        name="Timer"
        component={TimerScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⏰" label="Hẹn giờ" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Ngưỡng" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📈" label="Lịch sử" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="System"
        component={SystemScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔧" label="Hệ thống" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 75,
    paddingBottom: 8,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabIconWrapper: {
    width: 40,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIconActive: {
    backgroundColor: COLORS.primary + '20',
  },
  tabEmoji: {
    fontSize: 18,
    opacity: 0.6,
  },
  tabEmojiActive: {
    fontSize: 20,
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.tabInactive,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.tabActive,
    fontWeight: '700',
  },
  tabBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
});

export default TabNavigator;
