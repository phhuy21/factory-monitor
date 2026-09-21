/**
 * ================================================================
 * App.tsx — Entry Point (Firebase + MQTT)
 * ================================================================
 *
 * Luồng khởi tạo:
 *   1. Firebase Auth check → nếu chưa đăng nhập → LoginScreen
 *   2. Wire MqttService callbacks → Zustand Store + FirebaseService
 *   3. Kết nối MQTT broker
 *   4. Khi connected → subscribe wildcard + start TimeSyncService
 *   5. Render TabNavigator
 *   6. Periodic online status check
 *   7. Notification service init
 *
 * Luồng dữ liệu:
 *   ESP32 → MQTT → MqttService → Zustand Store → UI (realtime)
 *                              → FirebaseService → Firestore (lịch sử, throttled 30s)
 */

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import type { User } from 'firebase/auth';

import TabNavigator from './src/navigation/TabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { mqttService } from './src/services/MqttService';
import { timeSyncService } from './src/services/TimeSyncService';
import { authService } from './src/services/AuthService';
import { firebaseService } from './src/services/FirebaseService';
import { notificationService } from './src/services/NotificationService';
import { useNodeStore } from './src/store/useNodeStore';
import { COLORS } from './src/constants/theme';

// ─── Dark Theme for Navigation ──────────────────────────────────

const DarkTheme = {
  dark: true,
  colors: {
    primary: '#6366F1',
    background: '#0A0E1A',
    card: '#0F1525',
    text: '#F9FAFB',
    border: '#1F2937',
    notification: '#EF4444',
  },
};

// ─── App Component ──────────────────────────────────────────────

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const onlineCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevAlarmRef = useRef<Record<number, boolean>>({});

  // ── Auth state listener ─────────────────────────────────────
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── MQTT + Firebase wiring (chỉ khi đã đăng nhập) ──────────
  useEffect(() => {
    if (!user) return;

    // Khởi tạo notification service và đồng bộ Token thiết bị lên Firestore + ESP32
    notificationService.initialize().then((token) => {
      if (token && user.uid) {
        firebaseService.savePushToken(user.uid, token, Platform.OS, notificationService.expoPushToken || undefined);
        const currentId = useNodeStore.getState().selectedNodeId;
        firebaseService.saveNodePushToken(currentId, token);
        if (mqttService.isConnected) {
          mqttService.publishPushToken(currentId, token);
        }
      }
    });

    // Tải danh sách trụ giám sát đã ghép nối từ tài khoản người dùng
    firebaseService.getUserDevices(user.uid).then((devices) => {
      if (devices && devices.length > 0) {
        const deviceMap: Record<number, string> = {};
        devices.forEach((d) => {
          deviceMap[d.id] = d.name;
        });
        useNodeStore.getState().setUserDevices(deviceMap);
        useNodeStore.getState().selectNode(devices[0].id);
      }
    });

    const store = useNodeStore.getState();

    // ── Wire MQTT callbacks ─────────────────────────────────
    mqttService.setCallbacks({
      onData: (packet) => {
        const currentStore = useNodeStore.getState();
        const prevAlarm = prevAlarmRef.current[packet.nodeId] ?? false;

        // Cập nhật Zustand Store → UI realtime
        currentStore.updateNodeData(packet);

        // Lưu vào Firestore (throttled 30s)
        firebaseService.saveSensorData(packet.nodeId, packet);

        // Phát hiện alarm mới → notification + lưu alarm history
        if (packet.isAlarm && !prevAlarm) {
          const node = currentStore.nodes[packet.nodeId];
          const thresholds = node?.thresholds;

          if (thresholds) {
            if (packet.temperature > thresholds.tempMax) {
              notificationService.sendAlarmNotification(packet.nodeId, {
                alarmType: 'temperature_high',
                temperature: packet.temperature,
              });
              firebaseService.saveAlarmEvent(
                packet.nodeId, 'temperature_high',
                packet.temperature, thresholds.tempMax
              );
            } else if (packet.temperature < thresholds.tempMin) {
              notificationService.sendAlarmNotification(packet.nodeId, {
                alarmType: 'temperature_low',
                temperature: packet.temperature,
              });
              firebaseService.saveAlarmEvent(
                packet.nodeId, 'temperature_low',
                packet.temperature, thresholds.tempMin
              );
            }
            if (packet.humidity > thresholds.humMax) {
              notificationService.sendAlarmNotification(packet.nodeId, {
                alarmType: 'humidity_high',
                humidity: packet.humidity,
              });
              firebaseService.saveAlarmEvent(
                packet.nodeId, 'humidity_high',
                packet.humidity, thresholds.humMax
              );
            }
            if (packet.gasLevel > thresholds.gasMax) {
              notificationService.sendAlarmNotification(packet.nodeId, {
                alarmType: 'gas_high',
                gasLevel: packet.gasLevel,
              });
              firebaseService.saveAlarmEvent(
                packet.nodeId, 'gas_high',
                packet.gasLevel, thresholds.gasMax
              );
            }
          }
        }

        prevAlarmRef.current[packet.nodeId] = packet.isAlarm;
      },

      onTime: (packet) => {
        useNodeStore.getState().updateNodeTime(packet);
      },

      onConfig: (nodeId, thresholds, timerConfig) => {
        useNodeStore.getState().updateNodeConfig(nodeId, thresholds, timerConfig);
        firebaseService.saveConfig(nodeId, thresholds, timerConfig);
      },

      onStatusChange: (status) => {
        useNodeStore.getState().setMqttStatus(status);
        if (status === 'connected') {
          timeSyncService.start();
          const activeNodeId = useNodeStore.getState().selectedNodeId;
          // Yêu cầu ESP32 gửi cấu hình hiện tại
          mqttService.requestConfig(activeNodeId);
          // Đồng bộ Push Token sang ESP32 ngay khi vừa kết nối
          const curToken = notificationService.pushToken;
          if (curToken) {
            mqttService.publishPushToken(activeNodeId, curToken);
          }
        } else if (status === 'disconnected') {
          timeSyncService.stop();
        }
      },

      onError: (error) => {
        console.error('[App] MQTT Error:', error.message);
      },
    });

    // ── Nạp cấu hình đã lưu từ Firestore ───────────────────
    firebaseService.loadConfig(store.selectedNodeId).then((cloudConfig) => {
      if (cloudConfig) {
        useNodeStore.getState().updateNodeConfig(
          store.selectedNodeId,
          cloudConfig.thresholds,
          cloudConfig.timerConfig
        );
      }
    });

    // ── Auto-connect MQTT ───────────────────────────────────
    mqttService.connect(store.brokerUrl).catch((err) => {
      console.log('[App] MQTT kết nối thất bại, chạy offline mode');
    });

    // ── Kiểm tra online status mỗi giây ────────────────────
    onlineCheckRef.current = setInterval(() => {
      useNodeStore.getState().checkOnlineStatus();
    }, 1000);

    // ── Cleanup khi unmount ─────────────────────────────────
    return () => {
      mqttService.disconnect();
      timeSyncService.stop();
      if (onlineCheckRef.current) {
        clearInterval(onlineCheckRef.current);
      }
    };
  }, [user]);

  // ── Loading state ───────────────────────────────────────────
  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Chưa đăng nhập → hiển thị LoginScreen ──────────────────
  if (!user) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  // ── Đã đăng nhập → hiển thị app chính ──────────────────────
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={DarkTheme as any}>
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default App;
