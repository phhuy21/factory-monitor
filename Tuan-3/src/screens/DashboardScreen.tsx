/**
 * ================================================================
 * Dashboard Screen — Màn hình giám sát (MODE_HOME)
 * ================================================================
 *
 * Tương ứng firmware MODE_HOME (dòng 494-516):
 *   - Hiển thị curTemp, curHum, curGas
 *   - Toggle relay (thay BTN_RELAY)
 *   - Cảnh báo alarm (alarmTriggered)
 *   - Thời gian node (curHr:curMin:curSec)
 *   - Nút Mute (thay BTN_MUTE)
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { useNodeStore } from '../store/useNodeStore';
import { mqttService } from '../services/MqttService';
import { DEFAULT_THRESHOLDS } from '../types/HardwarePackets';
import SensorCard from '../components/SensorCard';
import AlarmBanner from '../components/AlarmBanner';
import RelayToggle from '../components/RelayToggle';
import NodeSelector from '../components/NodeSelector';
import ConnectionStatus from '../components/ConnectionStatus';
import QRScannerModal from '../components/QRScannerModal';

const DashboardScreen: React.FC = () => {
  const {
    nodes,
    selectedNodeId,
    mqttStatus,
    selectNode,
    userDevices,
  } = useNodeStore();

  const [showQRModal, setShowQRModal] = useState(false);

  const node = nodes[selectedNodeId];
  const data = node?.data;
  const time = node?.time;
  const thresholds = node?.thresholds ?? DEFAULT_THRESHOLDS;
  const alarmStatus = node?.alarmStatus ?? 'none';
  const isOnline = node?.isOnline ?? false;

  // Header time animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const [dismissedAlarms, setDismissedAlarms] = useState<Record<number, boolean>>({});

  // Reset dismissed alarm nếu trạng thái an toàn
  useEffect(() => {
    if (alarmStatus === 'none') {
      setDismissedAlarms((prev) => ({ ...prev, [selectedNodeId]: false }));
    }
  }, [alarmStatus, selectedNodeId]);

  const handleToggleRelay = useCallback(() => {
    const currentRelay = data?.relayState ?? false;
    const targetState = !currentRelay;
    // Khóa trạng thái 2 giây chống nhảy ngược do packet trễ
    useNodeStore.getState().setLocalRelayState(selectedNodeId, targetState);
    // Gửi lệnh chính xác (bật hoặc tắt)
    mqttService.setRelayState(selectedNodeId, targetState);
  }, [selectedNodeId, data]);

  const handleMute = useCallback(() => {
    mqttService.muteAlarm(selectedNodeId);
  }, [selectedNodeId]);

  const handleHardMute = useCallback(() => {
    mqttService.hardMuteAlarm(selectedNodeId);
    setDismissedAlarms((prev) => ({ ...prev, [selectedNodeId]: true }));
  }, [selectedNodeId]);

  const handleDismissBanner = useCallback(() => {
    setDismissedAlarms((prev) => ({ ...prev, [selectedNodeId]: true }));
  }, [selectedNodeId]);

  // Format time display
  const timeStr = time
    ? `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:${String(time.second).padStart(2, '0')}`
    : '--:--:--';

  // Determine alert states (matches firmware dòng 499-500)
  const tempHigh = data && data.temperature > thresholds.tempMax;
  const tempLow = data && data.temperature < thresholds.tempMin;
  const humAlert = data && data.humidity > thresholds.humMax;
  const gasAlert = data && data.gasLevel > thresholds.gasMax;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Giám Sát Nhà Máy</Text>
            <Text style={styles.headerSubtitle}>
              {userDevices[selectedNodeId] || `Trụ #${selectedNodeId}`} {isOnline ? '' : '• Offline'}
            </Text>
          </View>
          <ConnectionStatus status={mqttStatus} />
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{timeStr}</Text>
          <View style={styles.timeBadges}>
            {time?.hasRtc ? (
              <View style={[styles.badge, styles.badgeRtc]}>
                <Text style={styles.badgeText}>RTC</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeSync]}>
                <Text style={styles.badgeText}>SYNC</Text>
              </View>
            )}
            {isOnline ? (
              <View style={[styles.badge, styles.badgeOnline]}>
                <Text style={styles.badgeText}>ONLINE</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeOffline]}>
                <Text style={styles.badgeText}>OFFLINE</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Node Selector */}
        <NodeSelector
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelect={selectNode}
          onAddPress={() => setShowQRModal(true)}
        />

        {/* Alarm Banner */}
        {alarmStatus !== 'none' && !dismissedAlarms[selectedNodeId] && (
          <AlarmBanner
            status={alarmStatus}
            nodeId={selectedNodeId}
            onMute={handleMute}
            onHardMute={handleHardMute}
            onDismiss={handleDismissBanner}
          />
        )}

        {/* Sensor Cards Grid */}
        <View style={styles.cardsGrid}>
          <SensorCard
            icon="🌡️"
            label="Nhiệt độ"
            value={data?.temperature ?? 0}
            unit="°C"
            color={COLORS.warning}
            glowColor={COLORS.warningGlow}
            isAlert={!!(tempHigh || tempLow)}
            alertLabel={tempHigh ? 'CAO' : tempLow ? 'THẤP' : undefined}
            decimals={1}
            maxValue={50}
          />
          <SensorCard
            icon="💧"
            label="Độ ẩm"
            value={data?.humidity ?? 0}
            unit="%"
            color={COLORS.info}
            glowColor={COLORS.infoGlow}
            isAlert={!!humAlert}
            alertLabel="CAO"
            decimals={0}
            maxValue={100}
          />
          <SensorCard
            icon="💨"
            label="Khí Gas"
            value={data?.gasLevel ?? 0}
            unit=""
            color={COLORS.gas}
            glowColor={COLORS.gasGlow}
            isAlert={!!gasAlert}
            alertLabel="NGUY HIỂM"
            decimals={0}
            maxValue={4095}
          />
          {/* Relay status card */}
          <View style={styles.relayCardWrapper}>
            <View style={[styles.miniCard, data?.relayState && styles.miniCardActive]}>
              <Text style={styles.miniCardIcon}>⚡</Text>
              <Text style={styles.miniCardLabel}>Relay</Text>
              <Text
                style={[
                  styles.miniCardValue,
                  { color: data?.relayState ? COLORS.success : COLORS.textMuted },
                ]}
              >
                {data?.relayState ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
        </View>

        {/* Relay Toggle */}
        <View style={styles.relaySection}>
          <RelayToggle
            isOn={data?.relayState ?? false}
            onToggle={handleToggleRelay}
            disabled={mqttStatus !== 'connected'}
          />
        </View>

        {/* Threshold Summary */}
        <View style={styles.thresholdSummary}>
          <Text style={styles.sectionTitle}>Ngưỡng hiện tại</Text>
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdLabel}>T.Max</Text>
              <Text style={styles.thresholdValue}>{thresholds.tempMax}°C</Text>
            </View>
            <View style={styles.thresholdDivider} />
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdLabel}>T.Min</Text>
              <Text style={styles.thresholdValue}>{thresholds.tempMin}°C</Text>
            </View>
            <View style={styles.thresholdDivider} />
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdLabel}>Độ ẩm</Text>
              <Text style={styles.thresholdValue}>{thresholds.humMax}%</Text>
            </View>
            <View style={styles.thresholdDivider} />
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdLabel}>Gas</Text>
              <Text style={styles.thresholdValue}>{thresholds.gasMax}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Scanner / Ghép nối trụ */}
      <QRScannerModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
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
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  timeText: {
    fontSize: FONT_SIZES.display,
    fontWeight: '200',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timeBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeRtc: {
    backgroundColor: COLORS.info + '25',
  },
  badgeSync: {
    backgroundColor: COLORS.warning + '25',
  },
  badgeOnline: {
    backgroundColor: COLORS.success + '25',
  },
  badgeOffline: {
    backgroundColor: COLORS.danger + '25',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.lg,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  relayCardWrapper: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  miniCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCardActive: {
    borderColor: COLORS.success + '50',
    ...SHADOWS.glow(COLORS.success),
  },
  miniCardIcon: {
    fontSize: 28,
    marginBottom: SPACING.sm,
  },
  miniCardLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  miniCardValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  relaySection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  thresholdSummary: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thresholdItem: {
    flex: 1,
    alignItems: 'center',
  },
  thresholdLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  thresholdValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  thresholdDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
});

export default DashboardScreen;
