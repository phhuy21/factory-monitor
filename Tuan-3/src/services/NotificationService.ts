/**
 * ================================================================
 * Notification Service — Local & Push Notifications
 * ================================================================
 *
 * Hỗ trợ:
 *   1. Tạo Android Notification Channel mức ưu tiên cao nhất (MAX)
 *   2. Đăng ký nhận FCM / Device Push Token
 *   3. Phát thông báo khẩn cấp hệ thống khi vượt ngưỡng
 */

import { Alert, Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';

// Cấu hình hiển thị notification khi app đang mở hoặc chạy ngầm
Notifications.setNotificationHandler({
  handleNotification: async () => {
    try {
      Vibration.vibrate([0, 600, 250, 600, 250, 600]);
    } catch {}
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

class NotificationService {
  private _initialized = false;
  private _pushToken: string | null = null;
  private _expoPushToken: string | null = null;
  static readonly CHANNEL_ID = 'factory_emergency_v2';

  get pushToken(): string | null {
    return this._expoPushToken || this._pushToken;
  }

  get expoPushToken(): string | null {
    return this._expoPushToken;
  }

  async initialize(): Promise<string | null> {
    if (this._initialized) return this.pushToken;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(NotificationService.CHANNEL_ID, {
          name: 'Còi Hú & Báo Động Khẩn Cấp',
          description: 'Kênh cảnh báo sự cố rò rỉ khí gas, nhiệt độ và độ ẩm vượt ngưỡng',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 600, 250, 600, 250, 600],
          lightColor: '#EF4444',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });
      }

      // Lắng nghe khi có thông báo đến để kích hoạt rung ngay lập tức
      Notifications.addNotificationReceivedListener(() => {
        try {
          Vibration.vibrate([0, 600, 250, 600, 250, 600]);
        } catch {}
      });

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          // Ưu tiên 1: Lấy Expo Push Token (dùng trực tiếp cho Expo Push Service https://exp.host/--/api/v2/push/send)
          try {
            const expoToken = await Notifications.getExpoPushTokenAsync({
              projectId: '6e502bae-1d87-4b58-b833-fc3e530fd571',
            });
            this._expoPushToken = expoToken.data;
            this._pushToken = expoToken.data;
            console.log('[NOTIFICATION] 📲 Expo Push Token:', this._expoPushToken);
          } catch (expoErr) {
            console.warn('[NOTIFICATION] Không lấy được Expo push token, thử Native FCM:', expoErr);
          }

          // Ưu tiên 2: Lấy Native Device Push Token (FCM)
          try {
            const tokenData = await Notifications.getDevicePushTokenAsync();
            if (!this._pushToken) {
              this._pushToken = tokenData.data;
            }
            console.log('[NOTIFICATION] 📲 Device Push Token (FCM):', tokenData.data);
          } catch (devErr) {
            console.warn('[NOTIFICATION] Không lấy được Device push token:', devErr);
          }
        } else {
          console.log('[NOTIFICATION] ⚠️ Quyền thông báo chưa được cấp');
        }
      } else {
        console.log('[NOTIFICATION] ℹ️ Đang chạy trên thiết bị giả lập');
      }

      this._initialized = true;
    } catch (err) {
      console.warn('[NOTIFICATION] Khởi tạo notification lỗi:', err);
      this._initialized = true;
    }

    return this.pushToken;
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

    let body = `⚠️ Trụ #${nodeId}: `;

    switch (details.alarmType) {
      case 'temperature_high':
        body += `Nhiệt độ CAO VƯỢT NGƯỠNG: ${details.temperature?.toFixed(1)}°C`;
        break;
      case 'temperature_low':
        body += `Nhiệt độ THẤP DƯỚI NGƯỠNG: ${details.temperature?.toFixed(1)}°C`;
        break;
      case 'humidity_high':
        body += `Độ ẩm CAO NGUY HIỂM: ${details.humidity?.toFixed(0)}%`;
        break;
      case 'gas_high':
        body += `Khí GAS RÒ RỈ NGUY HIỂM: ${details.gasLevel}`;
        break;
      default:
        body += 'Phát hiện sự cố vượt ngưỡng bất thường!';
    }

    try {
      // Rung điện thoại mạnh và haptic ngay khi cảnh báo
      Vibration.vibrate([0, 600, 250, 600, 250, 600], false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 BÁO ĐỘNG NHÀ XƯỞNG',
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 600, 250, 600, 250, 600],
          data: { nodeId, ...details },
        },
        trigger: {
          channelId: NotificationService.CHANNEL_ID,
        } as any,
      });
    } catch {
      Alert.alert('🚨 CẢNH BÁO NHÀ MÁY', body, [{ text: 'OK' }]);
    }

    console.log(`[NOTIFICATION] 🔔 Sent alarm notification: ${body}`);
  }

  async sendConnectionNotification(connected: boolean): Promise<void> {
    const title = connected ? '✅ Đã kết nối' : '❌ Mất kết nối';
    const body = connected
      ? 'MQTT broker đã kết nối thành công'
      : 'Mất kết nối với MQTT broker. Đang thử kết nối lại...';

    console.log(`[NOTIFICATION] ${title}: ${body}`);
  }

  /**
   * Bắn thông báo thử nghiệm sau 3 giây để người dùng khóa màn hình/thoát app kiểm tra còi hú
   */
  async sendTestAlarm(): Promise<void> {
    if (!this._initialized) await this.initialize();

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 BÁO ĐỘNG THỬ NGHIỆM',
          body: 'Còi hú báo động hoạt động tốt ngay cả khi bạn khóa màn hình hoặc tắt app!',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 600, 250, 600, 250, 600],
          data: { test: true },
        },
        trigger: {
          seconds: 3,
          channelId: NotificationService.CHANNEL_ID,
        } as any,
      });
      console.log('[NOTIFICATION] ⏱️ Đã hẹn giờ phát báo động thử nghiệm sau 3s');
    } catch (err) {
      console.error('[NOTIFICATION] Lỗi hẹn giờ báo động test:', err);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
