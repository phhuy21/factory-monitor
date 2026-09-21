/**
 * ================================================================
 * SIMULATOR — Giả lập các Trụ Giám Sát ESP32 (Node #2, #3, #4...)
 * ================================================================
 *
 * Cách chạy:
 *   node simulate_nodes.js
 *
 * Tính năng:
 *   - Giả lập nhiều trụ hoạt động đồng thời cùng lúc với mạch thật
 *   - Phát dữ liệu cảm biến biến thiên tự nhiên (Nhiệt độ, Độ ẩm, Gas)
 *   - Nhận lệnh bật/tắt Relay từ App điện thoại và phản hồi tức thì
 *   - Phím tắt test báo động:
 *       Nhấn '2' -> Kích hoạt cảnh báo cháy/nhiệt độ cao ở Trụ #2
 *       Nhấn '3' -> Kích hoạt cảnh báo rò rỉ gas ở Trụ #3
 *       Nhấn 'q' -> Thoát giả lập
 */

const mqtt = require('@taoqf/react-native-mqtt');
const readline = require('readline');

const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const TOPIC_PREFIX = 'huyfactory2112';

// Danh sách các node giả lập (bạn có thể thêm node 4, 5...)
const simulatedNodes = {
  2: {
    name: 'Trụ Giám Sát #2 (Xưởng Hàn)',
    temp: 29.5,
    hum: 65.0,
    gas: 320,
    relay: false,
    alarm: false,
    tempTrend: 0.1,
  },
  3: {
    name: 'Trụ Giám Sát #3 (Kho Hóa Chất)',
    temp: 26.0,
    hum: 58.0,
    gas: 410,
    relay: false,
    alarm: false,
    tempTrend: -0.1,
  },
};

console.log('================================================================');
console.log('🤖 BỘ GIẢ LẬP TRỤ GIÁM SÁT ESP32 MULTI-NODE CHO FACTORY MONITOR');
console.log('================================================================');
console.log(`📡 Đang kết nối tới MQTT Broker: ${BROKER_URL}...`);

const client = mqtt.connect(BROKER_URL, {
  clientId: `Simulator_${Date.now()}`,
  keepalive: 60,
  clean: true,
});

client.on('connect', () => {
  console.log('✅ Đã kết nối MQTT Broker thành công!\n');

  // Đăng ký nhận lệnh cho tất cả các node giả lập
  Object.keys(simulatedNodes).forEach((id) => {
    const cmdTopic = `${TOPIC_PREFIX}/node${id}/command`;
    client.subscribe(cmdTopic, { qos: 1 });
    console.log(`👂 Đang lắng nghe lệnh từ App cho Node #${id} tại: ${cmdTopic}`);
  });

  console.log('\n----------------------------------------------------------------');
  console.log('💡 HƯỚNG DẪN KIỂM TRA TRÊN APP:');
  console.log('1. Mở App trên điện thoại: Bạn sẽ thấy xuất hiện Trụ #2 và Trụ #3 (ONLINE)');
  console.log('2. Bật/Tắt công tắc Relay trên App -> Simulator sẽ phản hồi ngay lập tức');
  console.log('3. Bấm phím [2] trên bàn phím -> Kích hoạt BÁO ĐỘNG CHÁY ở Trụ #2');
  console.log('4. Bấm phím [3] trên bàn phím -> Kích hoạt BÁO ĐỘNG GAS ở Trụ #3');
  console.log('5. Bấm phím [q] để dừng');
  console.log('----------------------------------------------------------------\n');

  // Bắt đầu chu kỳ gửi telemetry mỗi 2 giây
  setInterval(publishTelemetry, 2000);
});

// Nhận lệnh điều khiển từ App điện thoại
client.on('message', (topic, message) => {
  try {
    const match = topic.match(/node(\d+)\/command$/);
    if (!match) return;

    const nodeId = parseInt(match[1], 10);
    const node = simulatedNodes[nodeId];
    if (!node) return;

    const data = JSON.parse(message.toString());
    console.log(`\n📩 [Trụ #${nodeId}] Nhận lệnh từ App:`, data);

    if (data.cmd === 'set_relay') {
      node.relay = Boolean(data.state);
      console.log(`⚡ [Trụ #${nodeId}] Relay đã chuyển sang -> ${node.relay ? '🟢 BẬT' : '⚪ TẮT'}`);
      // Phản hồi tức thì lại cho App
      sendSingleTelemetry(nodeId);
    } else if (data.cmd === 'toggle_relay') {
      node.relay = !node.relay;
      console.log(`⚡ [Trụ #${nodeId}] Relay đảo trạng thái -> ${node.relay ? '🟢 BẬT' : '⚪ TẮT'}`);
      sendSingleTelemetry(nodeId);
    } else if (data.cmd === 'mute') {
      console.log(`🔇 [Trụ #${nodeId}] Đã nhận lệnh Tắt tạm còi (Snooze 60s)`);
      node.alarm = false;
      sendSingleTelemetry(nodeId);
    } else if (data.cmd === 'hard_mute') {
      console.log(`🔕 [Trụ #${nodeId}] Đã nhận lệnh Tắt còi hoàn toàn (Hard Mute)`);
      node.alarm = false;
      sendSingleTelemetry(nodeId);
    } else if (data.cmd === 'set_push_token') {
      console.log(`📲 [Trụ #${nodeId}] Đã nhận và lưu Push Token từ App:`, data.token);
    }
  } catch (err) {
    console.error('Lỗi xử lý tin nhắn:', err.message);
  }
});

// Gửi dữ liệu cảm biến của 1 node
function sendSingleTelemetry(id) {
  const node = simulatedNodes[id];
  const now = new Date();

  // 1. DataPacket
  const dataPacket = {
    id: Number(id),
    t: Number(node.temp.toFixed(1)),
    h: Number(node.hum.toFixed(1)),
    g: Math.round(node.gas),
    r: node.relay,
    alarm: node.alarm,
  };
  client.publish(`${TOPIC_PREFIX}/node${id}/data`, JSON.stringify(dataPacket));

  // 2. TimePacket
  const timePacket = {
    id: Number(id),
    hr: now.getHours(),
    mn: now.getMinutes(),
    sc: now.getSeconds(),
    hasRtc: true,
  };
  client.publish(`${TOPIC_PREFIX}/node${id}/time`, JSON.stringify(timePacket));
}

// Chu kỳ gửi dữ liệu tất cả node giả lập
function publishTelemetry() {
  Object.keys(simulatedNodes).forEach((id) => {
    const node = simulatedNodes[id];

    // Tạo biến thiên tự nhiên nếu không trong tình trạng báo động ép buộc
    if (!node.alarm) {
      node.temp += (Math.random() - 0.5) * 0.4;
      node.hum += (Math.random() - 0.5) * 0.8;
      node.gas += (Math.random() - 0.5) * 10;

      // Giới hạn giá trị hợp lý
      node.temp = Math.max(20, Math.min(34, node.temp));
      node.hum = Math.max(40, Math.min(80, node.hum));
      node.gas = Math.max(100, Math.min(600, node.gas));
    }

    sendSingleTelemetry(id);
  });
}

// Bắt phím bấm từ bàn phím terminal
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') process.exit();
  if (str === 'q' || str === 'Q') {
    console.log('\nĐang dừng bộ giả lập...');
    client.end();
    process.exit(0);
  }

  // Phím 2: Báo động Node 2
  if (str === '2') {
    const node = simulatedNodes[2];
    node.alarm = !node.alarm;
    if (node.alarm) {
      node.temp = 48.5; // Vượt ngưỡng 35 độ
      node.gas = 1200;
      console.log('\n🚨 [Trụ #2] ĐÃ KÍCH HOẠT TÌNH HUỐNG NGUY HIỂM! Nhiệt độ: 48.5°C -> Kiểm tra điện thoại!');
    } else {
      node.temp = 29.5;
      console.log('\n✅ [Trụ #2] Đã khôi phục trạng thái an toàn.');
    }
    sendSingleTelemetry(2);
  }

  // Phím 3: Báo động Node 3
  if (str === '3') {
    const node = simulatedNodes[3];
    node.alarm = !node.alarm;
    if (node.alarm) {
      node.gas = 2800; // Vượt ngưỡng gas 2000
      console.log('\n🚨 [Trụ #3] ĐÃ KÍCH HOẠT RÒ RỈ GAS! Khí gas: 2800 -> Kiểm tra chuông báo điện thoại!');
    } else {
      node.gas = 410;
      console.log('\n✅ [Trụ #3] Đã khôi phục khí gas an toàn.');
    }
    sendSingleTelemetry(3);
  }
});
