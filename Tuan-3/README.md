# Tuần 3 — ghép thiết bị và push notification

Phiên bản tuần 3 kế thừa Firebase và lịch sử dữ liệu của tuần 2, sau đó mở rộng khả năng ghép nối trụ giám sát và cảnh báo khi ứng dụng chạy nền hoặc đã tắt.

## Phần bổ sung

- Quét QR bằng camera để ghép trụ giám sát; hỗ trợ nhập mã thủ công như `1`, `NODE-01` hoặc `TRU-01`.
- Đặt tên, đổi tên và xóa trụ trong tài khoản người dùng.
- Lưu danh sách thiết bị của từng tài khoản lên Firestore và tự khôi phục khi đăng nhập.
- Tích hợp `expo-notifications` và `expo-device` để xin quyền, tạo kênh cảnh báo Android mức `MAX` và lấy push token.
- Đồng bộ push token vào Firestore, document của node và ESP32 qua MQTT.
- Thêm Cloud Function mẫu để gửi FCM khi Firestore tạo sự kiện cảnh báo.
- Thêm cấu hình EAS cho development build, APK preview và Android App Bundle production.
- Thêm `simulate_nodes.js` để giả lập nhiều node MQTT và kiểm thử relay/cảnh báo.
- Cải thiện giao diện cảnh báo, chọn node, biểu đồ lịch sử và quản lý hệ thống.

## Cấu hình an toàn

Sao chép mẫu biến môi trường và điền cấu hình Firebase Web App:

```bash
copy .env.example .env
```

Để build Android có FCM, tải `google-services.json` từ Firebase Console hoặc sao chép file mẫu rồi điền đúng thông tin:

```bash
copy google-services.json.example google-services.json
```

Không commit `.env`, `google-services.json` thật hoặc `fcm-service-account.json`. Service account chứa private key quản trị và không cần thiết khi Cloud Function chạy trong Firebase.

## Chạy ứng dụng

```bash
npm install
npm start
```

Push notification nền cần thiết bị thật và development/preview build. Cấu hình build nằm trong `eas.json`.

## Giả lập node MQTT

```bash
node simulate_nodes.js
```

Bộ giả lập phát dữ liệu cho node 2 và 3; dùng phím `2` hoặc `3` để bật/tắt tình huống cảnh báo, `q` để thoát.

## Cloud Function

`cloud-function-alert.js` là mã mẫu lắng nghe collection `alarmHistory` và gửi thông báo đến các push token đã lưu. Hãy khởi tạo Firebase Functions trong một thư mục riêng, cài `firebase-functions` và `firebase-admin`, rồi đưa logic này vào `functions/index.js` trước khi deploy.
