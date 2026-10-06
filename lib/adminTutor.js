import { supabase } from './supabase';
import { createNotification } from './notif';
import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';

const SALT_ROUNDS = 10;

bcrypt.setRandomFallback((len) => {
  const bytes = Crypto.getRandomBytes(len);
  return Array.from(bytes);
});

export async function adminCreateTutor({ phone, password, fullName, subjects, price, experienceYears, bio, adminId }) {
  if (!phone || phone.length < 10) return { error: 'SĐT phải 10 số' };
  if (!password || password.length < 6) return { error: 'Mật khẩu phải từ 6 ký tự' };
  if (!fullName?.trim()) return { error: 'Vui lòng nhập họ tên' };
  if (!subjects || subjects.length === 0) return { error: 'Chọn ít nhất 1 môn dạy' };
  if (!price || parseInt(price) < 10000) return { error: 'Giá tối thiểu 10.000đ' };

  const { data: existing } = await supabase
    .from('users').select('id').eq('phone', phone).maybeSingle();
  if (existing) return { error: 'Số điện thoại đã tồn tại' };

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);

  const { data: user, error: userErr } = await supabase
    .from('users')
    .insert({
      phone,
      password: hashedPassword,
      role: 'tutor',
      full_name: fullName.trim(),
      status: 'active',
      is_available: true,
    })
    .select()
    .single();

  if (userErr) return { error: userErr.message };

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
    await supabase.from('users').delete().eq('id', user.id);
    return { error: profileErr.message };
  }

  await supabase.from('wallets').insert({ user_id: user.id });

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

export async function adminResetPassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 6) return { error: 'Mật khẩu từ 6 ký tự' };
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashed = await bcrypt.hash(newPassword, salt);
  const { error } = await supabase
    .from('users').update({ password: hashed }).eq('id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}
