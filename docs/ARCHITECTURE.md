# Kiến trúc FactoryMonitor

## Luồng dữ liệu

Mỗi ESP32 publish dữ liệu cảm biến và thời gian lên MQTT broker. Ứng dụng subscribe theo wildcard để nhận dữ liệu từ mọi node, chuyển gói tin vào Zustand store rồi cập nhật giao diện. Lệnh điều khiển đi theo chiều ngược lại và luôn mang node ID đích.

```text
ESP32 -> MQTT broker -> MqttService -> Zustand store -> React Native UI
ESP32 <- MQTT broker <- MqttService <- thao tác người dùng
```

## MQTT topics

| Topic | Chiều | Mục đích |
| --- | --- | --- |
| `factory/node{id}/data` | ESP32 → App | Nhiệt độ, độ ẩm, gas, relay và cảnh báo |
| `factory/node{id}/time` | ESP32 → App | Thời gian hiện tại và trạng thái RTC |
| `factory/node{id}/command` | App → ESP32 | Điều khiển relay/còi và gửi cấu hình |
| `factory/node{id}/config` | App → ESP32 | Ngưỡng cảnh báo hoặc lịch relay |
| `factory/node{id}/timesync` | App → ESP32 | Đồng bộ thời gian cho một node |

`{id}` là số từ 1 đến 9. Ứng dụng lắng nghe `factory/+/data` và `factory/+/time`.

## Dữ liệu cảm biến

Ví dụ payload JSON do ESP32 publish:

```json
{
  "nodeId": 1,
  "temperature": 29.5,
  "humidity": 68.2,
  "gasLevel": 340,
  "relayState": false,
  "isAlarm": false
}
```

## Lệnh điều khiển

Ứng dụng hỗ trợ các lệnh:

- `toggle_relay`
- `mute`
- `hard_mute`
- `unmute`
- `set_thresholds`
- `set_timer`
- `time_sync`

Kiểu dữ liệu đầy đủ và giá trị mặc định nằm trong `src/types/HardwarePackets.ts`.

## Các lớp chính

| Lớp | Vai trò |
| --- | --- |
| `MqttService` | Quản lý kết nối, subscribe, parse dữ liệu và publish lệnh |
| `TimeSyncService` | Gửi thời gian điện thoại xuống node |
| `useNodeStore` | Lưu trạng thái nhiều node và trạng thái kết nối |
| `TabNavigator` | Tổ chức bốn màn hình chức năng |

## Lưu ý khi triển khai

- Dùng broker MQTT riêng có TLS và xác thực.
- Phân quyền để mỗi thiết bị chỉ được truy cập topic cần thiết.
- Đổi namespace `factory/` nếu chạy nhiều hệ thống trên cùng broker.
- Không commit credential; đọc cấu hình nhạy cảm từ biến môi trường hoặc cơ chế quản lý secret.
