/**
 * ================================================================
 * Zustand Store — Quản lý trạng thái toàn bộ Nodes
 * ================================================================
 *
 * Lưu trữ:
 *   - Telemetry data (nhiệt độ, độ ẩm, gas, relay, alarm) của từng node
 *   - Thời gian từ node (giờ, phút, giây, RTC status)
 *   - Cấu hình ngưỡng (thresholds) và hẹn giờ (timer)
 *   - Trạng thái online/offline (timeout 15s)
 *   - Danh sách thiết bị ghép nối của người dùng (userDevices)
 */

import { create } from 'zustand';
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_TIMER_CONFIG,
} from '../types/HardwarePackets';
import { NODE_OFFLINE_TIMEOUT } from '../constants/mqtt';
import type {
  NodeInfo,
  DataPacket,
  TimePacket,
  Thresholds,
  TimerConfig,
  AlarmStatus,
} from '../types/HardwarePackets';

// ─── Store State Interface ──────────────────────────────────────

interface NodeStoreState {
  /** Map nodeId -> NodeInfo */
  nodes: Record<number, NodeInfo>;

  /** ID của node đang được chọn hiển thị trên Dashboard */
  selectedNodeId: number;

  /** Trạng thái kết nối MQTT */
  mqttStatus: 'disconnected' | 'connecting' | 'connected';

  /** URL của MQTT broker */
  brokerUrl: string;

  /** Danh sách tên trụ tùy chỉnh của người dùng: nodeId -> name */
  userDevices: Record<number, string>;

  /** Khóa chống nhấp nháy relay trong lúc gửi lệnh */
  relayLocks: Record<number, number>;

  // ── Actions ──────────────────────────────────────────────────

  /** Cập nhật telemetry data từ DataPacket (MQTT) */
  updateNodeData: (packet: DataPacket) => void;

  /** Cập nhật time data từ TimePacket (MQTT) */
  updateNodeTime: (packet: TimePacket) => void;

  /** Cập nhật trạng thái relay cục bộ có khóa chống nhấp nháy */
  setLocalRelayState: (nodeId: number, state: boolean) => void;

  /** Đặt ngưỡng cho node */
  setThresholds: (nodeId: number, thresholds: Thresholds) => void;

  /** Đặt cấu hình timer cho node */
  setTimerConfig: (nodeId: number, config: TimerConfig) => void;

  /** Cập nhật ngưỡng và timer từ hardware hoặc cloud */
  updateNodeConfig: (nodeId: number, thresholds: Thresholds, timerConfig: TimerConfig) => void;

  /** Chọn node */
  selectNode: (nodeId: number) => void;

  /** Cập nhật trạng thái kết nối MQTT */
  setMqttStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;

  /** Cập nhật URL broker */
  setBrokerUrl: (url: string) => void;

  /** Kiểm tra và đánh dấu node offline */
  checkOnlineStatus: () => void;

  /** Lấy thông tin node đang chọn */
  getSelectedNode: () => NodeInfo | undefined;

  /** Lấy tất cả node đang online */
  getOnlineNodes: () => NodeInfo[];

  /** Set danh sách thiết bị từ cloud */
  setUserDevices: (devices: Record<number, string>) => void;

  /** Thêm hoặc ghép nối trụ mới */
  addDevice: (nodeId: number, name: string) => void;

  /** Đổi tên trụ */
  renameDevice: (nodeId: number, name: string) => void;

  /** Xóa trụ khỏi danh sách */
  removeDevice: (nodeId: number) => void;
}

// ─── Helper: Determine alarm status from DataPacket ─────────────

function resolveAlarmStatus(packet: DataPacket, previousStatus: AlarmStatus): AlarmStatus {
  if (!packet.isAlarm) return 'none';
  if (previousStatus === 'hard_muted') return 'hard_muted';
  if (previousStatus === 'muted_snooze') return 'muted_snooze';
  return 'active';
}

// ─── Helper: Create default NodeInfo ────────────────────────────

function createDefaultNodeInfo(nodeId: number): NodeInfo {
  return {
    data: {
      nodeId,
      temperature: 0,
      humidity: 0,
      gasLevel: 0,
      relayState: false,
      isAlarm: false,
    },
    time: {
      nodeId,
      hour: 0,
      minute: 0,
      second: 0,
      hasRtc: false,
    },
    thresholds: { ...DEFAULT_THRESHOLDS },
    timerConfig: { ...DEFAULT_TIMER_CONFIG },
    alarmStatus: 'none',
    lastUpdate: 0,
    isOnline: false,
  };
}

// ─── Store ──────────────────────────────────────────────────────

export const useNodeStore = create<NodeStoreState>((set, get) => ({
  nodes: {},
  selectedNodeId: 1,
  mqttStatus: 'disconnected',
  brokerUrl: 'wss://broker.hivemq.com:8884/mqtt',
  userDevices: { 1: 'Trụ Giám Sát #1' },
  relayLocks: {},

  updateNodeData: (packet: DataPacket) => {
    set((state) => {
      const existing = state.nodes[packet.nodeId] || createDefaultNodeInfo(packet.nodeId);
      const alarmStatus = resolveAlarmStatus(packet, existing.alarmStatus);

      // Nếu đang có khóa chống nhảy relay (trong 2s sau khi bấm nút), giữ nguyên trạng thái relay
      const isRelayLocked = (state.relayLocks?.[packet.nodeId] ?? 0) > Date.now();
      const finalRelayState = isRelayLocked
        ? (existing.data?.relayState ?? packet.relayState)
        : packet.relayState;

      const finalPacket: DataPacket = {
        ...packet,
        relayState: finalRelayState,
      };

      // Tự động chuyển tới node đang gửi dữ liệu nếu node hiện tại chưa có dữ liệu
      let newSelectedNodeId = state.selectedNodeId;
      const currentSelected = state.nodes[state.selectedNodeId];
      if (!currentSelected || (!currentSelected.isOnline && currentSelected.lastUpdate === 0)) {
        newSelectedNodeId = packet.nodeId;
      }

      return {
        selectedNodeId: newSelectedNodeId,
        nodes: {
          ...state.nodes,
          [packet.nodeId]: {
            ...existing,
            data: finalPacket,
            alarmStatus,
            lastUpdate: Date.now(),
            isOnline: true,
          },
        },
      };
    });
  },

  updateNodeTime: (packet: TimePacket) => {
    set((state) => {
      const existing = state.nodes[packet.nodeId] || createDefaultNodeInfo(packet.nodeId);
      return {
        nodes: {
          ...state.nodes,
          [packet.nodeId]: {
            ...existing,
            time: packet,
            lastUpdate: Date.now(),
            isOnline: true,
          },
        },
      };
    });
  },

  setLocalRelayState: (nodeId: number, stateVal: boolean) => {
    set((state) => {
      const existing = state.nodes[nodeId] || createDefaultNodeInfo(nodeId);
      const updatedData = existing.data
        ? { ...existing.data, relayState: stateVal }
        : { ...createDefaultNodeInfo(nodeId).data, relayState: stateVal };

      return {
        relayLocks: {
          ...state.relayLocks,
          [nodeId]: Date.now() + 2000, // Khóa trong 2 giây
        },
        nodes: {
          ...state.nodes,
          [nodeId]: {
            ...existing,
            data: updatedData,
          },
        },
      };
    });
  },

  setThresholds: (nodeId: number, thresholds: Thresholds) => {
    set((state) => {
      const existing = state.nodes[nodeId] || createDefaultNodeInfo(nodeId);
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...existing, thresholds },
        },
      };
    });
  },

  setTimerConfig: (nodeId: number, config: TimerConfig) => {
    set((state) => {
      const existing = state.nodes[nodeId] || createDefaultNodeInfo(nodeId);
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...existing, timerConfig: config },
        },
      };
    });
  },

  updateNodeConfig: (nodeId: number, thresholds: Thresholds, timerConfig: TimerConfig) => {
    set((state) => {
      const existing = state.nodes[nodeId] || createDefaultNodeInfo(nodeId);
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: {
            ...existing,
            thresholds: { ...existing.thresholds, ...thresholds },
            timerConfig: { ...existing.timerConfig, ...timerConfig },
          },
        },
      };
    });
  },

  selectNode: (nodeId: number) => {
    set({ selectedNodeId: nodeId });
  },

  setMqttStatus: (status) => {
    set({ mqttStatus: status });
  },

  setBrokerUrl: (url: string) => {
    set({ brokerUrl: url });
  },

  checkOnlineStatus: () => {
    const now = Date.now();
    set((state) => {
      const updatedNodes = { ...state.nodes };
      let changed = false;
      Object.keys(updatedNodes).forEach((key) => {
        const nodeId = Number(key);
        const node = updatedNodes[nodeId];
        const isOnline = now - node.lastUpdate < NODE_OFFLINE_TIMEOUT;
        if (node.isOnline !== isOnline) {
          updatedNodes[nodeId] = { ...node, isOnline };
          changed = true;
        }
      });
      return changed ? { nodes: updatedNodes } : {};
    });
  },

  getSelectedNode: () => {
    const state = get();
    return state.nodes[state.selectedNodeId];
  },

  getOnlineNodes: () => {
    const state = get();
    return Object.values(state.nodes).filter((n) => n.isOnline);
  },

  setUserDevices: (devices: Record<number, string>) => {
    set({ userDevices: devices });
  },

  addDevice: (nodeId: number, name: string) => {
    set((state) => {
      const existingNode = state.nodes[nodeId] || createDefaultNodeInfo(nodeId);
      return {
        selectedNodeId: nodeId,
        userDevices: {
          ...state.userDevices,
          [nodeId]: name || `Trụ #${nodeId}`,
        },
        nodes: {
          ...state.nodes,
          [nodeId]: existingNode,
        },
      };
    });
  },

  renameDevice: (nodeId: number, name: string) => {
    set((state) => ({
      userDevices: {
        ...state.userDevices,
        [nodeId]: name,
      },
    }));
  },

  removeDevice: (nodeId: number) => {
    set((state) => {
      const updatedDevices = { ...state.userDevices };
      delete updatedDevices[nodeId];
      const updatedNodes = { ...state.nodes };
      delete updatedNodes[nodeId];
      const remainingIds = Object.keys(updatedDevices).map(Number);
      const newSelected = remainingIds.length > 0 ? remainingIds[0] : 1;
      return {
        userDevices: updatedDevices,
        nodes: updatedNodes,
        selectedNodeId: state.selectedNodeId === nodeId ? newSelected : state.selectedNodeId,
      };
    });
  },
}));

export default useNodeStore;
