/**
 * ================================================================
 * System Screen — Quản lý hệ thống (MODE_NODEID)
 * ================================================================
 *
 * Tương ứng firmware MODE_NODEID (dòng 541-547):
 *   - Hiển thị danh sách node
 *   - Thông tin chi tiết từng node
 *   - Cấu hình MQTT broker
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { useNodeStore } from '../store/useNodeStore';
import { mqttService } from '../services/MqttService';
import { timeSyncService } from '../services/TimeSyncService';
import ConnectionStatus from '../components/ConnectionStatus';

const SystemScreen: React.FC = () => {
  const {
    nodes,
    selectedNodeId,
    mqttStatus,
    brokerUrl,
    selectNode,
    setMqttStatus,
    setBrokerUrl,
  } = useNodeStore();

  const [editingUrl, setEditingUrl] = useState(brokerUrl);
  const [showUrlEditor, setShowUrlEditor] = useState(false);

  const nodeEntries = Object.entries(nodes)
    .map(([id, info]) => ({ id: Number(id), ...info }))
    .sort((a, b) => a.id - b.id);

  const handleConnect = useCallback(async () => {
    setMqttStatus('connecting');
    setBrokerUrl(editingUrl);

    try {
      mqttService.disconnect();
      mqttService.setCallbacks({
        onConnect: () => {
          setMqttStatus('connected');
          mqttService.subscribeAllNodes();
          timeSyncService.start();
        },
        onDisconnect: () => setMqttStatus('disconnected'),
        onData: (packet) => useNodeStore.getState().updateNodeData(packet),
        onTime: (packet) => {
          useNodeStore.getState().updateNodeTime(packet);
        },
        onConfig: (nodeId, thresholds, timerConfig) => {
          useNodeStore.getState().updateNodeConfig(nodeId, thresholds, timerConfig);
        },
      });
      await mqttService.connect(editingUrl);
    } catch (error) {
      setMqttStatus('disconnected');
      Alert.alert('❌ Lỗi kết nối', String(error));
    }
  }, [editingUrl]);

  const handleDisconnect = useCallback(() => {
    mqttService.disconnect();
    timeSyncService.stop();
    setMqttStatus('disconnected');
  }, []);

  const formatTime = (node: any) => {
    if (!node?.time) return '--:--:--';
    const { hour, minute, second } = node.time;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  };

  const formatLastSeen = (lastUpdate: number) => {
    if (!lastUpdate) return 'Chưa nhận dữ liệu';
    const diff = Math.floor((Date.now() - lastUpdate) / 1000);
    if (diff < 5) return 'Vừa mới';
    if (diff < 60) return `${diff}s trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
    return `${Math.floor(diff / 3600)}h trước`;
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Hệ Thống</Text>
            <Text style={styles.headerSubtitle}>Quản lý kết nối & thiết bị</Text>
          </View>
          <ConnectionStatus status={mqttStatus} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MQTT Connection Section */}
        <Text style={styles.sectionTitle}>📡 KẾT NỐI MQTT</Text>

        <View style={styles.connectionCard}>
          <View style={styles.connectionRow}>
            <Text style={styles.connectionLabel}>Trạng thái</Text>
            <View style={styles.connectionStatus}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      mqttStatus === 'connected'
                        ? COLORS.success
                        : mqttStatus === 'connecting'
                          ? COLORS.warning
                          : COLORS.danger,
                  },
                ]}
              />
              <Text style={styles.connectionValue}>
                {mqttStatus === 'connected'
                  ? 'Đã kết nối'
                  : mqttStatus === 'connecting'
                    ? 'Đang kết nối...'
                    : 'Ngắt kết nối'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.connectionRow}
            onPress={() => setShowUrlEditor(!showUrlEditor)}
          >
            <Text style={styles.connectionLabel}>Broker URL</Text>
            <Text style={styles.connectionUrl} numberOfLines={1}>
              {brokerUrl}
            </Text>
          </TouchableOpacity>

          {showUrlEditor && (
            <View style={styles.urlEditor}>
              <TextInput
                style={styles.urlInput}
                value={editingUrl}
                onChangeText={setEditingUrl}
                placeholder="wss://broker.hivemq.com:8884/mqtt"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.connectionActions}>
            {mqttStatus === 'connected' ? (
              <TouchableOpacity
                style={[styles.connectBtn, styles.disconnectBtn]}
                onPress={handleDisconnect}
              >
                <Text style={styles.connectBtnText}>🔌 Ngắt kết nối</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={handleConnect}
                disabled={mqttStatus === 'connecting'}
              >
                <Text style={styles.connectBtnText}>
                  {mqttStatus === 'connecting' ? '⏳ Đang kết nối...' : '🔗 Kết nối'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Node List */}
        <Text style={styles.sectionTitle}>🖥️ DANH SÁCH NODE ({nodeEntries.length})</Text>

        {nodeEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>Chưa có node nào</Text>
            <Text style={styles.emptySubtitle}>
              Kết nối MQTT broker để nhận dữ liệu từ ESP32
            </Text>
          </View>
        ) : (
          nodeEntries.map((node) => (
            <TouchableOpacity
              key={node.id}
              style={[
                styles.nodeCard,
                node.id === selectedNodeId && styles.nodeCardSelected,
                node.data?.isAlarm && styles.nodeCardAlarm,
              ]}
              onPress={() => selectNode(node.id)}
              activeOpacity={0.7}
            >
              <View style={styles.nodeHeader}>
                <View style={styles.nodeIdContainer}>
                  <Text style={styles.nodeId}>#{node.id}</Text>
                  <View
                    style={[
                      styles.onlineDot,
                      {
                        backgroundColor: node.isOnline
                          ? COLORS.success
                          : COLORS.textMuted,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.nodeTime}>{formatTime(node)}</Text>
              </View>

              <View style={styles.nodeDetails}>
                <View style={styles.nodeDetail}>
                  <Text style={styles.nodeDetailLabel}>🌡️</Text>
                  <Text style={styles.nodeDetailValue}>
                    {node.data?.temperature?.toFixed(1) ?? '--'}°C
                  </Text>
                </View>
                <View style={styles.nodeDetail}>
                  <Text style={styles.nodeDetailLabel}>💧</Text>
                  <Text style={styles.nodeDetailValue}>
                    {node.data?.humidity?.toFixed(0) ?? '--'}%
                  </Text>
                </View>
                <View style={styles.nodeDetail}>
                  <Text style={styles.nodeDetailLabel}>💨</Text>
                  <Text style={styles.nodeDetailValue}>
                    {node.data?.gasLevel ?? '--'}
                  </Text>
                </View>
                <View style={styles.nodeDetail}>
                  <Text style={styles.nodeDetailLabel}>⚡</Text>
                  <Text
                    style={[
                      styles.nodeDetailValue,
                      {
                        color: node.data?.relayState
                          ? COLORS.success
                          : COLORS.textMuted,
                      },
                    ]}
                  >
                    {node.data?.relayState ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>

              <View style={styles.nodeFooter}>
                <View style={styles.nodeBadges}>
                  <View
                    style={[
                      styles.nodeBadge,
                      {
                        backgroundColor: node.time?.hasRtc
                          ? COLORS.info + '20'
                          : COLORS.warning + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nodeBadgeText,
                        {
                          color: node.time?.hasRtc
                            ? COLORS.info
                            : COLORS.warning,
                        },
                      ]}
                    >
                      {node.time?.hasRtc ? 'RTC' : 'SYNC'}
                    </Text>
                  </View>
                  {node.data?.isAlarm && (
                    <View style={[styles.nodeBadge, { backgroundColor: COLORS.danger + '20' }]}>
                      <Text style={[styles.nodeBadgeText, { color: COLORS.danger }]}>
                        ALARM
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.nodeLastSeen}>
                  {formatLastSeen(node.lastUpdate)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Thông tin</Text>
          <Text style={styles.infoText}>
            • Node ID hỗ trợ: 1 — 9{'\n'}
            • Firmware: Edge Node v10.4{'\n'}
            • Giao thức: MQTT over WebSocket{'\n'}
            • Đồng bộ giờ: Tự động mỗi 60s (cho node không có RTC)
          </Text>
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
  // Connection
  connectionCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  connectionLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  connectionUrl: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  urlEditor: {
    marginTop: SPACING.sm,
  },
  urlInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
  },
  connectionActions: {
    marginTop: SPACING.md,
  },
  connectBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  disconnectBtn: {
    backgroundColor: COLORS.danger,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 250,
  },
  // Node cards
  nodeCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  nodeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  nodeCardAlarm: {
    borderColor: COLORS.danger + '60',
  },
  nodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  nodeIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  nodeId: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nodeTime: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '300',
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  nodeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  nodeDetail: {
    alignItems: 'center',
    gap: 4,
  },
  nodeDetailLabel: {
    fontSize: 14,
  },
  nodeDetailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  nodeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nodeBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  nodeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  nodeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nodeLastSeen: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  // Info
  infoCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
});

export default SystemScreen;
