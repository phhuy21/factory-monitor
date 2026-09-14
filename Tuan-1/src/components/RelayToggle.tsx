/**
 * ================================================================
 * RelayToggle — Nút bật/tắt Relay
 * ================================================================
 *
 * Toggle switch thay thế nút cứng BTN_RELAY (firmware dòng 423).
 * Khi gạt, gửi lệnh { cmd: "toggle_relay" } xuống ESP32.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

interface RelayToggleProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const RelayToggle: React.FC<RelayToggleProps> = ({ isOn, onToggle, disabled = false }) => {
  const translateX = useRef(new Animated.Value(isOn ? 28 : 0)).current;
  const bgColor = useRef(new Animated.Value(isOn ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: isOn ? 28 : 0,
        damping: 15,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bgColor, {
        toValue: isOn ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isOn]);

  const handlePress = () => {
    if (disabled) return;
    // Micro bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 10, stiffness: 200, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  const trackColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.success],
  });

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.icon}>⚡</Text>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Relay / Quạt</Text>
          <Text style={[styles.status, { color: isOn ? COLORS.success : COLORS.textMuted }]}>
            {isOn ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
          </Text>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={disabled}
          style={styles.touchArea}
        >
          <Animated.View style={[styles.track, { backgroundColor: trackColor as any }]}>
            <Animated.View
              style={[
                styles.thumb,
                { transform: [{ translateX }] },
                isOn && SHADOWS.glow(COLORS.success),
              ]}
            >
              <Text style={styles.thumbIcon}>{isOn ? '✓' : '○'}</Text>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 22,
    marginRight: SPACING.md,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  status: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  touchArea: {
    padding: 4,
  },
  track: {
    width: 56,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
});

export default RelayToggle;
