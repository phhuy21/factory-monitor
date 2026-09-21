/**
 * ================================================================
 * Time Sync Service — Nuôi đồng hồ cho ESP32 không có RTC
 * ================================================================
 *
 * Bởi vì Trạm trung tâm ESP32 (Center Hub) đã bị loại bỏ,
 * App di động bây giờ đóng vai trò MASTER — chịu trách nhiệm
 * phát quảng bá gói tin thời gian cho tất cả node.
 *
 * Tương ứng firmware:
 *   - Dòng 118-121: rtcType == 0 → "Node is TIME SLAVE"
 *   - Dòng 148-151: Slave nhận TimeSyncPacket → cập nhật curHr/curMin/curSec
 *   - Dòng 284-291: Slave tự đếm giờ ảo giữa các lần sync
 *
 * Luồng:
 *   1. App lấy giờ chuẩn từ đồng hồ điện thoại
 *   2. Đóng gói thành { hour, minute, second, mute }
 *   3. Publish tới "factory/broadcast/timesync" mỗi 60 giây
 *   4. TẤT CẢ ESP32 subscribe topic này → nhận giờ → cập nhật bộ đếm ảo
 */

import { mqttService } from './MqttService';

// ─── Time Sync Service (Singleton Object) ───────────────────────

export const timeSyncService = {
  /** ID của interval timer */
  intervalId: null as ReturnType<typeof setInterval> | null,

  /** Trạng thái mute hiện tại (đính kèm trong gói sync) */
  currentMuteState: 0,

  /** Đang chạy? */
  isRunning: false,

  /**
   * Bắt đầu phát quảng bá thời gian.
   * Gọi ngay khi MQTT kết nối thành công.
   *
   * - Sync ngay lập tức 1 lần
   * - Sau đó cứ mỗi 60 giây sync 1 lần
   */
  start(): void {
    if (this.isRunning) {
      console.log('[TimeSync] Đã đang chạy rồi');
      return;
    }

    console.log('[TimeSync] ▶ Bắt đầu — broadcast mỗi 60s');
    this.isRunning = true;

    // Sync ngay lần đầu
    this._broadcast();

    // Lặp lại mỗi 60 giây
    this.intervalId = setInterval(() => {
      this._broadcast();
    }, 60000);
  },

  /**
   * Dừng phát quảng bá.
   * Gọi khi MQTT ngắt kết nối hoặc app thoát.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[TimeSync] ⏹ Đã dừng');
  },

  /**
   * Cập nhật trạng thái mute để đính kèm vào gói sync.
   * Firmware dòng 154-159: TimeSyncPacket mang theo cờ mute.
   */
  setMuteState(mute: number): void {
    this.currentMuteState = mute;
  },

  /**
   * Broadcast 1 gói thời gian xuống tất cả ESP32.
   * Lấy giờ chuẩn từ đồng hồ hệ thống điện thoại.
   */
  _broadcast(): void {
    if (!mqttService.isConnected) {
      console.log('[TimeSync] ⏸ Bỏ qua — MQTT chưa kết nối');
      return;
    }

    const now = new Date();
    const timePacket = {
      hr: now.getHours(),
      mn: now.getMinutes(),
      sc: now.getSeconds(),
      mute: this.currentMuteState,
    };

    // Publish broadcast để tất cả ESP32 subscribe topic này sẽ nhận được
    mqttService.publish('huyfactory2112/broadcast/timesync', timePacket);

    console.log(
      `[TimeSync] 📤 Broadcast: ${String(timePacket.hr).padStart(2, '0')}:${String(timePacket.mn).padStart(2, '0')}:${String(timePacket.sc).padStart(2, '0')} | mute=${timePacket.mute}`
    );
  },
};

export default timeSyncService;
