import { supabase } from './supabase';
import { createNotification } from './notif';

// ============ ĐĂNG KÝ HỌC SINH ============
export async function signUpStudent({ phone, password, fullName }) {
  const { data: existing } = await supabase
    .from('users').select('id').eq('phone', phone).maybeSingle();
  if (existing) return { error: 'Số điện thoại này đã được đăng ký' };

  const { data, error } = await supabase
    .from('users')
    .insert({
      phone,
      password,
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

// ============ ĐĂNG NHẬP ============
async function signIn({ phone, password }) {
  const { data, error } = await supabase
    .from('users').select('*').eq('phone', phone).maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'Số điện thoại chưa đăng ký' };
  if (data.password !== password) return { error: 'Mật khẩu không đúng' };
  if (data.status === 'banned') return { error: 'Tài khoản đã bị khoá' };

  return { user: data };
}

export async function signInStudent({ phone, password }) {
  return signIn({ phone, password });
}

export async function signInTutor({ phone, password }) {
  return signIn({ phone, password });
}

// ============ CẬP NHẬT PROFILE ============
export async function updateProfile(userId, { fullName, avatarUrl }) {
  if (!userId) return { error: 'Chưa đăng nhập' };

  const updates = {};
  if (fullName !== undefined) updates.full_name = fullName.trim();
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { user: data };
}

// ============ ĐỔI MẬT KHẨU ============
export async function changePassword(userId, oldPassword, newPassword) {
  if (!userId) return { error: 'Chưa đăng nhập' };
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Mật khẩu mới phải từ 6 ký tự' };
  }

  const { data: user } = await supabase
    .from('users').select('password').eq('id', userId).maybeSingle();

  if (!user) return { error: 'Không tìm thấy tài khoản' };
  if (user.password !== oldPassword) return { error: 'Mật khẩu cũ không đúng' };

  const { error } = await supabase
    .from('users').update({ password: newPassword }).eq('id', userId);

  if (error) return { error: error.message };
  return { ok: true };
}

// ============ LƯU STK NGÂN HÀNG ============
export async function saveBankAccount(userId, { bankName, bankAccount, bankHolder }) {
  if (!userId) return { error: 'Chưa đăng nhập' };

  // Lưu vào tutor_profiles hoặc bảng riêng (dùng tutor_profiles cho đơn giản)
  const { data: existing } = await supabase
    .from('tutor_profiles').select('user_id').eq('user_id', userId).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('tutor_profiles')
      .update({ bank_name: bankName, bank_account: bankAccount, bank_holder: bankHolder })
      .eq('user_id', userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('tutor_profiles')
      .insert({
        user_id: userId,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
      });
    if (error) return { error: error.message };
  }

  return { ok: true };
}

export async function getBankAccount(userId) {
  const { data } = await supabase
    .from('tutor_profiles')
    .select('bank_name, bank_account, bank_holder')
    .eq('user_id', userId)
    .maybeSingle();
  return data || {};
}

// ============ LẤY DANH SÁCH GIA SƯ ============
export async function getTutors() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, phone, full_name, avatar_url,
      tutor_profiles (bio, subjects, price_per_session, rating_avg, rating_count, experience_years)
    `)
    .eq('role', 'tutor')
    .eq('status', 'active');

  if (error) {
    console.error('getTutors error:', error);
    return [];
  }

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

// ============ ADMIN ============
export async function adminGetUsers() {
  const { data, error } = await supabase
    .from('users').select('*').order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return { users: data };
}

export async function adminUpdateRole(userId, newRole) {
  const { error } = await supabase
    .from('users').update({ role: newRole }).eq('id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function adminSetStatus(userId, status) {
  const { error } = await supabase
    .from('users').update({ status }).eq('id', userId);
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

// ============ ADMIN DUYỆT ĐƠN ============
export async function adminGetPendingOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      student:users!orders_student_id_fkey (id, full_name, phone),
      course:courses (id, subject, total_sessions, tutor_id, schedule)
    `)
    .in('status', ['pending'])
    .order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return { orders: data || [] };
}

export async function adminApproveOrder(orderId) {
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('*, course:courses(*)')
    .eq('id', orderId).maybeSingle();

  if (oErr || !order) return { error: oErr?.message || 'Không tìm thấy đơn' };

  const { error: updOrderErr } = await supabase
    .from('orders')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', orderId);
  if (updOrderErr) return { error: updOrderErr.message };

  const course = order.course;
  if (course) {
    const { error: updCourseErr } = await supabase
      .from('courses')
      .update({ status: 'active', paid_amount: order.amount })
      .eq('id', course.id);
    if (updCourseErr) return { error: updCourseErr.message };

    await createNotification({
      userId: course.student_id,
      title: '✅ Khóa học đã được kích hoạt',
      body: `Khóa ${course.subject} (${course.total_sessions} buổi) đã sẵn sàng. Vào xem lịch học ngay!`,
      type: 'course',
      refId: course.id,
    });

    await createNotification({
      userId: course.tutor_id,
      title: '📚 Bạn có khóa học mới',
      body: `Học sinh đã đăng ký khóa ${course.subject} (${course.total_sessions} buổi). Xem lịch dạy ngay!`,
      type: 'course',
      refId: course.id,
    });

    const now = new Date();
    const sessionRows = [];
    for (let i = 1; i <= course.total_sessions; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + (i * 3));
      d.setHours(18, 0, 0, 0);
      sessionRows.push({
        course_id: course.id,
        session_number: i,
        scheduled_at: d.toISOString(),
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

  const { error } = await supabase
    .from('orders').update({ status: 'cancelled' }).eq('id', orderId);
  if (error) return { error: error.message };

  if (order?.course_id) {
    await supabase.from('courses').update({ status: 'cancelled' }).eq('id', order.course_id);
    if (order.course) {
      await createNotification({
        userId: order.course.student_id,
        title: '❌ Đơn hàng bị từ chối',
        body: `Đơn ${order.order_code} cho khóa ${order.course.subject} đã bị từ chối. Vui lòng liên hệ admin.`,
        type: 'order',
        refId: orderId,
      });
    }
  }
  return { ok: true };
}
