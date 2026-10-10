import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { AUTH_SESSION_KEY } from '../auth/serverLogin';

export async function createBooking({
  tutorId,
  subject,
  slots,
  paymentType,
}) {
  const token = await AsyncStorage.getItem(AUTH_SESSION_KEY);

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    throw new Error(
      'Phiên đăng nhập chưa được kích hoạt. Vui lòng đăng xuất rồi đăng nhập lại.'
    );
  }

  if (
    !tutorId ||
    !subject ||
    !Array.isArray(slots) ||
    ![10, 20, 30].includes(slots.length) ||
    !['full', 'half'].includes(paymentType)
  ) {
    throw new Error('Thông tin đặt lịch không hợp lệ');
  }

  for (const slot of slots) {
    if (
      !slot ||
      typeof slot.start_at !== 'string' ||
      typeof slot.end_at !== 'string' ||
      !Number.isFinite(Date.parse(slot.start_at)) ||
      !Number.isFinite(Date.parse(slot.end_at))
    ) {
      throw new Error('Thông tin đặt lịch không hợp lệ');
    }
  }

  const { data, error } = await supabase.functions.invoke(
    'booking-create',
    {
      headers: {
        'x-eduteach-session': token,
      },
      body: {
        tutor_id: tutorId,
        subject,
        slots,
        payment_type: paymentType,
      },
    }
  );

  if (error || !data?.ok) {
    const raw = String(data?.message || data?.error || error?.message || '');
    if (/401|đăng nhập|hết hạn|Phiên/i.test(raw)) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    if (/409|BOOKING_REJECTED|giữ lịch|lịch trống/i.test(raw)) {
      throw new Error(
        data?.message ||
        'Không thể giữ lịch. Khung giờ có thể vừa bị đặt. Quay lại chọn lịch mới.'
      );
    }
    throw new Error(
      data?.message ||
      'Không thể giữ lịch. Vui lòng thử lại.'
    );
  }

  if (
    !data?.order_id ||
    !data?.course_id ||
    !data?.order_code ||
    !data?.expires_at ||
    !Number.isFinite(Date.parse(data.expires_at))
  ) {
    throw new Error('Máy chủ trả về đơn hàng không hợp lệ');
  }

  return {
    id: data.order_id,
    course_id: data.course_id,
    order_code: data.order_code,
    amount: data.amount,
    expires_at: data.expires_at,
  };
}
