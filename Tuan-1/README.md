# Tuần 1 — nền tảng FactoryMonitor

Phiên bản đầu tập trung xây dựng luồng giám sát và điều khiển ESP32 qua MQTT.

## Hoàn thành

- Dashboard nhiệt độ, độ ẩm, khí gas, relay và cảnh báo.
- Quản lý nhiều node ID từ 1 đến 9.
- Kết nối MQTT qua WebSocket và theo dõi trạng thái kết nối.
- Điều khiển relay, mute/hard mute.
- Cấu hình ngưỡng và lịch relay.
- Đồng bộ thời gian xuống node.
- Zustand store và bộ component giao diện dùng lại.

## Chạy ứng dụng

```bash
npm install
npm start
```

Xem thêm [kiến trúc và topic MQTT](docs/ARCHITECTURE.md).
