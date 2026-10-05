import { supabase } from './supabase';

// Lấy tất cả review của 1 gia sư
export async function getTutorReviews(tutorId, limit = 50) {
  if (!tutorId) return [];

  // Lấy reviews qua sessions → courses → tutor_id
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('tutor_id', tutorId);

  if (!courses || courses.length === 0) return [];
  const courseIds = courses.map(c => c.id);

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, session_number, course_id')
    .in('course_id', courseIds);

  if (!sessions || sessions.length === 0) return [];
  const sessionIds = sessions.map(s => s.id);

  const { data: reviews, error } = await supabase
    .from('session_reviews')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !reviews) return [];

  // Lấy student info cho từng review
  const enriched = await Promise.all(reviews.map(async (r) => {
    const session = sessions.find(s => s.id === r.session_id);
    if (!session) return { ...r, student: null, subject: null };

    const { data: course } = await supabase
      .from('courses')
      .select('student_id, subject, student:users!courses_student_id_fkey (id, full_name, avatar_url)')
      .eq('id', session.course_id)
      .maybeSingle();

    return {
      ...r,
      session_number: session.session_number,
      subject: course?.subject || null,
      student: course?.student || null,
    };
  }));

  return enriched;
}

// Thống kê rating theo số sao (5,4,3,2,1)
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

// Ẩn tên: Nguyễn Văn An → Nguyễn A.
export function maskName(fullName) {
  if (!fullName) return 'Học sinh ẩn danh';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return parts.slice(0, -1).join(' ') + ' ' + last.charAt(0) + '.';
}
