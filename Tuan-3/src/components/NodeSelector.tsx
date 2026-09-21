/**
 * ================================================================
 * NodeSelector — Chọn node và thêm trụ mới
 * ================================================================
 *
 * Horizontal scroll list hiển thị các node đang online/offline,
 * tên trụ tùy chỉnh của người dùng, và nút thêm trụ mới qua QR/Manual.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES } from '../constants/theme';
import type { NodeInfo } from '../types/HardwarePackets';
import { useNodeStore } from '../store/useNodeStore';
import { firebaseService } from '../services/FirebaseService';
import { authService } from '../services/AuthService';

interface NodeSelectorProps {
  nodes: Record<number, NodeInfo>;
  selectedNodeId: number;
  onSelect: (nodeId: number) => void;
  onAddPress?: () => void;
}

const NodeSelector: React.FC<NodeSelectorProps> = ({
  nodes,
  selectedNodeId,
  onSelect,
  onAddPress,
}) => {
  const userDevices = useNodeStore((s) => s.userDevices) || {};
  const removeDevice = useNodeStore((s) => s.removeDevice);

  const handleLongPress = (nodeId: number, name: string) => {
    Alert.alert(
      'Xóa Trụ Giám Sát',
      `Bạn có chắc chắn muốn xóa "${name}" (ID #${nodeId}) khỏi danh sách không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa Trụ',
          style: 'destructive',
          onPress: async () => {
            removeDevice(nodeId);
            const user = authService.currentUser;
            if (user) {
              await firebaseService.deleteUserDevice(user.uid, nodeId);
            }
          },
        },
      ]
    );
  };

  // Kết hợp node từ store telemetry và node do người dùng đăng ký
  const allIds = Array.from(
    new Set([
      ...Object.keys(nodes).map(Number),
      ...Object.keys(userDevices).map(Number),
    ])
  ).sort((a, b) => a - b);

  const displayIds = allIds.length > 0 ? allIds : [1];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayIds.map((nodeId) => {
          const node = nodes[nodeId];
          const isSelected = nodeId === selectedNodeId;
          const isOnline = node?.isOnline ?? false;
          const hasAlarm = node?.data?.isAlarm ?? false;
          const customName = userDevices[nodeId] || `Trụ #${nodeId}`;

          return (
            <TouchableOpacity
              key={nodeId}
              onPress={() => onSelect(nodeId)}
              onLongPress={() => handleLongPress(nodeId, customName)}
              delayLongPress={600}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                hasAlarm && styles.chipAlarm,
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: hasAlarm
                      ? COLORS.danger
                      : isOnline
                        ? COLORS.success
                        : COLORS.textMuted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
                numberOfLines={1}
              >
                {customName}
              </Text>
              {node?.time?.hasRtc && (
                <Text style={styles.rtcBadge}>RTC</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Nút Thêm Trụ Mới */}
        {onAddPress && (
          <TouchableOpacity
            style={styles.addChip}
            onPress={onAddPress}
            activeOpacity={0.7}
          >
            <Text style={styles.addChipText}>+ Thêm Trụ</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  chipSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  chipAlarm: {
    borderColor: COLORS.danger,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rtcBadge: {
    fontSize: 8,
    color: COLORS.info,
    fontWeight: '800',
    backgroundColor: COLORS.info + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  addChipText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});

export default NodeSelector;
