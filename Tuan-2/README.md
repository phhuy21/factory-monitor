# Tuần 2 — Firebase và lịch sử dữ liệu

Phiên bản tuần 2 kế thừa chức năng MQTT của tuần 1 và bổ sung tài khoản, lưu trữ cloud, lịch sử cảm biến và luồng đồng bộ cấu hình.

## Phần bổ sung

- Firebase Authentication: đăng nhập, đăng ký, đăng xuất và lưu phiên.
- Cloud Firestore: lưu dữ liệu cảm biến, cấu hình và sự kiện cảnh báo.
- Màn hình Lịch sử cho từng node.
- NotificationService phát cảnh báo bằng Alert trong Expo Go.
- MQTT tự kết nối sau khi đăng nhập và nhận cấu hình phản hồi từ ESP32.
- Sao lưu ngưỡng và lịch relay lên Firestore.

## Cấu hình Firebase

Sao chép file mẫu rồi điền thông tin dự án Firebase của bạn:

```bash
copy .env.example .env
```

Các biến cần thiết:

```text
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

Không commit `.env` hoặc `google-services.json` chứa cấu hình dự án thật lên repository public.

## Chạy ứng dụng

```bash
npm install
npm start
```
