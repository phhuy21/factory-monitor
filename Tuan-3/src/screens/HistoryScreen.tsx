/**
 * ================================================================
 * History Screen — Biểu đồ lịch sử sensor data từ Firestore
 * ================================================================
 *
 * Hiển thị biểu đồ nhiệt độ, độ ẩm, gas theo thời gian.
 * Dữ liệu được query từ Firestore subcollection nodes/{nodeId}/readings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { firebaseService, type SensorReading } from '../services/FirebaseService';
import { useNodeStore } from '../store/useNodeStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.xxl * 2 - SPACING.lg * 2;
const CHART_HEIGHT = 120;

// ─── Time Range Options ─────────────────────────────────────────

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
];

// ─── Mini Chart Component ───────────────────────────────────────

interface MiniChartProps {
  data: number[];
  color: string;
  label: string;
  unit: string;
  min?: number;
  max?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, label, unit, min, max }) => {
  if (data.length === 0) {
    return (
      <View style={[styles.chartCard, { borderColor: color + '40' }]}>
        <Text style={[styles.chartLabel, { color }]}>{label}</Text>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
        </View>
      </View>
    );
  }

  const dataMin = min ?? Math.min(...data);
  const dataMax = max ?? Math.max(...data);
  const range = dataMax - dataMin || 1;
  const latest = data[data.length - 1];
  const avg = data.reduce((a, b) => a + b, 0) / data.length;

  // Lấy mẫu tối đa 35 điểm dữ liệu để vừa vặn 100% trong khung và không tràn viền
  const maxBars = 35;
  const sampleStep = Math.max(1, Math.floor(data.length / maxBars));
  const sampledData = data.filter((_, i) => i % sampleStep === 0).slice(-maxBars);

  return (
    <View style={[styles.chartCard, { borderColor: color + '40' }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartLabel, { color }]}>{label}</Text>
        <Text style={[styles.chartValue, { color }]}>
          {latest.toFixed(1)}{unit}
        </Text>
      </View>

      {/* Chart area */}
      <View style={styles.chartArea}>
        <View style={styles.chartBars}>
          {sampledData.map((value, index) => {
            const height = Math.max(
              4,
              ((value - dataMin) / range) * (CHART_HEIGHT - 10) + 4
            );
            return (
              <View
                key={index}
                style={[
                  styles.chartBar,
                  {
                    height,
                    flex: 1,
                    marginHorizontal: 1,
                    backgroundColor: color + '90',
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.chartStats}>
        <Text style={styles.chartStat}>Min: {dataMin.toFixed(1)}{unit}</Text>
        <Text style={styles.chartStat}>Avg: {avg.toFixed(1)}{unit}</Text>
        <Text style={styles.chartStat}>Max: {dataMax.toFixed(1)}{unit}</Text>
      </View>
    </View>
  );
};

// ─── History Screen ─────────────────────────────────────────────

const HistoryScreen: React.FC = () => {
  const selectedNodeId = useNodeStore((s) => s.selectedNodeId);
  const nodes = useNodeStore((s) => s.nodes);

  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [selectedRange, setSelectedRange] = useState(2); // default: 24h
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Lấy danh sách node IDs
  const nodeIds = Object.keys(nodes).map(Number);
  const [activeNodeId, setActiveNodeId] = useState(selectedNodeId);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await firebaseService.getHistory(
        activeNodeId,
        TIME_RANGES[selectedRange].hours,
        200
      );
      setReadings(data);
    } catch (error) {
      console.error('[HISTORY] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeNodeId, selectedRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Extract data arrays
  const temps = readings.map((r) => r.temperature);
  const hums = readings.map((r) => r.humidity);
  const gases = readings.map((r) => r.gasLevel);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📈 Lịch sử cảm biến</Text>
        <Text style={styles.headerSubtitle}>
          {readings.length} bản ghi | Node #{activeNodeId}
        </Text>
      </View>

      {/* Node Selector */}
      {nodeIds.length > 1 && (
        <View style={styles.selectorRow}>
          {nodeIds.map((id) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.selectorChip,
                id === activeNodeId && styles.selectorChipActive,
              ]}
              onPress={() => setActiveNodeId(id)}
            >
              <Text
                style={[
                  styles.selectorChipText,
                  id === activeNodeId && styles.selectorChipTextActive,
                ]}
              >
                Node #{id}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Time Range Selector */}
      <View style={styles.selectorRow}>
        {TIME_RANGES.map((range, index) => (
          <TouchableOpacity
            key={range.label}
            style={[
              styles.rangeChip,
              index === selectedRange && styles.rangeChipActive,
            ]}
            onPress={() => setSelectedRange(index)}
          >
            <Text
              style={[
                styles.rangeChipText,
                index === selectedRange && styles.rangeChipTextActive,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      )}

      {/* Charts */}
      {!loading && (
        <>
          <MiniChart
            data={temps}
            color={COLORS.warning}
            label="🌡 Nhiệt độ"
            unit="°C"
          />
          <MiniChart
            data={hums}
            color={COLORS.info}
            label="💧 Độ ẩm"
            unit="%"
          />
          <MiniChart
            data={gases}
            color={COLORS.gas}
            label="💨 Khí Gas"
            unit=""
          />
        </>
      )}

      {/* Empty state */}
      {!loading && readings.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>📭</Text>
          <Text style={styles.emptyStateTitle}>Chưa có dữ liệu</Text>
          <Text style={styles.emptyStateText}>
            Dữ liệu sensor sẽ tự động được lưu mỗi 30 giây{'\n'}
            khi ESP32 đang kết nối.
          </Text>
        </View>
      )}

      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xxl,
    paddingTop: 60,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  selectorChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorChipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  selectorChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  selectorChipTextActive: {
    color: COLORS.primary,
  },
  rangeChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  rangeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rangeChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  rangeChipTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  chartLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  chartValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  chartArea: {
    height: CHART_HEIGHT,
    marginBottom: SPACING.sm,
    width: '100%',
    overflow: 'hidden',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    width: '100%',
  },
  chartBar: {
    minHeight: 2,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartStat: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  emptyChart: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HistoryScreen;
