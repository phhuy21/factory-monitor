/**
 * ================================================================
 * ConnectionStatus — Indicator kết nối MQTT
 * ================================================================
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES } from '../constants/theme';

interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'connecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [status]);

  const config = {
    connected: { color: COLORS.mqttConnected, label: 'Đã kết nối', icon: '●' },
    connecting: { color: COLORS.mqttConnecting, label: 'Đang kết nối...', icon: '◌' },
    disconnected: { color: COLORS.mqttDisconnected, label: 'Mất kết nối', icon: '○' },
  }[status];

  return (
    <Animated.View style={[styles.container, { opacity: status === 'connecting' ? pulseAnim : 1 }]}>
      <Text style={[styles.dot, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface + '80',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  dot: {
    fontSize: 10,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});

export default ConnectionStatus;
