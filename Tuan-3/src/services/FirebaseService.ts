/**
 * ================================================================
 * Firebase Service — Firestore CRUD Operations
 * ================================================================
 *
 * Quản lý đọc/ghi dữ liệu trên Cloud Firestore:
 *   - Lưu lịch sử sensor data (throttled 30s)
 *   - Lưu/đọc cấu hình ngưỡng + timer
 *   - Lưu lịch sử alarm
 *   - Query lịch sử sensor theo thời gian
 *
 * Firestore Structure:
 *   nodes/{nodeId}/config       — Cấu hình ngưỡng + timer
 *   nodes/{nodeId}/readings     — Subcollection lịch sử sensor
 *   alarmHistory/{auto-id}      — Lịch sử cảnh báo
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DataPacket, Thresholds, TimerConfig } from '../types/HardwarePackets';

// ─── Types ──────────────────────────────────────────────────────

export interface SensorReading {
  temperature: number;
  humidity: number;
  gasLevel: number;
  relayState: boolean;
  isAlarm: boolean;
  timestamp: any; // Firestore Timestamp
  source: 'mqtt' | 'esp32_direct';
}

export interface AlarmRecord {
  nodeId: number;
  type: 'temperature_high' | 'temperature_low' | 'humidity_high' | 'gas_high';
  value: number;
  threshold: number;
  timestamp: any;
}

export interface NodeConfig {
  thresholds: Thresholds;
  timerConfig: TimerConfig;
  updatedAt: any;
}

export interface UserDevice {
  id: number;
  name: string;
  addedAt?: any;
}

// ─── Firebase Service (Singleton) ───────────────────────────────

class FirebaseService {
  /** Throttle: thời điểm ghi sensor cuối cùng cho mỗi node */
  private lastSaveTime: Record<number, number> = {};

  /** Khoảng cách tối thiểu giữa 2 lần ghi sensor (ms) */
  private readonly SAVE_INTERVAL = 30000; // 30 giây

  // ─── Sensor Data ────────────────────────────────────────────

  /**
   * Lưu sensor data vào Firestore (throttled).
   * Chỉ ghi tối đa 1 lần / 30 giây / node để tiết kiệm quota.
   */
  async saveSensorData(nodeId: number, packet: DataPacket): Promise<void> {
    const now = Date.now();
    const lastSave = this.lastSaveTime[nodeId] || 0;

    // Throttle: bỏ qua nếu chưa đủ 30s
    if (now - lastSave < this.SAVE_INTERVAL) return;

    this.lastSaveTime[nodeId] = now;

    try {
      const readingsRef = collection(db, 'nodes', String(nodeId), 'readings');
      await addDoc(readingsRef, {
        temperature: packet.temperature,
        humidity: packet.humidity,
        gasLevel: packet.gasLevel,
        relayState: packet.relayState,
        isAlarm: packet.isAlarm,
        timestamp: serverTimestamp(),
        source: 'mqtt',
      });

      console.log(`[FIRESTORE] 💾 Saved sensor data Node#${nodeId}`);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi ghi sensor:', (error as Error).message);
    }
  }

  /**
   * Query lịch sử sensor theo khoảng thời gian.
   * @param hoursAgo — Số giờ trước (1, 6, 24, 168 cho 7 ngày)
   * @param maxResults — Số bản ghi tối đa
   */
  async getHistory(
    nodeId: number,
    hoursAgo: number = 24,
    maxResults: number = 200
  ): Promise<SensorReading[]> {
    try {
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      const sinceTimestamp = Timestamp.fromDate(since);

      const readingsRef = collection(db, 'nodes', String(nodeId), 'readings');
      const q = query(
        readingsRef,
        where('timestamp', '>=', sinceTimestamp),
        orderBy('timestamp', 'asc'),
        limit(maxResults)
      );

      const snapshot = await getDocs(q);
      const readings: SensorReading[] = [];

      snapshot.forEach((doc) => {
        readings.push(doc.data() as SensorReading);
      });

      console.log(`[FIRESTORE] 📊 Loaded ${readings.length} readings for Node#${nodeId}`);
      return readings;
    } catch (error) {
      console.error('[FIRESTORE] Lỗi đọc lịch sử:', (error as Error).message);
      return [];
    }
  }

  // ─── Node Config ────────────────────────────────────────────

  /**
   * Lưu cấu hình ngưỡng + timer lên Firestore.
   */
  async saveConfig(
    nodeId: number,
    thresholds: Thresholds,
    timerConfig: TimerConfig
  ): Promise<void> {
    try {
      const configRef = doc(db, 'nodes', String(nodeId));
      await setDoc(
        configRef,
        {
          thresholds,
          timerConfig,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`[FIRESTORE] 💾 Saved config Node#${nodeId}`);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi ghi config:', (error as Error).message);
    }
  }

  /**
   * Đọc cấu hình từ Firestore (khi app mở).
   */
  async loadConfig(nodeId: number): Promise<NodeConfig | null> {
    try {
      const configRef = doc(db, 'nodes', String(nodeId));
      const snap = await getDoc(configRef);

      if (snap.exists()) {
        const data = snap.data() as NodeConfig;
        console.log(`[FIRESTORE] 📖 Loaded config Node#${nodeId}`);
        return data;
      }

      return null;
    } catch (error) {
      console.error('[FIRESTORE] Lỗi đọc config:', (error as Error).message);
      return null;
    }
  }

  // ─── Alarm History ──────────────────────────────────────────

  /**
   * Ghi lịch sử alarm vào Firestore.
   * Gọi khi phát hiện alarm mới (chuyển từ none → active).
   */
  async saveAlarmEvent(
    nodeId: number,
    type: AlarmRecord['type'],
    value: number,
    threshold: number
  ): Promise<void> {
    try {
      const alarmRef = collection(db, 'alarmHistory');
      await addDoc(alarmRef, {
        nodeId,
        type,
        value,
        threshold,
        timestamp: serverTimestamp(),
      });

      console.log(`[FIRESTORE] 🚨 Saved alarm event: ${type} Node#${nodeId}`);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi ghi alarm:', (error as Error).message);
    }
  }

  // ─── Push Token ────────────────────────────────────────────

  /**
   * Lưu device push token của user lên Firestore để Cloud Function và ESP32 gửi thông báo khi app tắt.
   */
  async savePushToken(userId: string, token: string, platform: string, expoToken?: string): Promise<void> {
    try {
      const safeTokenId = token.replace(/[\/\.#$\[\]]/g, '_');
      const tokenRef = doc(db, 'users', userId, 'pushTokens', safeTokenId);
      await setDoc(
        tokenRef,
        {
          token,
          expoToken: expoToken || token,
          platform,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Lưu token vào system/pushTokens để hệ thống Cloud/ESP32 dễ truy xuất
      const sysRef = doc(db, 'system', 'pushTokens');
      await setDoc(
        sysRef,
        {
          activeToken: expoToken || token,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`[FIRESTORE] 📲 Đã lưu Push Token: ${token}`);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi lưu Push Token:', (error as Error).message);
    }
  }

  /**
   * Đồng bộ Push Token trực tiếp vào document của Trụ (Node) trên Firestore
   */
  async saveNodePushToken(nodeId: number, token: string): Promise<void> {
    try {
      const nodeRef = doc(db, 'nodes', String(nodeId));
      await setDoc(
        nodeRef,
        {
          pushToken: token,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`[FIRESTORE] 📲 Đã đồng bộ Push Token cho Node #${nodeId}`);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi lưu Node Push Token:', (error as Error).message);
    }
  }

  // ─── User Devices (Ghép nối thiết bị thương mại) ────────────

  /**
   * Lưu hoặc cập nhật trụ giám sát của người dùng.
   */
  async saveUserDevice(userId: string, device: UserDevice): Promise<void> {
    try {
      const devRef = doc(db, 'users', userId, 'devices', `node_${device.id}`);
      await setDoc(
        devRef,
        {
          id: device.id,
          name: device.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`[FIRESTORE] 🏷️ Đã lưu thiết bị: Node #${device.id} (${device.name})`);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi lưu thiết bị:', (error as Error).message);
    }
  }

  /**
   * Lấy danh sách các trụ giám sát mà người dùng sở hữu.
   */
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    try {
      const devRef = collection(db, 'users', userId, 'devices');
      const snap = await getDocs(devRef);
      const devices: UserDevice[] = [];
      snap.forEach((d) => {
        devices.push(d.data() as UserDevice);
      });
      return devices.sort((a, b) => a.id - b.id);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi lấy danh sách thiết bị:', (error as Error).message);
      return [];
    }
  }

  /**
   * Xóa trụ giám sát khỏi tài khoản người dùng.
   */
  async deleteUserDevice(userId: string, deviceId: number): Promise<void> {
    try {
      const devRef = doc(db, 'users', userId, 'devices', `node_${deviceId}`);
      await deleteDoc(devRef);
      console.log(`[FIRESTORE] 🗑️ Đã xóa thiết bị Node #${deviceId}`);
    } catch (error) {
      console.error('[FIRESTORE] Lỗi xóa thiết bị:', (error as Error).message);
    }
  }
}

// ─── Singleton Export ───────────────────────────────────────────

export const firebaseService = new FirebaseService();
export default firebaseService;
