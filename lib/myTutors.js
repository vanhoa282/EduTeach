import { supabase } from './supabase';

// Lấy danh sách gia sư mà HS đang học
export async function getMyTutors(studentId) {
  if (!studentId) return [];

  const { data, error } = await supabase
    .from('courses')
    .select(`
      id, subject, total_sessions, status, price_per_session,
      tutor:users!courses_tutor_id_fkey (id, full_name, phone, avatar_url)
    `)
    .eq('student_id', studentId)
    .in('status', ['active', 'completed', 'pending_payment'])
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('getMyTutors error:', error);
    return [];
  }

  // Group theo tutor
  const map = {};
  data.forEach(c => {
    const t = c.tutor;
    if (!t) return;
    if (!map[t.id]) {
      map[t.id] = {
        id: t.id,
        name: t.full_name || 'Gia sư',
        phone: t.phone,
        avatar: t.avatar_url || `https://i.pravatar.cc/150?u=${t.id}`,
        subjects: [],
        activeCourses: 0,
        completedCourses: 0,
        totalSessions: 0,
        price: c.price_per_session,
      };
    }
    map[t.id].subjects.push(c.subject);
    map[t.id].totalSessions += c.total_sessions || 0;
    if (c.status === 'active') map[t.id].activeCourses++;
    if (c.status === 'completed') map[t.id].completedCourses++;
  });

  // Đếm unread chat + buổi đã học
  const tutors = Object.values(map);
  const enriched = await Promise.all(tutors.map(async (t) => {
    // Đếm số buổi đã học với tutor này
    const { data: courses } = await supabase
      .from('courses').select('id').eq('student_id', studentId).eq('tutor_id', t.id);
    const courseIds = (courses || []).map(c => c.id);

    let doneCount = 0;
    if (courseIds.length > 0) {
      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .in('course_id', courseIds)
        .eq('status', 'confirmed');
      doneCount = count || 0;
    }

    // Đếm unread chat
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', studentId)
      .eq('tutor_id', t.id)
      .maybeSingle();

    let unread = 0;
    let conversationId = null;
    if (conv) {
      conversationId = conv.id;
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .is('read_at', null)
        .neq('sender_id', studentId);
      unread = count || 0;
    }

    return { ...t, doneCount, unread, conversationId };
  }));

  return enriched;
}
