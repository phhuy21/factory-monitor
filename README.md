# FactoryMonitor — tiến độ ứng dụng di động

Repository lưu riêng mã nguồn theo từng tuần để dễ theo dõi quá trình phát triển ứng dụng Expo/React Native giám sát môi trường công nghiệp bằng ESP32 và MQTT.

## Tổng quan tiến độ

| Hạng mục | Tuần 1 | Tuần 2 |
| --- | --- | --- |
| Nền tảng | Expo 52, React Native 0.76 | Nâng lên Expo 57, React Native 0.86 |
| MQTT | Kết nối broker WebSocket, nhận dữ liệu và gửi lệnh | Tự kết nối, đồng bộ cấu hình hai chiều và xử lý callback đầy đủ hơn |
| Giám sát | Nhiệt độ, độ ẩm, gas, relay, cảnh báo và trạng thái online | Giữ toàn bộ chức năng tuần 1 và bổ sung lưu lịch sử |
| Điều khiển | Relay, mute/hard mute, ngưỡng và lịch bật/tắt | Đồng bộ cấu hình với ESP32 và sao lưu cấu hình lên Firestore |
| Giao diện | 4 tab: Giám sát, Hẹn giờ, Ngưỡng, Hệ thống | 5 tab, thêm màn hình Lịch sử |
| Tài khoản | Chưa có | Đăng nhập/đăng ký bằng Firebase Authentication |
| Dữ liệu đám mây | Chưa có | Firestore lưu dữ liệu cảm biến, cấu hình và sự kiện cảnh báo |
| Thông báo | Cảnh báo trong giao diện | Thêm NotificationService dùng Alert trong Expo Go |

## Tuần 1 — nền tảng giám sát MQTT

Mã nguồn: [`Tuan-1/`](Tuan-1/)

- Xây dựng giao diện tối cho ứng dụng giám sát nhà máy.
- Nhận dữ liệu nhiệt độ, độ ẩm, khí gas, relay và cảnh báo từ nhiều node ESP32.
- Hiển thị trạng thái MQTT, node online/offline và thời gian cập nhật.
- Điều khiển relay, mute cảnh báo và hard mute từ điện thoại.
- Cài ngưỡng nhiệt độ/độ ẩm/gas và lịch bật/tắt relay.
- Đồng bộ thời gian từ điện thoại xuống node không có RTC.
- Chuẩn hóa kiểu gói tin, topic MQTT, Zustand store và các component dùng lại.

## Tuần 2 — tài khoản, Firebase và lịch sử

Mã nguồn: [`Tuan-2/`](Tuan-2/)

- Bổ sung đăng nhập, đăng ký, đăng xuất và duy trì phiên bằng Firebase Authentication.
- Lưu dữ liệu cảm biến định kỳ lên Cloud Firestore.
- Thêm màn hình Lịch sử để xem dữ liệu theo node và khoảng thời gian.
- Ghi lại sự kiện cảnh báo và sao lưu cấu hình ngưỡng/hẹn giờ lên cloud.
- Đồng bộ cấu hình từ ESP32 về ứng dụng qua MQTT và yêu cầu cấu hình khi kết nối.
- Tự kết nối MQTT sau khi đăng nhập; quản lý vòng đời MQTT và TimeSync tập trung tại `App.tsx`.
- Thêm dịch vụ thông báo cảnh báo tương thích Expo Go.

## Cấu trúc repository

```text
.
├── Tuan-1/                 # Bản nền tảng MQTT và giao diện giám sát
│   ├── docs/               # Kiến trúc và giao thức MQTT
│   ├── src/
│   └── README.md
├── Tuan-2/                 # Bản mở rộng Firebase, lịch sử và tài khoản
│   ├── src/
│   ├── .env.example        # Mẫu cấu hình Firebase, không chứa khóa thật
│   └── README.md
├── Bao-cao/
│   ├── Chuong_1_2_FactoryMonitor_WiFi_Firebase.docx
│   └── README.md
└── README.md
```

## Chạy dự án

Tuần 1:

```bash
cd Tuan-1
npm install
npm start
```

Tuần 2:

```bash
cd Tuan-2
copy .env.example .env
npm install
npm start
```

Điền cấu hình Firebase của riêng bạn vào `Tuan-2/.env` trước khi chạy tuần 2. Broker MQTT mặc định chỉ dành cho thử nghiệm; khi triển khai thật nên dùng broker riêng có TLS, xác thực và phân quyền topic.

## Báo cáo

Báo cáo Chương 1–2 được lưu tại [`Bao-cao/Chuong_1_2_FactoryMonitor_WiFi_Firebase.docx`](Bao-cao/Chuong_1_2_FactoryMonitor_WiFi_Firebase.docx).
