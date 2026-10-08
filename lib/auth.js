import { supabase } from './supabase';
import { createNotification } from './notif';
import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';

const SALT_ROUNDS = 10;

bcrypt.setRandomFallback((len) => Array.from(Crypto.getRandomBytes(len)));

// Rate limit: kiểm tra 1 IP/device tạo bao nhiêu account hôm nay
async function checkSignupRateLimit() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: { session } } = await supabase.auth.getSession();
    // Đơn giản: đếm số account tạo trong ngày từ thiết bị này
    // Nếu > 3 → block
    const deviceKey = '@eduteach_signup_count_' + todayStart.toISOString().split('T')[0];
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const count = parseInt(await AsyncStorage.getItem(deviceKey) || '0');
    if (count >= 3) {
      return { error: 'Thiết bị này đã tạo quá nhiều tài khoản hôm nay. Thử lại ngày mai.' };
    }
    await AsyncStorage.setItem(deviceKey, String(count + 1));
    return { ok: true };
  } catch (e) {
    return { ok: true }; // Không block nếu lỗi
  }
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  if (!hash.startsWith('$2')) return password === hash;
  return await bcrypt.compare(password, hash);
}

export async function signUpStudent({ phone, password, fullName }) {
  // Rate limit
  const rateCheck = await checkSignupRateLimit();
  if (rateCheck.error) return { error: rateCheck.error };

  const { data: existing } = await supabase
    .from('users').select('id').eq('phone', phone).maybeSingle();
  if (existing) return { error: 'Số điện thoại này đã được đăng ký' };

  const hashedPassword = await hashPassword(password);

  const { data, error } = await supabase
    .from('users')
    .insert({
      phone,
      password: hashedPassword,
      role: 'student',
      full_name: fullName,
      status: 'active',
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from('wallets').insert({ user_id: data.id });

  return { user: data };
}

async function signIn({ phone, password }) {
  const { data, error } = await supabase
    .from('users').select('*').eq('phone', phone).maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'Số điện thoại chưa đăng ký' };

  const ok = await verifyPassword(password, data.password);
  if (!ok) return { error: 'Mật khẩu không đúng' };
  if (data.status === 'banned') return { error: 'Tài khoản đã bị khoá' };

  // Auto-migrate plain → hash
  if (data.password && !data.password.startsWith('$2')) {
    try {
      const newHash = await hashPassword(password);
      await supabase.from('users').update({ password: newHash }).eq('id', data.id);
    } catch (e) {}
  }

  return { user: data };
}

export async function signInStudent({ phone, password }) {
  const result = await signIn({ phone, password });
  if (result.error) return result;

  if (!['student', 'admin'].includes(result.user.role)) {
    return {
      error: result.user.role === 'tutor'
        ? 'Đây là tài khoản Gia sư. Vui lòng đăng nhập tại mục Gia sư.'
        : 'Tài khoản này không thuộc mục Học sinh.'
    };
  }

  return result;
}

export async function signInTutor({ phone, password }) {
  const result = await signIn({ phone, password });
  if (result.error) return result;

  if (result.user.role !== 'tutor') {
    return {
      error: result.user.role === 'student'
        ? 'Đây là tài khoản Học sinh. Vui lòng đăng nhập tại mục Học sinh.'
        : 'Tài khoản này không thuộc mục Gia sư.'
    };
  }

  return result;
}

export async function changePassword(userId, oldPassword, newPassword) {
  if (!userId) return { error: 'Chưa đăng nhập' };
  if (!newPassword || newPassword.length < 6) return { error: 'Mật khẩu mới phải từ 6 ký tự' };

  const { data: user } = await supabase
    .from('users').select('password').eq('id', userId).maybeSingle();
  if (!user) return { error: 'Không tìm thấy tài khoản' };

  const ok = await verifyPassword(oldPassword, user.password);
  if (!ok) return { error: 'Mật khẩu cũ không đúng' };

  const hashedNew = await hashPassword(newPassword);
  const { error } = await supabase
    .from('users').update({ password: hashedNew }).eq('id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function adminResetPassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 6) return { error: 'Mật khẩu từ 6 ký tự' };
  const hashed = await hashPassword(newPassword);
  const { error } = await supabase
    .from('users').update({ password: hashed }).eq('id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateProfile(userId, { fullName, avatarUrl }) {
  if (!userId) return { error: 'Chưa đăng nhập' };
  const updates = {};
  if (fullName !== undefined) updates.full_name = fullName.trim();
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
  const { data, error } = await supabase
    .from('users').update(updates).eq('id', userId).select().single();
  if (error) return { error: error.message };
  return { user: data };
}

export async function saveBankAccount(userId, { bankName, bankAccount, bankHolder }) {
  if (!userId) return { error: 'Chưa đăng nhập' };
  const { data: existing } = await supabase
    .from('tutor_profiles').select('user_id').eq('user_id', userId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('tutor_profiles')
      .update({ bank_name: bankName, bank_account: bankAccount, bank_holder: bankHolder })
      .eq('user_id', userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('tutor_profiles')
      .insert({ user_id: userId, bank_name: bankName, bank_account: bankAccount, bank_holder: bankHolder });
    if (error) return { error: error.message };
  }
  return { ok: true };
}

export async function getBankAccount(userId) {
  const { data } = await supabase
    .from('tutor_profiles').select('bank_name, bank_account, bank_holder')
    .eq('user_id', userId).maybeSingle();
  return data || {};
}

export async function getTutors() {
  const { data, error } = await supabase
    .from('users')
    .select(`id, phone, full_name, avatar_url, tutor_profiles (bio, subjects, price_per_session, rating_avg, rating_count, experience_years)`)
    .eq('role', 'tutor').eq('status', 'active');
  if (error) return [];
  return data.map(u => {
    const p = Array.isArray(u.tutor_profiles) ? u.tutor_profiles[0] : u.tutor_profiles;
    const profile = p || {};
    return {
      id: u.id,
      name: u.full_name || 'Gia sư',
      avatar: u.avatar_url || `https://i.pravatar.cc/150?u=${u.id}`,
      subject: profile.subjects?.[0] || 'Chưa rõ',
      experience: profile.experience_years ? `${profile.experience_years} năm` : 'Mới',
      rating: parseFloat(profile.rating_avg) || 0,
      reviews: profile.rating_count || 0,
      price: profile.price_per_session || 0,
      bio: profile.bio || '',
    };
  });
}

export async function adminGetUsers() {
  const { data, error } = await supabase
    .from('users').select('*').order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return { users: data };
}

export async function adminUpdateRole(userId, newRole) {
  const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function adminSetStatus(userId, status) {
  const { error } = await supabase.from('users').update({ status }).eq('id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function adminGetStats() {
  const [usersRes, tutorsRes, coursesRes, ordersRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'tutor'),
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
  ]);
  return {
    students: usersRes.count || 0,
    tutors: tutorsRes.count || 0,
    courses: coursesRes.count || 0,
    paidOrders: ordersRes.count || 0,
  };
}

export async function adminGetCourses() {
  const { data, error } = await supabase
    .from('courses').select('*').order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return { courses: data };
}

export async function adminGetPendingOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, student:users!orders_student_id_fkey (id, full_name, phone), course:courses (id, subject, total_sessions, tutor_id, schedule)`)
    .in('status', ['pending']).order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return { orders: data || [] };
}

export async function adminApproveOrder(orderId) {
  const { data: order, error: oErr } = await supabase
    .from('orders').select('*, course:courses(*)').eq('id', orderId).maybeSingle();
  if (oErr || !order) return { error: oErr?.message || 'Không tìm thấy đơn' };

  const { error: updOrderErr } = await supabase
    .from('orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', orderId);
  if (updOrderErr) return { error: updOrderErr.message };

  const course = order.course;
  if (course) {
    const { error: updCourseErr } = await supabase
      .from('courses').update({ status: 'active', paid_amount: order.amount }).eq('id', course.id);
    if (updCourseErr) return { error: updCourseErr.message };

    await createNotification({
      userId: course.student_id,
      title: '✅ Khóa học đã được kích hoạt',
      body: `Khóa ${course.subject} (${course.total_sessions} buổi) đã sẵn sàng.`,
      type: 'course', refId: course.id,
    });

    await createNotification({
      userId: course.tutor_id,
      title: '📚 Bạn có khóa học mới',
      body: `Học sinh đã đăng ký khóa ${course.subject} (${course.total_sessions} buổi).`,
      type: 'course', refId: course.id,
    });

    const now = new Date();
    const sessionRows = [];
    for (let i = 1; i <= course.total_sessions; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + (i * 3));
      d.setHours(18, 0, 0, 0);
      const scheduledStart = d.toISOString();
      const end = new Date(d.getTime() + 2 * 60 * 60 * 1000);
      sessionRows.push({
        course_id: course.id,
        session_number: i,
        scheduled_at: scheduledStart,
        scheduled_start: scheduledStart,
        scheduled_end: end.toISOString(),
        status: 'pending',
      });
    }
    await supabase.from('sessions').delete().eq('course_id', course.id);
    const { error: sesErr } = await supabase.from('sessions').insert(sessionRows);
    if (sesErr) console.error('Tạo sessions lỗi:', sesErr);
  }
  return { ok: true };
}

export async function adminRejectOrder(orderId) {
  const { data: order } = await supabase
    .from('orders').select('*, course:courses(*)').eq('id', orderId).maybeSingle();
  const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
  if (error) return { error: error.message };
  if (order?.course_id) {
    await supabase.from('courses').update({ status: 'cancelled' }).eq('id', order.course_id);
    if (order.course) {
      await createNotification({
        userId: order.course.student_id,
        title: '❌ Đơn hàng bị từ chối',
        body: `Đơn ${order.order_code} đã bị từ chối.`,
        type: 'order', refId: orderId,
      });
    }
  }
  return { ok: true };
}
