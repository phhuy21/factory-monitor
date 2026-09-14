/**
 * ================================================================
 * Hardware Packet Types — Ánh xạ từ C++ structs (edge3.ino)
 * ================================================================
 *
 * Firmware C++ structs:
 *   struct __attribute__((packed)) DataPacket  { byte id; float t; float h; int g; bool r; bool alarm; };
 *   struct __attribute__((packed)) TimePacket   { byte id; byte hr; byte mn; byte sc; bool hasRtc; };
 *   struct __attribute__((packed)) TimeSyncPacket { byte hr; byte mn; byte sc; byte mute; };
 *   struct __attribute__((packed)) MutePacket   { byte id; byte mute; };
 *   struct __attribute__((packed)) AckPacket    { bool mute; };
 */

// ─── Incoming Packets (ESP32 → App) ─────────────────────────────

/** Gói dữ liệu cảm biến từ Edge Node (tương ứng DataPacket C++) */
export interface DataPacket {
  nodeId: number;       // byte id       — ID của node (1-9)
  temperature: number;  // float t       — Nhiệt độ (°C)
  humidity: number;     // float h       — Độ ẩm (%)
  gasLevel: number;     // int g         — Mức khí gas (0-4095)
  relayState: boolean;  // bool r        — Trạng thái relay
  isAlarm: boolean;     // bool alarm    — Cờ báo động
}

/** Gói thời gian từ Edge Node (tương ứng TimePacket C++) */
export interface TimePacket {
  nodeId: number;       // byte id
  hour: number;         // byte hr       — Giờ (0-23)
  minute: number;       // byte mn       — Phút (0-59)
  second: number;       // byte sc       — Giây (0-59)
  hasRtc: boolean;      // bool hasRtc   — Node có RTC vật lý không
}

// ─── Outgoing Packets (App → ESP32) ─────────────────────────────

/** Gói đồng bộ thời gian từ App gửi xuống ESP32 (tương ứng TimeSyncPacket C++) */
export interface TimeSyncPacket {
  hour: number;         // byte hr
  minute: number;       // byte mn
  second: number;       // byte sc
  mute: number;         // byte mute — 0 = unmute, 1 = mute
}

/** Lệnh tắt/bật còi (tương ứng MutePacket C++) */
export interface MuteCommand {
  nodeId: number;       // byte id
  mute: number;         // byte mute — 0 = unmute, 1 = mute
}

// ─── Configuration Types (App-defined) ──────────────────────────

/** Ngưỡng cảnh báo (tương ứng các biến thresTempMax, thresTempMin, thresHum, thresGas) */
export interface Thresholds {
  tempMax: number;      // thresTempMax — default 35.0°C
  tempMin: number;      // thresTempMin — default 20.0°C
  humMax: number;       // thresHum    — default 80%
  gasMax: number;       // thresGas    — default 2000
}

/** Cấu hình hẹn giờ relay (tương ứng timerOnHr/Min, timerOffHr/Min) */
export interface TimerConfig {
  onHour: number;       // timerOnHr   — default 8
  onMinute: number;     // timerOnMin  — default 0
  offHour: number;      // timerOffHr  — default 17
  offMinute: number;    // timerOffMin — default 0
}

/** Lệnh điều khiển chung gửi xuống ESP32 */
export interface CommandPacket {
  cmd: 'toggle_relay' | 'mute' | 'hard_mute' | 'unmute' | 'set_thresholds' | 'set_timer' | 'time_sync';
  payload?: Record<string, unknown>;
}

// ─── App State Types ────────────────────────────────────────────

/** Trạng thái mute (ánh xạ từ firmware logic dòng 74, 302-313) */
export type AlarmStatus = 'none' | 'active' | 'muted_snooze' | 'hard_muted';

/** Thông tin tổng hợp của 1 node */
export interface NodeInfo {
  data: DataPacket;
  time: TimePacket;
  thresholds: Thresholds;
  timerConfig: TimerConfig;
  alarmStatus: AlarmStatus;
  lastUpdate: number;       // timestamp ms
  isOnline: boolean;
}

/** Firmware safety variance constants (dòng 20-23 firmware) */
export const SAFETY_VARIANCE = {
  TEMP: 0.5,    // VAR_TEMP
  HUM: 2.0,     // VAR_HUM
  GAS: 50,      // VAR_GAS
  MUTE_DURATION: 60000, // MUTE_DURATION (ms)
} as const;

/** Default thresholds (dòng 79-80 firmware) */
export const DEFAULT_THRESHOLDS: Thresholds = {
  tempMax: 35.0,
  tempMin: 20.0,
  humMax: 80.0,
  gasMax: 2000,
};

/** Default timer config (dòng 81 firmware) */
export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  onHour: 8,
  onMinute: 0,
  offHour: 17,
  offMinute: 0,
};
