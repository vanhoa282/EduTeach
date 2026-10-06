import { supabase } from '../supabase';

export async function buildUserContext(user) {
  if (!user?.id) return '';

  const lines = [];
  lines.push(`Tên: ${user.full_name || 'Chưa có'}`);
  lines.push(`Role: ${user.role}`);
  lines.push(`SĐT: ${user.phone}`);

  if (user.role === 'student') {
    const { data: courses } = await supabase
      .from('courses')
      .select('subject, total_sessions, status')
      .eq('student_id', user.id)
      .limit(5);
    if (courses && courses.length > 0) {
      lines.push('Khóa học đang tham gia:');
      courses.forEach(c => {
        lines.push(`- ${c.subject} (${c.total_sessions} buổi, ${c.status})`);
      });
    } else {
      lines.push('Chưa có khóa học nào.');
    }
  } else if (user.role === 'tutor') {
    const { data: courses } = await supabase
      .from('courses')
      .select('subject, total_sessions, status')
      .eq('tutor_id', user.id)
      .limit(5);
    if (courses && courses.length > 0) {
      lines.push('Khóa học đang dạy:');
      courses.forEach(c => {
        lines.push(`- ${c.subject} (${c.total_sessions} buổi, ${c.status})`);
      });
    }
    const { data: profile } = await supabase
      .from('tutor_profiles')
      .select('subjects, price_per_session, experience_years')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile) {
      lines.push(`Môn dạy: ${(profile.subjects || []).join(', ')}`);
      lines.push(`Giá: ${(profile.price_per_session || 0).toLocaleString('vi-VN')}đ/buổi`);
      lines.push(`Kinh nghiệm: ${profile.experience_years || 0} năm`);
    }
  }
  return lines.join('\n');
}
