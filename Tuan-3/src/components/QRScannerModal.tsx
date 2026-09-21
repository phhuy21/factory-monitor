/**
 * ================================================================
 * QRScannerModal — Quét mã QR ghép nối Trụ Giám Sát
 * ================================================================
 *
 * Tính năng:
 *   - Quét QR code dán trên thân trụ giám sát (định dạng: {"id":1,"name":"Trụ #1"})
 *   - Hoặc nhập ID thủ công (1-9) nếu camera mờ/không có tem QR
 *   - Lưu tên trụ vào Cloud Firestore của người dùng
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SPACING, RADIUS, FONT_SIZES } from '../constants/theme';
import { useNodeStore } from '../store/useNodeStore';
import { firebaseService } from '../services/FirebaseService';
import { authService } from '../services/AuthService';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [manualId, setManualId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);

  const addDevice = useNodeStore((s) => s.addDevice);
  const selectNode = useNodeStore((s) => s.selectNode);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Định dạng QR: {"id": 1, "name": "Trụ 1"} hoặc chuỗi số đơn giản "1"
      let parsedId = 0;
      let parsedName = '';

      if (data.startsWith('{')) {
        const json = JSON.parse(data);
        parsedId = Number(json.id);
        parsedName = json.name || `Trụ #${parsedId}`;
      } else {
        parsedId = parseInt(data.trim(), 10);
        parsedName = `Trụ #${parsedId}`;
      }

      if (!parsedId || parsedId < 1 || parsedId > 9) {
        Alert.alert('Mã không hợp lệ', 'ID trụ giám sát phải từ 1 đến 9.', [
          { text: 'Quét lại', onPress: () => setScanned(false) },
        ]);
        return;
      }

      // Lưu thiết bị
      addDevice(parsedId, parsedName);
      selectNode(parsedId);

      const user = authService.currentUser;
      if (user) {
        await firebaseService.saveUserDevice(user.uid, { id: parsedId, name: parsedName });
      }

      Alert.alert('✅ Kết nối thành công', `Đã ghép nối "${parsedName}" vào tài khoản!`, [
        { text: 'OK', onPress: onClose },
      ]);
    } catch {
      Alert.alert('Không nhận diện được', 'Mã QR không đúng định dạng trụ Factory Monitor.', [
        { text: 'Thử lại', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleSaveDevice = async () => {
    const raw = manualId.trim().toUpperCase();
    let id = Number(raw);

    // Hỗ trợ người dùng nhập đa dạng: "1", "01", "NODE-01", "TRU-1", "FM-01"...
    if (isNaN(id) || !id) {
      const match = raw.match(/\d+/);
      if (match) {
        id = parseInt(match[0], 10);
      }
    }

    if (!id || id < 1 || id > 9) {
      Alert.alert(
        'Mã không hợp lệ',
        'Vui lòng nhập mã thiết bị hợp lệ (Từ 1 đến 9, hoặc dạng NODE-01, TRU-01...)'
      );
      return;
    }

    const name = deviceName.trim() || `Trụ #${id}`;
    setLoading(true);

    try {
      addDevice(id, name);
      selectNode(id);

      const user = authService.currentUser;
      if (user) {
        await firebaseService.saveUserDevice(user.uid, { id, name });
      }

      Alert.alert('Thành công 🎉', `Đã kết nối mã "${raw}" thành công với tên "${name}"!`);
      onClose();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu thiết bị: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ghép Nối Trụ Giám Sát</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, mode === 'scan' && styles.tabButtonActive]}
              onPress={() => {
                setMode('scan');
                setScanned(false);
              }}
            >
              <Text style={[styles.tabText, mode === 'scan' && styles.tabTextActive]}>
                📷 Quét Mã QR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, mode === 'manual' && styles.tabButtonActive]}
              onPress={() => setMode('manual')}
            >
              <Text style={[styles.tabText, mode === 'manual' && styles.tabTextActive]}>
                ⌨️ Nhập Thủ Công
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scanner View */}
          {mode === 'scan' ? (
            <View style={styles.scannerContainer}>
              {!permission?.granted ? (
                <View style={styles.permissionBox}>
                  <Text style={styles.permissionText}>
                    Cần cấp quyền truy cập máy ảnh để quét mã QR dán trên thân trụ
                  </Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Cấp quyền Camera</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraWrapper}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />
                  <View style={styles.overlayFrame}>
                    <View style={styles.scanBox} />
                    <Text style={styles.scanHint}>Hướng camera vào tem QR trên thân trụ</Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* Manual Input View */
            <View style={styles.manualContainer}>
              <Text style={styles.label}>Mã Thiết Bị / Số Hiệu Trụ (Ví dụ: 1 hoặc NODE-01)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mã thiết bị (VD: 1, 2 hoặc NODE-01)..."
                placeholderTextColor={COLORS.textMuted}
                value={manualId}
                onChangeText={setManualId}
                autoCapitalize="characters"
                maxLength={10}
              />

              <Text style={styles.label}>Tên gợi nhớ (Ví dụ: Khu lò hơi, Xưởng A)</Text>
              <TextInput
                style={styles.input}
                placeholder="Tên trụ hiển thị trên App..."
                placeholderTextColor={COLORS.textMuted}
                value={deviceName}
                onChangeText={setDeviceName}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSaveDevice}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Lưu & Kết Nối Trụ</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeText: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  scannerContainer: {
    height: 320,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBox: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: '#fff',
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  manualContainer: {
    paddingVertical: SPACING.sm,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

export default QRScannerModal;
