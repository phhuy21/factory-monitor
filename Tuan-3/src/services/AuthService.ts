/**
 * ================================================================
 * Auth Service — Firebase Authentication
 * ================================================================
 *
 * Quản lý đăng nhập / đăng ký / đăng xuất:
 *   - Email + Password authentication
 *   - Auth state listener
 *   - Persistence qua AsyncStorage
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../config/firebase';

// ─── Auth Service ───────────────────────────────────────────────

class AuthService {
  /**
   * Đăng nhập bằng email + password.
   * @returns User object nếu thành công
   */
  async signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[AUTH] ✅ Đăng nhập thành công:', credential.user.email);
    return credential.user;
  }

  /**
   * Đăng ký tài khoản mới.
   * @param displayName — Tên hiển thị (tùy chọn)
   */
  async signUp(email: string, password: string, displayName?: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Cập nhật tên hiển thị nếu có
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    console.log('[AUTH] ✅ Đăng ký thành công:', credential.user.email);
    return credential.user;
  }

  /**
   * Đăng xuất.
   */
  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
    console.log('[AUTH] Đã đăng xuất');
  }

  /**
   * Lắng nghe thay đổi trạng thái đăng nhập.
   * Callback được gọi khi user đăng nhập/đăng xuất.
   * @returns Hàm unsubscribe
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  /**
   * Lấy user hiện tại (có thể null nếu chưa đăng nhập).
   */
  get currentUser(): User | null {
    return auth.currentUser;
  }
}

// ─── Singleton Export ───────────────────────────────────────────

export const authService = new AuthService();
export default authService;
