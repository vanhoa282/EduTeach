import { supabase } from './supabase';

// Lấy review CỦA gia sư (HS đánh GV)
export async function getTutorReviews(tutorId, limit = 50) {
  if (!tutorId) return [];

  const { data: courses } = await supabase
    .from('courses').select('id').eq('tutor_id', tutorId);
  if (!courses || courses.length === 0) return [];
  const courseIds = courses.map(c => c.id);

  const { data: sessions } = await supabase
    .from('sessions').select('id, session_number, course_id').in('course_id', courseIds);
  if (!sessions || sessions.length === 0) return [];
  const sessionIds = sessions.map(s => s.id);

  const { data: reviews, error } = await supabase
    .from('session_reviews')
    .select('*')
    .in('session_id', sessionIds)
    .eq('reviewer_role', 'student')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !reviews) return [];

  const enriched = await Promise.all(reviews.map(async (r) => {
    const session = sessions.find(s => s.id === r.session_id);
    if (!session) return { ...r, student: null, subject: null };

    const { data: course } = await supabase
      .from('courses')
      .select('student_id, subject, student:users!courses_student_id_fkey (id, full_name, avatar_url)')
      .eq('id', session.course_id).maybeSingle();

    return {
      ...r,
      session_number: session.session_number,
      subject: course?.subject || null,
      student: course?.student || null,
    };
  }));

  return enriched;
}

// Lấy đánh giá VỀ học sinh (GV đánh HS)
export async function getStudentReviews(studentId, limit = 30) {
  if (!studentId) return [];

  const { data: reviews, error } = await supabase
    .from('session_reviews')
    .select('*')
    .eq('reviewer_id', studentId)  // sẽ query ngược lại
    .order('created_at', { ascending: false })
    .limit(limit);
  
  // Query ngược: HS được đánh giá → tìm session mà HS đó là student
  const { data: courses } = await supabase
    .from('courses').select('id, subject, tutor_id').eq('student_id', studentId);
  if (!courses || courses.length === 0) return [];
  const courseIds = courses.map(c => c.id);

  const { data: sessions } = await supabase
    .from('sessions').select('id, session_number, course_id').in('course_id', courseIds);
  if (!sessions || sessions.length === 0) return [];
  const sessionIds = sessions.map(s => s.id);

  const { data: hsReviews, error: err2 } = await supabase
    .from('session_reviews')
    .select('*')
    .in('session_id', sessionIds)
    .eq('reviewer_role', 'tutor')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (err2 || !hsReviews) return [];

  const enriched = await Promise.all(hsReviews.map(async (r) => {
    const session = sessions.find(s => s.id === r.session_id);
    if (!session) return { ...r, tutor: null, subject: null };

    const { data: course } = await supabase
      .from('courses')
      .select('tutor_id, subject, tutor:users!courses_tutor_id_fkey (id, full_name, avatar_url)')
      .eq('id', session.course_id).maybeSingle();

    return {
      ...r,
      session_number: session.session_number,
      subject: course?.subject || null,
      tutor: course?.tutor || null,
    };
  }));

  return enriched;
}

// Thống kê rating
export function getRatingStats(reviews) {
  const stats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, total: 0, avg: 0 };
  if (!reviews || reviews.length === 0) return stats;
  reviews.forEach(r => {
    const star = Math.round(r.rating);
    if (stats[star] !== undefined) stats[star]++;
    stats.total++;
  });
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  stats.avg = sum / reviews.length;
  return stats;
}

// Ẩn tên
export function maskName(fullName) {
  if (!fullName) return 'Người dùng ẩn danh';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return parts.slice(0, -1).join(' ') + ' ' + last.charAt(0) + '.';
}

// GV đánh giá HS
export async function submitStudentReview({ sessionId, reviewerId, rating, comment }) {
  const { error } = await supabase.from('session_reviews').insert({
    session_id: sessionId,
    reviewer_id: reviewerId,
    reviewer_role: 'tutor',
    rating,
    comment: comment?.trim() || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

// Lấy session đã dạy của GV với 1 HS (để đánh giá)
export async function getTutorSessionsForStudent(tutorId, studentId) {
  const { data: courses } = await supabase
    .from('courses').select('id, subject').eq('tutor_id', tutorId).eq('student_id', studentId);
  if (!courses || courses.length === 0) return [];
  const courseIds = courses.map(c => c.id);

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`*, course:courses (subject)`)
    .in('course_id', courseIds)
    .eq('status', 'confirmed')
    .order('scheduled_at', { ascending: false });
  return sessions || [];
}

// Kiểm tra session đã có review của GV chưa
export async function getSessionReviewByRole(sessionId, role) {
  const { data } = await supabase
    .from('session_reviews').select('*')
    .eq('session_id', sessionId)
    .eq('reviewer_role', role)
    .maybeSingle();
  return data;
}

// Lấy đánh giá mà HS đã gửi cho GV
export async function getMyReviewForTutor(studentId, tutorId) {
  if (!studentId || !tutorId) return [];

  // Lấy courses HS học với GV này
  const { data: courses } = await supabase
    .from('courses')
    .select('id, subject')
    .eq('student_id', studentId)
    .eq('tutor_id', tutorId);
  if (!courses || courses.length === 0) return [];
  const courseIds = courses.map(c => c.id);

  // Lấy sessions đã học
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, session_number, course_id, status')
    .in('course_id', courseIds)
    .eq('status', 'confirmed');
  if (!sessions || sessions.length === 0) return [];
  const sessionIds = sessions.map(s => s.id);

  // Lấy reviews HS đã gửi
  const { data: reviews, error } = await supabase
    .from('session_reviews')
    .select('*')
    .in('session_id', sessionIds)
    .eq('reviewer_id', studentId)
    .eq('reviewer_role', 'student')
    .order('created_at', { ascending: false });
  if (error || !reviews) return [];

  return reviews.map(r => {
    const s = sessions.find(x => x.id === r.session_id);
    const c = courses.find(x => x.id === s?.course_id);
    return {
      ...r,
      session_number: s?.session_number,
      subject: c?.subject,
    };
  });
}
