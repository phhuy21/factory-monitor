/**
 * ================================================================
 * Firebase Cloud Function: T? ð?ng g?i thông báo khi app t?t
 * ================================================================
 *
 * Hý?ng d?n tri?n khai (Deploy):
 *   1. Ch?y l?nh: `npm install -g firebase-tools`
 *   2. Trong thý m?c d? án ch?y: `firebase init functions`
 *   3. Dán toàn b? n?i dung file này vào file `functions/index.js`
 *   4. Ch?y l?nh deploy: `firebase deploy --only functions`
 *
 * Cõ ch?:
 *   - L?ng nghe khi có b?n ghi m?i trong collection "alarmHistory"
 *   - T?m ki?m các user s? h?u Tr? (Node) này
 *   - L?y FCM Push Tokens c?a ði?n tho?i
 *   - B?n thông báo ð?y c?p h? th?ng (Rung + Chuông) ngay c? khi ð? t?t app!
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.sendAlarmPushNotification = functions.firestore
  .document('alarmHistory/{alarmId}')
  .onCreate(async (snap, context) => {
    const alarmData = snap.data();
    if (!alarmData) return null;

    const { nodeId, type, value, threshold } = alarmData;

    let alertTitle = '?? BÁO Ð?NG NHÀ XÝ?NG';
    let alertBody = `Tr? #${nodeId}: `;

    switch (type) {
      case 'temperature_high':
        alertBody += `Nhi?t ð? CAO (${value}°C) vý?t ngý?ng (${threshold}°C)!`;
        break;
      case 'temperature_low':
        alertBody += `Nhi?t ð? TH?P (${value}°C) dý?i ngý?ng (${threshold}°C)!`;
        break;
      case 'humidity_high':
        alertBody += `Ð? ?m CAO (${value}%) vý?t ngý?ng (${threshold}%)!`;
        break;
      case 'gas_high':
        alertBody += `PHÁT HI?N R? R? KHÍ GAS (${value}) vý?t ngý?ng an toàn!`;
        break;
      default:
        alertBody += `Phát hi?n s? c? vý?t ngý?ng kh?n c?p!`;
    }

    try {
      // 1. T?m t?t c? user có s? h?u Tr? này ho?c t?t c? Admin
      const usersSnap = await admin.firestore().collection('users').get();
      const tokens = [];

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;

        // Ki?m tra xem user có qu?n l? tr? này không
        const devDoc = await admin
          .firestore()
          .collection('users')
          .doc(userId)
          .collection('devices')
          .doc(`node_${nodeId}`)
          .get();

        // N?u user có ðãng k? tr? này (ho?c chýa ðãng k? nhýng là user duy nh?t trong h? th?ng)
        if (devDoc.exists || usersSnap.size === 1) {
          const tokensSnap = await admin
            .firestore()
            .collection('users')
            .doc(userId)
            .collection('pushTokens')
            .get();

          tokensSnap.forEach((tDoc) => {
            const token = tDoc.data().token;
            if (token && !tokens.includes(token)) {
              tokens.push(token);
            }
          });
        }
      }

      if (tokens.length === 0) {
        console.log(`[Push] Không t?m th?y thi?t b? di ð?ng nào ð? g?i thông báo cho Node #${nodeId}`);
        return null;
      }

      // 2. Chu?n b? payload Push Notification chu?n FCM
      const message = {
        notification: {
          title: alertTitle,
          body: alertBody,
        },
        data: {
          nodeId: String(nodeId),
          alarmType: String(type),
          value: String(value),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'factory_emergency_alarms',
            sound: 'default',
            priority: 'max',
            defaultVibrateTimings: true,
            defaultSound: true,
            color: '#EF4444',
          },
        },
        tokens: tokens,
      };

      // 3. G?i thông báo ð?n toàn b? máy c?a ngý?i qu?n l?
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `[Push] ? Ð? g?i thành công ${response.successCount}/${tokens.length} thông báo c?nh báo!`
      );

      return response;
    } catch (error) {
      console.error('[Push] ? L?i g?i thông báo n?n:', error);
      return null;
    }
  });
