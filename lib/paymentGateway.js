import { supabase } from './supabase';

export async function getPaymentBank() {
  const { data, error } = await supabase.rpc('get_public_payment_bank');
  if (error) return { error: error.message };
  if (!data?.ready) return { error: 'Ngân hàng nhận thanh toán chưa được cấu hình' };
  return { bank: data };
}

export async function adminPaymentConfig(action, adminPhone, adminPassword, fields = {}) {
  try {
    const {data,error} = await supabase.functions.invoke('payment-api5s', {
      body: {
        action,
        admin_phone: adminPhone,
        admin_password: adminPassword,
        ...fields,
      },
    });
    if (error) return {error:data?.error || error.message || 'Không gọi được API'};
    if (data?.error) return {error:data.error};
    return data || {error:'API không có phản hồi'};
  } catch (e) {
    return {error:e.message || 'Lỗi kết nối'};
  }
}

// Customer action - requests immediate bank verification on the server.
// Do not expose API5S Token or the Supabase service role key to the app.
export async function checkPaymentNow(orderId, orderCode) {
  try {
    const { data, error } = await supabase.functions.invoke('payment-api5s', {
      body: { action: 'check_payment', order_id: orderId, order_code: orderCode },
    });
    if (error) return { status: 'error', message: data?.message || 'Không gọi được máy chủ thanh toán. Vui lòng thử lại.' };
    if (!data || !['paid', 'not_paid', 'rate_limited', 'error'].includes(data.status)) {
      return { status: 'error', message: 'Máy chủ trả dữ liệu không hợp lệ.' };
    }
    return data;
  } catch (_) {
    return { status: 'error', message: 'Lỗi kết nối mạng. Vui lòng thử lại.' };
  }
}
