/**
 * ================================================================
 * AlarmBanner — Banner cảnh báo nhấp nháy
 * ================================================================
 *
 * Hiển thị khi isAlarm === true từ firmware.
 * Hỗ trợ 3 trạng thái:
 *   - ALARM ACTIVE: Nhấp nháy đỏ, rung
 *   - MUTED SNOOZE: Vàng nhạt
 *   - HARD MUTED: Xám, im lặng hoàn toàn
 *
 * Nút Mute tương ứng BTN_MUTE:
 *   - Gộp 1 nút duy nhất:
 *     + Nhấn 1 chạm → Tắt tạm thời (Snooze 60s)
 *     + Nhấn giữ 3 giây → Tắt còi hoàn toàn (Hard Mute)
 *   - Nút ✕ hoặc "Đóng thông báo" để ẩn cảnh báo khi đã tắt còi
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
  onDismiss?: () => void;
}

const AlarmBanner: React.FC<AlarmBannerProps> = ({
  status,
  nodeId,
  onMute,
  onHardMute,
  onDismiss,
}) => {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

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
      subtitle: `Trụ #${nodeId} — Phát hiện nguy hiểm vượt ngưỡng!`,
      showMute: true,
    },
    muted_snooze: {
      bg: COLORS.warning,
      icon: '🔇',
      title: 'ĐÃ TẮT TẠM THỜI (SNOOZE)',
      subtitle: 'Còi đã tắt tạm 60s. Sẽ tự hú lại nếu chỉ số tiếp tục tăng.',
      showMute: false,
    },
    hard_muted: {
      bg: '#4B5563',
      icon: '🔕',
      title: 'ĐÃ TẮT CÒI HOÀN TOÀN',
      subtitle: 'Còi sẽ không kêu cho đến khi chỉ số an toàn trở lại.',
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
        <View style={styles.headerRow}>
          <View style={styles.content}>
            <Text style={styles.icon}>{config.icon}</Text>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>
          </View>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {config.showMute ? (
          <View style={styles.actions}>
            {/* Gộp 1 ô bấm duy nhất: Bấm để tắt tạm, Giữ 3s để tắt cứng */}
            <Pressable
              style={({ pressed }) => [
                styles.unifiedMuteButton,
                pressed && styles.unifiedMuteButtonPressed,
              ]}
              onPress={onMute}
              onLongPress={onHardMute}
              delayLongPress={3000}
            >
              <Text style={styles.unifiedMuteTitle}>🔇 Tắt Chuông Báo Động</Text>
              <Text style={styles.unifiedMuteHint}>
                Chạm để tắt tạm (60s) • Nhấn giữ 3s để tắt còi hẳn
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.dismissActionBtn} onPress={onDismiss}>
              <Text style={styles.dismissActionText}>✓ Đóng thông báo</Text>
            </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.full,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actions: {
    marginTop: SPACING.md,
  },
  unifiedMuteButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  unifiedMuteButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  unifiedMuteTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: FONT_SIZES.md,
  },
  unifiedMuteHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZES.xs,
    marginTop: 3,
    textAlign: 'center',
  },
  dismissActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  dismissActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZES.sm,
  },
});

export default AlarmBanner;
