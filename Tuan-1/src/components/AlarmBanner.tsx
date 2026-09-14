/**
 * ================================================================
 * AlarmBanner — Banner cảnh báo nhấp nháy
 * ================================================================
 *
 * Hiển thị khi isAlarm === true từ firmware.
 * Hỗ trợ 3 trạng thái (firmware dòng 511-515):
 *   - ALARM ACTIVE: Nhấp nháy đỏ, rung
 *   - MUTED SNOOZE: Vàng nhạt, có nút unmute
 *   - HARD MUTED: Xám, im lặng hoàn toàn
 *
 * Nút Mute tương ứng BTN_MUTE (firmware dòng 411-422):
 *   - Nhấn ngắn → Snooze (tắt tạm)
 *   - Nhấn giữ → Hard Mute (tắt cứng)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, ANIMATION } from '../constants/theme';
import type { AlarmStatus } from '../types/HardwarePackets';

interface AlarmBannerProps {
  status: AlarmStatus;
  nodeId: number;
  onMute: () => void;
  onHardMute: () => void;
}

const AlarmBanner: React.FC<AlarmBannerProps> = ({
  status,
  nodeId,
  onMute,
  onHardMute,
}) => {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide in animation
  useEffect(() => {
    if (status !== 'none') {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [status]);

  // Blink animation for active alarm (matches firmware 300ms cycle)
  useEffect(() => {
    if (status === 'active') {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.4,
            duration: ANIMATION.alarmBlinkMs,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: ANIMATION.alarmBlinkMs,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      blinkAnim.setValue(1);
    }
  }, [status]);

  if (status === 'none') return null;

  const config = {
    active: {
      bg: COLORS.danger,
      icon: '🚨',
      title: 'CẢNH BÁO ĐANG HOẠT ĐỘNG',
      subtitle: `Node #${nodeId} — Phát hiện nguy hiểm!`,
      showMute: true,
    },
    muted_snooze: {
      bg: COLORS.warning,
      icon: '🔇',
      title: 'ĐÃ TẮT TẠM THỜI (SNOOZE)',
      subtitle: 'Sẽ tự hú lại nếu giá trị tiếp tục tăng',
      showMute: false,
    },
    hard_muted: {
      bg: '#4B5563',
      icon: '🔕',
      title: 'ĐÃ TẮT CỨNG',
      subtitle: 'Còi sẽ không hú cho đến khi giá trị an toàn',
      showMute: false,
    },
  }[status];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: status === 'active' ? blinkAnim : 1,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.banner, { backgroundColor: config.bg }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>{config.icon}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>{config.subtitle}</Text>
          </View>
        </View>

        {config.showMute && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.muteButton} onPress={onMute}>
              <Text style={styles.muteButtonText}>🔇 Tắt tạm</Text>
            </TouchableOpacity>
            <Pressable
              style={styles.hardMuteButton}
              onLongPress={onHardMute}
              delayLongPress={3000}
            >
              <Text style={styles.hardMuteText}>Giữ 3s để tắt cứng</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  banner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  muteButton: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    flex: 1,
    alignItems: 'center',
  },
  muteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  hardMuteButton: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hardMuteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AlarmBanner;
