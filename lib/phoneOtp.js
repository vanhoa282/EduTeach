// Xác minh số điện thoại bằng Firebase Phone Auth (SMS OTP).
// Dùng @react-native-firebase/auth (native module — cần build EAS, không chạy Expo Go).
// Luồng: gửi mã SMS → người dùng nhập mã → lấy idToken → Edge Function
// firebase-verify kiểm tra lại chữ ký + số đã xác minh + độ mới của token ở server.
import { getAuth, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import { supabase } from './supabase';

// '0xxxxxxxxx' -> '+84xxxxxxxxx'
export function toE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('84')) return '+' + digits;
  if (digits.startsWith('0')) return '+84' + digits.slice(1);
  return '+84' + digits;
}

// '+84xxxxxxxxx' -> '0xxxxxxxxx' (dạng app đang lưu trong bảng users)
export function toLocalPhone(e164) {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (digits.startsWith('84')) return '0' + digits.slice(2);
  return digits;
}

const ERROR_MAP = {
  'auth/invalid-phone-number': 'Số điện thoại không hợp lệ.',
  'auth/invalid-verification-code': 'Mã OTP không đúng. Kiểm tra lại nhé.',
  'auth/code-expired': 'Mã OTP đã hết hạn. Bấm gửi lại mã mới.',
  'auth/session-expired': 'Phiên xác minh đã hết hạn. Bấm gửi lại mã mới.',
  'auth/too-many-requests': 'Bạn thao tác quá nhiều lần. Đợi ít phút rồi thử lại.',
  'auth/quota-exceeded': 'Hệ thống tạm hết lượt gửi SMS hôm nay. Thử lại sau nhé.',
  'auth/network-request-failed': 'Lỗi mạng. Kiểm tra kết nối rồi thử lại.',
  'auth/missing-phone-number': 'Chưa nhập số điện thoại.',
  'auth/app-not-authorized': 'Ứng dụng chưa được Firebase cấp quyền gửi OTP (thiếu SHA). Liên hệ admin.',
};

export function mapOtpError(e) {
  return ERROR_MAP[e?.code] || ('Lỗi xác minh: ' + (e?.message || 'không xác định'));
}

// Gửi mã OTP về số điện thoại (nhận dạng 0xxxxxxxxx hoặc +84xxxxxxxxx).
// Trả về đối tượng confirmation — giữ lại để gọi confirmPhoneOtp().
export async function sendPhoneOtp(phone) {
  return signInWithPhoneNumber(getAuth(), toE164(phone));
}

// Xác nhận mã OTP → verify token ở server → { uid, phone } với phone dạng +84...
// Server (firebase-verify) bắt buộc: token có phone_number và auth_time ≤ 10 phút.
export async function confirmPhoneOtp(confirmation, code) {
  const cred = await confirmation.confirm(String(code || '').trim());
  const idToken = await cred.user.getIdToken();
  const { data, error } = await supabase.functions.invoke('firebase-verify', {
    body: { token: idToken, requireFreshPhone: true },
  });
  if (error) {
    throw new Error('Không xác minh được với máy chủ: ' + (error?.message || ''));
  }
  if (!data?.ok) {
    throw new Error(data?.message || 'Token xác minh không hợp lệ');
  }
  if (!data.phone) {
    throw new Error('Token không chứa số điện thoại đã xác minh');
  }
  return { uid: data.uid, phone: data.phone };
}

// Xoá phiên Firebase tạm sau khi đăng ký xong (app dùng phiên đăng nhập riêng).
export async function clearFirebaseSession() {
  try {
    await signOut(getAuth());
  } catch (e) {
    // Bỏ qua — phiên Firebase tạm không ảnh hưởng phiên của app.
  }
}
