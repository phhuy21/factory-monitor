/**
 * ================================================================
 * Global State Store (Zustand)
 * ================================================================
 *
 * Quản lý toàn bộ state của ứng dụng:
 *   - Dữ liệu realtime từ các node
 *   - Cấu hình ngưỡng và timer
 *   - Trạng thái kết nối MQTT
 *   - Selected node
 */

import { create } from 'zustand';
import type {
  DataPacket,
  TimePacket,
  Thresholds,
  TimerConfig,
  AlarmStatus,
  NodeInfo,
} from '../types/HardwarePackets';
import { DEFAULT_THRESHOLDS, DEFAULT_TIMER_CONFIG } from '../types/HardwarePackets';
import { NODE_OFFLINE_TIMEOUT } from '../constants/mqtt';

// ─── Store Interface ────────────────────────────────────────────

interface NodeStoreState {
  /** Map of node data keyed by nodeId */
  nodes: Record<number, NodeInfo>;

  /** Currently selected node for detail view */
  selectedNodeId: number;

  /** MQTT connection status */
  mqttStatus: 'disconnected' | 'connecting' | 'connected';

  /** MQTT broker URL */
  brokerUrl: string;

  // ─── Actions ────────────────────────────────────────────────

  /** Update sensor data for a node (called when DataPacket received) */
  updateNodeData: (packet: DataPacket) => void;

  /** Update time info for a node (called when TimePacket received) */
  updateNodeTime: (packet: TimePacket) => void;

  /** Set thresholds for a node */
  setThresholds: (nodeId: number, thresholds: Thresholds) => void;

  /** Set timer config for a node */
  setTimerConfig: (nodeId: number, config: TimerConfig) => void;

  /** Update thresholds & timer config from hardware or cloud */
  updateNodeConfig: (nodeId: number, thresholds: Thresholds, timerConfig: TimerConfig) => void;

  /** Select a node */
  selectNode: (nodeId: number) => void;

  /** Update MQTT connection status */
  setMqttStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;

  /** Update broker URL */
  setBrokerUrl: (url: string) => void;

  /** Check and mark offline nodes */
  checkOnlineStatus: () => void;

  /** Get the currently selected node info */
  getSelectedNode: () => NodeInfo | undefined;

  /** Get all online nodes */
  getOnlineNodes: () => NodeInfo[];
}

// ─── Helper: Determine alarm status from DataPacket ─────────────

function resolveAlarmStatus(packet: DataPacket, previousStatus: AlarmStatus): AlarmStatus {
  if (!packet.isAlarm) return 'none';
  // If alarm is active, check if it was previously muted
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

  updateNodeData: (packet: DataPacket) => {
    set((state) => {
      const existing = state.nodes[packet.nodeId] || createDefaultNodeInfo(packet.nodeId);
      const alarmStatus = resolveAlarmStatus(packet, existing.alarmStatus);

      // Auto-switch to incoming node if current selected node has never received live data or is offline
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
            data: packet,
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
}));

export default useNodeStore;
