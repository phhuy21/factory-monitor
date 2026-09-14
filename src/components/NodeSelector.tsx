/**
 * ================================================================
 * NodeSelector — Chọn node để xem
 * ================================================================
 *
 * Horizontal scroll list hiển thị các node đang online/offline.
 * Firmware hỗ trợ nodeId 1-9 (firmware dòng 67, 402, 472).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES } from '../constants/theme';
import type { NodeInfo } from '../types/HardwarePackets';

interface NodeSelectorProps {
  nodes: Record<number, NodeInfo>;
  selectedNodeId: number;
  onSelect: (nodeId: number) => void;
}

const NodeSelector: React.FC<NodeSelectorProps> = ({
  nodes,
  selectedNodeId,
  onSelect,
}) => {
  const nodeIds = Object.keys(nodes)
    .map(Number)
    .sort((a, b) => a - b);

  if (nodeIds.length <= 1) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {nodeIds.map((nodeId) => {
          const node = nodes[nodeId];
          const isSelected = nodeId === selectedNodeId;
          const isOnline = node?.isOnline ?? false;
          const hasAlarm = node?.data?.isAlarm ?? false;

          return (
            <TouchableOpacity
              key={nodeId}
              onPress={() => onSelect(nodeId)}
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
              >
                Node {nodeId}
              </Text>
              {node?.time?.hasRtc && (
                <Text style={styles.rtcBadge}>RTC</Text>
              )}
            </TouchableOpacity>
          );
        })}
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
});

export default NodeSelector;
