import { supabase } from './supabase';

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

  if (error || !data) return [];

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
        courses: [],
        price: c.price_per_session,
      };
    }
    map[t.id].subjects.push(c.subject);
    map[t.id].courses.push(c);
  });

  const tutors = Object.values(map);
  const enriched = await Promise.all(tutors.map(async (t) => {
    const courseIds = t.courses.map(c => c.id);

    let totalSessions = 0;
    let doneCount = 0;

    if (courseIds.length > 0) {
      // Đếm tổng buổi của tất cả courses
      totalSessions = t.courses.reduce((sum, c) => sum + (c.total_sessions || 0), 0);

      // Đếm buổi đã học (confirmed)
      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .in('course_id', courseIds)
        .eq('status', 'confirmed');
      doneCount = count || 0;
    }

    const sessionsLeft = Math.max(0, totalSessions - doneCount);

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

    return {
      ...t,
      totalSessions,
      doneCount,
      sessionsLeft,
      unread,
      conversationId,
    };
  }));

  return enriched;
}
