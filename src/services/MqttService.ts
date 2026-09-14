/**
 * ================================================================
 * MQTT Service — Cầu nối giao tiếp App ↔ ESP32
 * ================================================================
 *
 * App đóng vai trò MASTER (thay thế Trạm trung tâm ESP32).
 *
 * Luồng dữ liệu:
 *   ESP32 → publish JSON → "factory/node{id}/data"  → App subscribe → parse → Zustand Store → UI
 *   ESP32 → publish JSON → "factory/node{id}/time"   → App subscribe → parse → TimeSyncService
 *   App   → publish JSON → "factory/node{id}/command" → ESP32 subscribe → parse → update biến + EEPROM
 *   App   → publish JSON → "factory/broadcast/timesync" → Tất cả ESP32 subscribe → cập nhật giờ
 *
 * Topic structure:
 *   factory/+/data          ← ESP32 publish DataPacket (wildcard subscribe)
 *   factory/+/time          ← ESP32 publish TimePacket (wildcard subscribe)
 *   factory/node{id}/command → App publish lệnh điều khiển
 *   factory/broadcast/timesync → App broadcast giờ hệ thống cho slave nodes
 */

import type {
  DataPacket,
  TimePacket,
  Thresholds,
  TimerConfig,
} from '../types/HardwarePackets';

// ─── Types ──────────────────────────────────────────────────────

type MqttStatus = 'disconnected' | 'connecting' | 'connected';

interface MqttCallbacks {
  onData?: (packet: DataPacket) => void;
  onTime?: (packet: TimePacket) => void;
  onStatusChange?: (status: MqttStatus) => void;
  onError?: (error: Error) => void;
}

// ─── MQTT Service (Singleton) ───────────────────────────────────

class MqttService {
  private client: any = null;
  private callbacks: MqttCallbacks = {};
  private _status: MqttStatus = 'disconnected';
  private _brokerUrl: string = '';

  get status(): MqttStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  // ─── Setup ──────────────────────────────────────────────────

  /**
   * Đăng ký callbacks để nhận dữ liệu.
   * Gọi trong App.tsx hoặc SystemScreen khi khởi tạo.
   */
  setCallbacks(cb: MqttCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cb };
  }

  /**
   * Kết nối tới MQTT Broker qua WebSocket.
   *
   * @param brokerUrl — VD: "wss://broker.hivemq.com:8884/mqtt"
   */
  async connect(brokerUrl: string): Promise<void> {
    if (this._status === 'connected') {
      this.disconnect();
    }

    this._brokerUrl = brokerUrl;
    this._setStatus('connecting');

    try {
      // mqtt/dist/mqtt.min hoạt động trong React Native qua WebSocket transport (không phụ thuộc Node built-in modules)
      const mqtt = require('mqtt/dist/mqtt.min');

      const clientId = `FactoryMonitor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      this.client = mqtt.connect(brokerUrl, {
        clientId,
        keepalive: 60,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        clean: true,
        // Nếu broker cần auth, thêm username/password ở đây
        // username: 'your_user',
        // password: 'your_pass',
      });

      // ── Event: Connected ──────────────────────────────────
      this.client.on('connect', () => {
        console.log('[MQTT] ✅ Đã kết nối:', brokerUrl);
        this._setStatus('connected');

        // Subscribe wildcard: nhận data từ TẤT CẢ node
        this.client.subscribe('factory/+/data', { qos: 1 }, (err: any) => {
          if (err) console.error('[MQTT] Subscribe data lỗi:', err);
          else console.log('[MQTT] 📡 Đang lắng nghe: factory/+/data');
        });

        // Subscribe wildcard: nhận time từ tất cả node
        this.client.subscribe('factory/+/time', { qos: 1 }, (err: any) => {
          if (err) console.error('[MQTT] Subscribe time lỗi:', err);
          else console.log('[MQTT] 📡 Đang lắng nghe: factory/+/time');
        });
      });

      // ── Event: Message Received ───────────────────────────
      this.client.on('message', (topic: string, message: Buffer) => {
        this._handleIncomingMessage(topic, message);
      });

      // ── Event: Disconnected ───────────────────────────────
      this.client.on('close', () => {
        console.log('[MQTT] ❌ Ngắt kết nối');
        this._setStatus('disconnected');
      });

      // ── Event: Error ──────────────────────────────────────
      this.client.on('error', (err: Error) => {
        console.error('[MQTT] Lỗi:', err.message);
        this.callbacks.onError?.(err);
      });

      this.client.on('offline', () => {
        this._setStatus('disconnected');
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] 🔄 Đang kết nối lại...');
        this._setStatus('connecting');
      });

    } catch (error) {
      console.error('[MQTT] Không thể khởi tạo:', error);
      this._setStatus('disconnected');
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Ngắt kết nối.
   */
  disconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this._setStatus('disconnected');
    console.log('[MQTT] Đã ngắt kết nối');
  }

  // ─── Publish Methods (App → ESP32) ─────────────────────────

  /**
   * Publish generic JSON payload tới bất kỳ topic nào.
   * Các hàm tiện ích bên dưới wrap lại method này.
   */
  publish(topic: string, payload: object): void {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] Không thể publish — chưa kết nối');
      return;
    }
    const json = JSON.stringify(payload);
    this.client.publish(topic, json, { qos: 1 });
    console.log(`[MQTT] → ${topic}:`, json);
  }

  /**
   * Gửi lệnh toggle relay tới 1 node.
   * ESP32 nhận được sẽ đảo biến relayState.
   */
  toggleRelay(nodeId: number): void {
    this.publish(`factory/node${nodeId}/command`, {
      cmd: 'toggle_relay',
    });
  }

  /**
   * Gửi lệnh Mute (tắt còi tạm thời — Snooze).
   * Tương ứng firmware BTN_MUTE nhấn ngắn (dòng 416-419).
   */
  muteAlarm(nodeId: number): void {
    this.publish(`factory/node${nodeId}/command`, {
      cmd: 'mute',
      mute: 1,
    });
  }

  /**
   * Gửi lệnh Hard Mute (tắt còi vĩnh viễn cho đến khi an toàn).
   * Tương ứng firmware BTN_MUTE nhấn giữ 3s (dòng 413-415).
   */
  hardMuteAlarm(nodeId: number): void {
    this.publish(`factory/node${nodeId}/command`, {
      cmd: 'hard_mute',
      mute: 1,
    });
  }

  /**
   * Gửi cấu hình ngưỡng cảnh báo xuống ESP32.
   * ESP32 nhận → cập nhật biến thresTempMax/Min, thresHum, thresGas → EEPROM.commit()
   */
  publishThresholds(nodeId: number, thresholds: Thresholds): void {
    this.publish(`factory/node${nodeId}/command`, {
      cmd: 'set_thresholds',
      tempMax: thresholds.tempMax,
      tempMin: thresholds.tempMin,
      humMax: thresholds.humMax,
      gasMax: thresholds.gasMax,
    });
  }

  /**
   * Gửi cấu hình hẹn giờ xuống ESP32.
   * ESP32 nhận → cập nhật timerOnHr/Min, timerOffHr/Min → EEPROM
   */
  publishTimerConfig(nodeId: number, config: TimerConfig): void {
    this.publish(`factory/node${nodeId}/command`, {
      cmd: 'set_timer',
      onHour: config.onHour,
      onMinute: config.onMinute,
      offHour: config.offHour,
      offMinute: config.offMinute,
    });
  }

  /**
   * Gửi gói đồng bộ thời gian (broadcast cho tất cả node).
   * Được gọi bởi TimeSyncService mỗi 60 giây.
   */
  publishTimeSync(packet: { hour: number; minute: number; second: number; mute: number }): void {
    this.publish('factory/broadcast/timesync', packet);
  }

  // ─── Private: Parse incoming messages ─────────────────────

  /**
   * Xử lý tin nhắn MQTT đến.
   *
   * ESP32 publish JSON với các field ngắn gọn giống firmware:
   *   Data: { "id":1, "t":28.5, "h":65.0, "g":450, "r":false, "alarm":false }
   *   Time: { "id":1, "hr":14, "mn":30, "sc":45, "hasRtc":true }
   *
   * Method này chuyển đổi sang chuẩn DataPacket/TimePacket
   * rồi đẩy vào callbacks → Zustand Store → UI cập nhật.
   */
  private _handleIncomingMessage(topic: string, message: Buffer): void {
    try {
      const raw = JSON.parse(message.toString());

      // ── factory/node{id}/data ─────────────────────────────
      if (topic.match(/^factory\/node\d+\/data$/)) {
        const packet: DataPacket = {
          nodeId:      raw.id       ?? raw.nodeId      ?? 0,
          temperature: raw.t        ?? raw.temperature ?? 0,
          humidity:    raw.h        ?? raw.humidity    ?? 0,
          gasLevel:    raw.g        ?? raw.gasLevel    ?? 0,
          relayState:  raw.r        ?? raw.relayState  ?? false,
          isAlarm:     raw.alarm    ?? raw.isAlarm     ?? false,
        };

        console.log(`[MQTT] 📦 Data Node#${packet.nodeId}: T=${packet.temperature}°C H=${packet.humidity}% G=${packet.gasLevel} R=${packet.relayState} A=${packet.isAlarm}`);
        this.callbacks.onData?.(packet);
      }

      // ── factory/node{id}/time ─────────────────────────────
      else if (topic.match(/^factory\/node\d+\/time$/)) {
        const packet: TimePacket = {
          nodeId: raw.id      ?? raw.nodeId ?? 0,
          hour:   raw.hr      ?? raw.hour   ?? 0,
          minute: raw.mn      ?? raw.minute ?? 0,
          second: raw.sc      ?? raw.second ?? 0,
          hasRtc: raw.hasRtc  ?? false,
        };

        console.log(`[MQTT] 🕐 Time Node#${packet.nodeId}: ${packet.hour}:${packet.minute}:${packet.second} RTC=${packet.hasRtc}`);
        this.callbacks.onTime?.(packet);
      }

    } catch (error) {
      console.warn('[MQTT] Parse lỗi:', (error as Error).message, '| Raw:', message.toString());
    }
  }

  private _setStatus(status: MqttStatus): void {
    this._status = status;
    this.callbacks.onStatusChange?.(status);
  }
}

// ─── Singleton Export ───────────────────────────────────────────

export const mqttService = new MqttService();
export default mqttService;
