# FactoryMonitor — tiến độ ứng dụng di động

Repository lưu riêng mã nguồn theo từng tuần để dễ theo dõi quá trình phát triển ứng dụng Expo/React Native giám sát môi trường công nghiệp bằng ESP32 và MQTT.

## Tổng quan tiến độ

| Hạng mục | Tuần 1 | Tuần 2 | Tuần 3 |
| --- | --- | --- | --- |
| Nền tảng | Expo 52, React Native 0.76 | Nâng lên Expo 57, React Native 0.86 | Thêm EAS build, camera và notification native |
| MQTT | Kết nối broker WebSocket, nhận dữ liệu và gửi lệnh | Tự kết nối, đồng bộ cấu hình hai chiều | Đồng bộ push token và có bộ giả lập nhiều node |
| Giám sát | Cảm biến, relay, cảnh báo và trạng thái online | Bổ sung lưu và xem lịch sử | Cải thiện cảnh báo, biểu đồ và quản lý trụ |
| Điều khiển | Relay, mute/hard mute, ngưỡng và lịch bật/tắt | Sao lưu cấu hình lên Firestore | Ghép, đổi tên và xóa trụ theo tài khoản |
| Giao diện | 4 tab chức năng | 5 tab, thêm Lịch sử | Quét QR và nhập mã thiết bị linh hoạt |
| Tài khoản | Chưa có | Firebase Authentication | Danh sách thiết bị riêng cho từng tài khoản |
| Dữ liệu đám mây | Chưa có | Firestore lưu dữ liệu, cấu hình và cảnh báo | Lưu thiết bị và push token phục vụ cảnh báo nền |
| Thông báo | Cảnh báo trong giao diện | Alert trong Expo Go | Push notification, FCM và Cloud Function mẫu |

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

## Tuần 3 — ghép thiết bị và cảnh báo nền

Mã nguồn: [`Tuan-3/`](Tuan-3/)

- Ghép trụ bằng mã QR hoặc nhập mã thiết bị thủ công.
- Lưu, đổi tên và xóa thiết bị riêng theo từng tài khoản Firebase.
- Tích hợp push notification native, kênh cảnh báo Android mức ưu tiên cao và lưu push token.
- Bổ sung Cloud Function mẫu để gửi cảnh báo khi ứng dụng đã tắt.
- Thêm EAS build và các quyền camera/notification cần thiết.
- Bổ sung bộ giả lập nhiều node MQTT để kiểm thử relay và tình huống nguy hiểm.

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
├── Tuan-3/                 # QR pairing, quản lý trụ và push notification
│   ├── src/
│   ├── cloud-function-alert.js
│   ├── simulate_nodes.js
│   └── README.md
├── Bao-cao/
│   ├── Chuong_1_2_FactoryMonitor_WiFi_Firebase.docx
│   ├── Chuong_1_2_3_FactoryMonitor_WiFi_MQTT_Firebase_CapNhat.docx
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

Tuần 3:

```bash
cd Tuan-3
copy .env.example .env
npm install
npm start
```

Điền cấu hình Firebase của riêng bạn vào `.env` trước khi chạy tuần 2 hoặc tuần 3. Tuần 3 cần thêm `google-services.json` khi build Android có FCM. Broker MQTT mặc định chỉ dành cho thử nghiệm; khi triển khai thật nên dùng broker riêng có TLS, xác thực và phân quyền topic.

## Báo cáo

- [Báo cáo Chương 1–2](Bao-cao/Chuong_1_2_FactoryMonitor_WiFi_Firebase.docx)
- [Báo cáo cập nhật Chương 1–2–3](Bao-cao/Chuong_1_2_3_FactoryMonitor_WiFi_MQTT_Firebase_CapNhat.docx)
