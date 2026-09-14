/**
 * ================================================================
 * Settings Screen — Cài đặt ngưỡng (MODE_TEMP + MODE_HUM + MODE_GAS)
 * ================================================================
 *
 * Tương ứng firmware:
 *   - MODE_TEMP (dòng 524-530): thresTempMax, thresTempMin, step 0.5
 *   - MODE_HUM  (dòng 531-535): thresHum, step 1.0
 *   - MODE_GAS  (dòng 536-540): thresGas, step 50
 *
 * Thay thế nút BTN_UP/BTN_DOWN bằng Slider trực quan.
 * Khi nhấn Lưu → App publish config xuống ESP32 → ESP32 ghi EEPROM.
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
import { firebaseService } from '../services/FirebaseService';
import { DEFAULT_THRESHOLDS } from '../types/HardwarePackets';
import type { Thresholds } from '../types/HardwarePackets';
import ConnectionStatus from '../components/ConnectionStatus';

// ─── Custom Slider Component ────────────────────────────────────

interface ThresholdSliderProps {
  icon: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  currentValue?: number;
  currentLabel?: string;
  onValueChange: (v: number) => void;
}

const ThresholdSlider: React.FC<ThresholdSliderProps> = ({
  icon, label, value, min, max, step, unit, color,
  currentValue, currentLabel, onValueChange,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const increment = () => {
    const next = Math.min(value + step, max);
    onValueChange(Math.round(next * 10) / 10); // Fix floating point
  };

  const decrement = () => {
    const next = Math.max(value - step, min);
    onValueChange(Math.round(next * 10) / 10);
  };

  return (
    <View style={[styles.sliderContainer, { borderColor: color + '25' }]}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderIcon}>{icon}</Text>
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>{label}</Text>
          {currentValue !== undefined && (
            <Text style={styles.sliderCurrent}>
              {currentLabel || 'Hiện tại'}: {currentValue}{unit}
            </Text>
          )}
        </View>
        <Text style={[styles.sliderValue, { color }]}>
          {value}{unit}
        </Text>
      </View>

      {/* Visual progress bar */}
      <View style={styles.sliderTrack}>
        <View
          style={[
            styles.sliderFill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
        {/* Current value marker */}
        {currentValue !== undefined && (
          <View
            style={[
              styles.currentMarker,
              {
                left: `${((currentValue - min) / (max - min)) * 100}%`,
                backgroundColor: COLORS.textPrimary,
              },
            ]}
          />
        )}
      </View>

      {/* +/- Buttons */}
      <View style={styles.sliderButtons}>
        <TouchableOpacity onPress={decrement} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.sliderRange}>{min} — {max} {unit}</Text>
        <TouchableOpacity onPress={increment} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────

const SettingsScreen: React.FC = () => {
  const { nodes, selectedNodeId, mqttStatus, setThresholds } = useNodeStore();
  const node = nodes[selectedNodeId];
  const currentThresholds = node?.thresholds ?? DEFAULT_THRESHOLDS;

  const [tempMax, setTempMax] = useState(currentThresholds.tempMax);
  const [tempMin, setTempMin] = useState(currentThresholds.tempMin);
  const [humMax, setHumMax] = useState(currentThresholds.humMax);
  const [gasMax, setGasMax] = useState(currentThresholds.gasMax);
  const [hasChanges, setHasChanges] = useState(false);

  // Đồng bộ 2 chiều: khi ESP32 gửi cấu hình mới về (hoặc chuyển Node) và người dùng không đang sửa dở
  React.useEffect(() => {
    if (!hasChanges) {
      setTempMax(currentThresholds.tempMax);
      setTempMin(currentThresholds.tempMin);
      setHumMax(currentThresholds.humMax);
      setGasMax(currentThresholds.gasMax);
    }
  }, [
    currentThresholds.tempMax,
    currentThresholds.tempMin,
    currentThresholds.humMax,
    currentThresholds.gasMax,
    selectedNodeId,
    hasChanges,
  ]);

  // Khi chuyển node, yêu cầu ESP32 gửi cấu hình và nạp từ Firestore
  React.useEffect(() => {
    setHasChanges(false);
    mqttService.requestConfig(selectedNodeId);
    firebaseService.loadConfig(selectedNodeId).then((cloudConfig) => {
      if (cloudConfig) {
        useNodeStore.getState().updateNodeConfig(
          selectedNodeId,
          cloudConfig.thresholds,
          cloudConfig.timerConfig
        );
      }
    });
  }, [selectedNodeId]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const handleSave = useCallback(() => {
    // Validate
    if (tempMin >= tempMax) {
      Alert.alert('⚠️ Lỗi', 'Nhiệt độ MIN phải nhỏ hơn MAX');
      return;
    }

    const thresholds: Thresholds = {
      tempMax,
      tempMin,
      humMax,
      gasMax,
    };

    // Publish to ESP32 → ESP32 ghi EEPROM
    mqttService.publishThresholds(selectedNodeId, thresholds);

    // Update local state
    setThresholds(selectedNodeId, thresholds);

    // Lưu lên Firestore (cloud backup)
    const timerConfig = node?.timerConfig ?? { onHour: 8, onMinute: 0, offHour: 17, offMinute: 0 };
    firebaseService.saveConfig(selectedNodeId, thresholds, timerConfig);

    setHasChanges(false);

    Alert.alert(
      '✅ Đã lưu',
      `Ngưỡng cảnh báo Node #${selectedNodeId} đã được cập nhật.\nESP32 sẽ ghi vào EEPROM.`,
      [{ text: 'OK' }]
    );
  }, [selectedNodeId, tempMax, tempMin, humMax, gasMax]);

  const handleReset = useCallback(() => {
    Alert.alert(
      '↩️ Đặt lại mặc định?',
      'Sẽ khôi phục tất cả ngưỡng về giá trị gốc của firmware.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          style: 'destructive',
          onPress: () => {
            setTempMax(DEFAULT_THRESHOLDS.tempMax);
            setTempMin(DEFAULT_THRESHOLDS.tempMin);
            setHumMax(DEFAULT_THRESHOLDS.humMax);
            setGasMax(DEFAULT_THRESHOLDS.gasMax);
            setHasChanges(true);
          },
        },
      ]
    );
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Ngưỡng Cảnh Báo</Text>
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
        {/* Section: Temperature */}
        <Text style={styles.sectionTitle}>🌡️ NHIỆT ĐỘ</Text>

        <ThresholdSlider
          icon="🔺"
          label="Nhiệt độ MAX"
          value={tempMax}
          min={0}
          max={100}
          step={0.5}
          unit="°C"
          color={COLORS.danger}
          currentValue={node?.data?.temperature}
          onValueChange={(v) => { setTempMax(v); markChanged(); }}
        />

        <ThresholdSlider
          icon="🔻"
          label="Nhiệt độ MIN"
          value={tempMin}
          min={0}
          max={100}
          step={0.5}
          unit="°C"
          color={COLORS.info}
          currentValue={node?.data?.temperature}
          onValueChange={(v) => { setTempMin(v); markChanged(); }}
        />

        {/* Section: Humidity */}
        <Text style={styles.sectionTitle}>💧 ĐỘ ẨM</Text>

        <ThresholdSlider
          icon="💧"
          label="Độ ẩm MAX"
          value={humMax}
          min={0}
          max={100}
          step={1}
          unit="%"
          color={COLORS.infoLight}
          currentValue={node?.data?.humidity}
          onValueChange={(v) => { setHumMax(v); markChanged(); }}
        />

        {/* Section: Gas */}
        <Text style={styles.sectionTitle}>💨 KHÍ GAS (MQ-2)</Text>

        <ThresholdSlider
          icon="⚠️"
          label="Ngưỡng Gas"
          value={gasMax}
          min={0}
          max={4095}
          step={50}
          unit=""
          color={COLORS.gas}
          currentValue={node?.data?.gasLevel}
          currentLabel="Mức hiện tại"
          onValueChange={(v) => { setGasMax(v); markChanged(); }}
        />

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>↩️ Mặc định</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!hasChanges}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {hasChanges ? '💾 Lưu & Gửi' : '✓ Đã lưu'}
            </Text>
          </TouchableOpacity>
        </View>

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
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  // Slider
  sliderContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sliderIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  sliderLabels: {
    flex: 1,
  },
  sliderLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sliderCurrent: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sliderValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sliderTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'visible',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  currentMarker: {
    position: 'absolute',
    top: -3,
    width: 4,
    height: 12,
    borderRadius: 2,
    marginLeft: -2,
  },
  sliderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 44,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sliderRange: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  resetButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 2,
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

export default SettingsScreen;
