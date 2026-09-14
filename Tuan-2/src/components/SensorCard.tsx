/**
 * ================================================================
 * SensorCard — Thẻ hiển thị giá trị cảm biến
 * ================================================================
 *
 * Card premium với gradient border, icon, giá trị lớn,
 * và indicator cảnh báo khi vượt ngưỡng.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

interface SensorCardProps {
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  glowColor: string;
  isAlert: boolean;
  alertLabel?: string;
  decimals?: number;
  maxValue?: number;
}

const SensorCard: React.FC<SensorCardProps> = ({
  icon,
  label,
  value,
  unit,
  color,
  glowColor,
  isAlert,
  alertLabel,
  decimals = 1,
  maxValue = 100,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Alarm pulse animation (matches firmware 300ms blink cycle — line 322)
  useEffect(() => {
    if (isAlert) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      glow.start();
      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isAlert]);

  // Progress bar animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(value / maxValue, 1),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const borderColor = isAlert
    ? glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.9)'],
      })
    : color + '30';

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            borderColor: borderColor as any,
            ...(isAlert
              ? SHADOWS.glow(COLORS.danger)
              : SHADOWS.glow(color)),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: glowColor }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
          {isAlert && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>
                {alertLabel || '⚠'}
              </Text>
            </View>
          )}
        </View>

        {/* Value */}
        <View style={styles.valueContainer}>
          <Text style={[styles.value, isAlert && { color: COLORS.danger }]}>
            {value.toFixed(decimals)}
          </Text>
          <Text style={[styles.unit, { color: color }]}>{unit}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: isAlert ? COLORS.danger : color,
              },
            ]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    minHeight: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    fontWeight: '500',
    flex: 1,
  },
  alertBadge: {
    backgroundColor: COLORS.danger + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  alertBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    fontWeight: '700',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  value: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default SensorCard;
