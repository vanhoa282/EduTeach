import { supabase } from './supabase';
import { createNotification } from './notif';

// Admin tạo tài khoản gia sư
export async function adminCreateTutor({ phone, password, fullName, subjects, price, experienceYears, bio, adminId }) {
  if (!phone || phone.length < 10) return { error: 'SĐT phải 10 số' };
  if (!password || password.length < 6) return { error: 'Mật khẩu phải từ 6 ký tự' };
  if (!fullName?.trim()) return { error: 'Vui lòng nhập họ tên' };
  if (!subjects || subjects.length === 0) return { error: 'Chọn ít nhất 1 môn dạy' };
  if (!price || parseInt(price) < 10000) return { error: 'Giá tối thiểu 10.000đ' };

  // Check SĐT trùng
  const { data: existing } = await supabase
    .from('users').select('id').eq('phone', phone).maybeSingle();
  if (existing) return { error: 'Số điện thoại đã tồn tại' };

  // Tạo user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .insert({
      phone,
      password,
      role: 'tutor',
      full_name: fullName.trim(),
      status: 'active',
      is_available: true,
    })
    .select()
    .single();

  if (userErr) return { error: userErr.message };

  // Tạo tutor profile
  const { error: profileErr } = await supabase
    .from('tutor_profiles')
    .insert({
      user_id: user.id,
      bio: bio?.trim() || '',
      subjects,
      price_per_session: parseInt(price),
      experience_years: parseInt(experienceYears) || 0,
      verify_status: 'active',
      rating_avg: 5.0,
      rating_count: 0,
    });

  if (profileErr) {
    // Rollback user nếu profile fail
    await supabase.from('users').delete().eq('id', user.id);
    return { error: profileErr.message };
  }

  // Tạo ví
  await supabase.from('wallets').insert({ user_id: user.id });

  // Thông báo cho admin
  if (adminId) {
    await createNotification({
      userId: adminId,
      title: '✅ Đã tạo tài khoản gia sư',
      body: `${fullName} (${phone}) đã được tạo thành công.`,
      type: 'system',
    });
  }

  return { ok: true, tutor: user };
}

// Đổi mật khẩu cho user (admin dùng)
export async function adminResetPassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 6) return { error: 'Mật khẩu từ 6 ký tự' };
  const { error } = await supabase
    .from('users').update({ password: newPassword }).eq('id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}
