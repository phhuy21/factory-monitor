/**
 * ================================================================
 * Notification Service — Local Notifications khi Alarm
 * ================================================================
 *
 * Chú ý: Expo Go SDK 53+ đã loại bỏ hoàn toàn tính năng Push Notifications
 * nên việc import expo-notifications sẽ gây lỗi "runtime not ready".
 *
 * Để App chạy được trên Expo Go, chúng ta sẽ tạm dùng Alert của React Native.
 * Khi nào build ra file APK/AAB bằng EAS Build, có thể cài lại expo-notifications.
 */

import { Alert } from 'react-native';

class NotificationService {
  private _initialized = false;

  async initialize(): Promise<void> {
    this._initialized = true;
    console.log('[NOTIFICATION] ✅ Đã khởi tạo notification service (Dùng Alert)');
  }

  async sendAlarmNotification(
    nodeId: number,
    details: {
      temperature?: number;
      humidity?: number;
      gasLevel?: number;
      alarmType: string;
    }
  ): Promise<void> {
    if (!this._initialized) await this.initialize();

    let body = `⚠️ Node #${nodeId}: `;

    switch (details.alarmType) {
      case 'temperature_high':
        body += `Nhiệt độ CAO: ${details.temperature?.toFixed(1)}°C`;
        break;
      case 'temperature_low':
        body += `Nhiệt độ THẤP: ${details.temperature?.toFixed(1)}°C`;
        break;
      case 'humidity_high':
        body += `Độ ẩm CAO: ${details.humidity?.toFixed(0)}%`;
        break;
      case 'gas_high':
        body += `Khí GAS nguy hiểm: ${details.gasLevel}`;
        break;
      default:
        body += 'Phát hiện bất thường!';
    }

    Alert.alert('🚨 CẢNH BÁO NHÀ MÁY', body, [{ text: 'OK' }]);
    console.log(`[NOTIFICATION] 🔔 Sent alarm notification: ${body}`);
  }

  async sendConnectionNotification(connected: boolean): Promise<void> {
    if (!this._initialized) return;

    const title = connected ? '✅ Đã kết nối' : '❌ Mất kết nối';
    const body = connected
      ? 'MQTT broker đã kết nối thành công'
      : 'Mất kết nối với MQTT broker. Đang thử kết nối lại...';

    console.log(`[NOTIFICATION] ${title}: ${body}`);
    // Tạm thời không hiển thị popup ngắt kết nối liên tục để tránh phiền người dùng
  }
}

export const notificationService = new NotificationService();
export default notificationService;
