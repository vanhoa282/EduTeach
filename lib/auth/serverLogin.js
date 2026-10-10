import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export const AUTH_SESSION_KEY = '@eduteach_auth_session';

export async function serverLogin({ phone, password, role }) {
  if (!phone || !password) {
    return { error: 'Vui lòng nhập số điện thoại và mật khẩu' };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'auth-login',
      {
        body: {
          phone: phone.trim(),
          password,
        },
      }
    );

    if (error || !data?.ok || !data?.token || !data?.user) {
      return {
        error: data?.error || 'Không thể đăng nhập. Vui lòng thử lại.',
      };
    }

    const user = data.user;

    if (
      (role === 'student' && !['student', 'admin'].includes(user.role)) ||
      (role === 'tutor' && user.role !== 'tutor')
    ) {
      // A token was issued but belongs to the wrong account role.
      await supabase.functions.invoke('auth-logout', {
        headers: { 'x-eduteach-session': data.token }, body: {},
      }).catch(() => {});
      return { error: 'Tài khoản không thuộc mục đăng nhập này' };
    }

    if (!/^[a-f0-9]{64}$/.test(data.token)) {
      return { error: 'Phiên đăng nhập không hợp lệ' };
    }

    await AsyncStorage.setItem(AUTH_SESSION_KEY, data.token);

    return {
      user,
      expires_at: data.expires_at,
    };
  } catch {
    return {
      error: 'Không kết nối được máy chủ đăng nhập',
    };
  }
}

export async function clearServerSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}
