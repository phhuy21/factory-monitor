/**
 * ================================================================
 * Timer Screen — Cài đặt hẹn giờ (MODE_TIMER)
 * ================================================================
 *
 * Tương ứng firmware MODE_TIMER (dòng 517-523):
 *   - Chọn timerOnHr, timerOnMin (giờ bật relay)
 *   - Chọn timerOffHr, timerOffMin (giờ tắt relay)
 *   - Hiển thị trạng thái relay hiện tại
 *
 * Thay thế BTN_UP/BTN_DOWN + BTN_SELECT (dòng 451-462)
 * bằng giao diện picker trực quan.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { useNodeStore } from '../store/useNodeStore';
import { mqttService } from '../services/MqttService';
import { DEFAULT_TIMER_CONFIG } from '../types/HardwarePackets';
import type { TimerConfig } from '../types/HardwarePackets';
import ConnectionStatus from '../components/ConnectionStatus';

// ─── Time Wheel Picker Component ────────────────────────────────

interface TimeWheelProps {
  label: string;
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  color: string;
  icon: string;
}

const TimeWheel: React.FC<TimeWheelProps> = ({
  label, hour, minute, onHourChange, onMinuteChange, color, icon,
}) => {
  const incHour = () => onHourChange((hour + 1) % 24);
  const decHour = () => onHourChange(hour === 0 ? 23 : hour - 1);
  const incMin = () => onMinuteChange((minute + 1) % 60);
  const decMin = () => onMinuteChange(minute === 0 ? 59 : minute - 1);

  return (
    <View style={[styles.wheelContainer, { borderColor: color + '30' }]}>
      <View style={styles.wheelHeader}>
        <Text style={styles.wheelIcon}>{icon}</Text>
        <Text style={[styles.wheelLabel, { color }]}>{label}</Text>
      </View>

      <View style={styles.wheelRow}>
        {/* Hour */}
        <View style={styles.wheelColumn}>
          <TouchableOpacity onPress={incHour} style={styles.wheelBtn}>
            <Text style={styles.wheelBtnText}>▲</Text>
          </TouchableOpacity>
          <View style={[styles.wheelValue, { borderColor: color + '40' }]}>
            <Text style={styles.wheelValueText}>
              {String(hour).padStart(2, '0')}
            </Text>
          </View>
          <TouchableOpacity onPress={decHour} style={styles.wheelBtn}>
            <Text style={styles.wheelBtnText}>▼</Text>
          </TouchableOpacity>
          <Text style={styles.wheelUnit}>Giờ</Text>
        </View>

        <Text style={styles.wheelSeparator}>:</Text>

        {/* Minute */}
        <View style={styles.wheelColumn}>
          <TouchableOpacity onPress={incMin} style={styles.wheelBtn}>
            <Text style={styles.wheelBtnText}>▲</Text>
          </TouchableOpacity>
          <View style={[styles.wheelValue, { borderColor: color + '40' }]}>
            <Text style={styles.wheelValueText}>
              {String(minute).padStart(2, '0')}
            </Text>
          </View>
          <TouchableOpacity onPress={decMin} style={styles.wheelBtn}>
            <Text style={styles.wheelBtnText}>▼</Text>
          </TouchableOpacity>
          <Text style={styles.wheelUnit}>Phút</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────

const TimerScreen: React.FC = () => {
  const { nodes, selectedNodeId, mqttStatus, setTimerConfig } = useNodeStore();
  const node = nodes[selectedNodeId];
  const currentConfig = node?.timerConfig ?? DEFAULT_TIMER_CONFIG;

  const [onHour, setOnHour] = useState(currentConfig.onHour);
  const [onMinute, setOnMinute] = useState(currentConfig.onMinute);
  const [offHour, setOffHour] = useState(currentConfig.offHour);
  const [offMinute, setOffMinute] = useState(currentConfig.offMinute);
  const [hasChanges, setHasChanges] = useState(false);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const handleSave = useCallback(() => {
    const config: TimerConfig = {
      onHour,
      onMinute,
      offHour,
      offMinute,
    };

    // Publish to ESP32
    mqttService.publishTimerConfig(selectedNodeId, config);

    // Update local state
    setTimerConfig(selectedNodeId, config);

    setHasChanges(false);

    Alert.alert(
      '✅ Đã lưu',
      `Hẹn giờ Node #${selectedNodeId}\nBật: ${String(onHour).padStart(2, '0')}:${String(onMinute).padStart(2, '0')}\nTắt: ${String(offHour).padStart(2, '0')}:${String(offMinute).padStart(2, '0')}`,
      [{ text: 'OK' }]
    );
  }, [selectedNodeId, onHour, onMinute, offHour, offMinute]);

  // Calculate relay active duration
  const onTotal = onHour * 60 + onMinute;
  const offTotal = offHour * 60 + offMinute;
  const duration = offTotal >= onTotal
    ? offTotal - onTotal
    : 1440 - onTotal + offTotal;
  const durationHr = Math.floor(duration / 60);
  const durationMin = duration % 60;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Hẹn Giờ Relay</Text>
            <Text style={styles.headerSubtitle}>Node #{selectedNodeId}</Text>
          </View>
          <ConnectionStatus status={mqttStatus} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Timer ON */}
        <TimeWheel
          label="GIỜ BẬT RELAY"
          icon="🟢"
          hour={onHour}
          minute={onMinute}
          onHourChange={(h) => { setOnHour(h); markChanged(); }}
          onMinuteChange={(m) => { setOnMinute(m); markChanged(); }}
          color={COLORS.success}
        />

        {/* Timer OFF */}
        <TimeWheel
          label="GIỜ TẮT RELAY"
          icon="🔴"
          hour={offHour}
          minute={offMinute}
          onHourChange={(h) => { setOffHour(h); markChanged(); }}
          onMinuteChange={(m) => { setOffMinute(m); markChanged(); }}
          color={COLORS.danger}
        />

        {/* Duration Info */}
        <View style={styles.durationCard}>
          <Text style={styles.durationIcon}>⏱️</Text>
          <View>
            <Text style={styles.durationLabel}>Thời gian relay hoạt động</Text>
            <Text style={styles.durationValue}>
              {durationHr > 0 ? `${durationHr} giờ ` : ''}{durationMin} phút
            </Text>
          </View>
        </View>

        {/* Current Relay Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>⚡</Text>
          <Text style={styles.statusLabel}>Relay hiện tại: </Text>
          <Text
            style={[
              styles.statusValue,
              { color: node?.data?.relayState ? COLORS.success : COLORS.textMuted },
            ]}
          >
            {node?.data?.relayState ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {hasChanges ? '💾 Lưu & Gửi xuống ESP32' : '✓ Không có thay đổi'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
    ...SHADOWS.elevated,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  // Time Wheel styles
  wheelContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  wheelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  wheelIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  wheelLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  wheelColumn: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  wheelBtn: {
    width: 48,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wheelBtnText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  wheelValue: {
    width: 72,
    height: 56,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelValueText: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  wheelSeparator: {
    fontSize: 36,
    fontWeight: '200',
    color: COLORS.textMuted,
    marginHorizontal: SPACING.sm,
    marginTop: -20,
  },
  wheelUnit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  // Duration
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  durationIcon: {
    fontSize: 24,
  },
  durationLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  durationValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  // Status
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  statusIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  statusLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Save
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default TimerScreen;
