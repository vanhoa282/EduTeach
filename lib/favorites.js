import { supabase } from './supabase';

export async function isFavorite(studentId, tutorId) {
  if (!studentId || !tutorId) return false;
  try {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('student_id', studentId)
      .eq('tutor_id', tutorId)
      .maybeSingle();
    return !!data;
  } catch (e) {
    return false;
  }
}

export async function toggleFavorite(studentId, tutorId) {
  try {
    const existing = await isFavorite(studentId, tutorId);
    if (existing) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('student_id', studentId)
        .eq('tutor_id', tutorId);
      if (error) return { error: error.message };
      return { ok: true, isFavorite: false };
    }
    const { error } = await supabase
      .from('favorites')
      .insert({ student_id: studentId, tutor_id: tutorId });
    if (error) return { error: error.message };
    return { ok: true, isFavorite: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getMyFavorites(studentId) {
  if (!studentId) return [];
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id, created_at,
        tutor:users!favorites_tutor_id_fkey (
          id, full_name, avatar_url, phone,
          tutor_profiles (bio, subjects, price_per_session, rating_avg, rating_count, experience_years)
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    return data.map(f => {
      const t = f.tutor;
      const p = Array.isArray(t.tutor_profiles) ? t.tutor_profiles[0] : t.tutor_profiles;
      const prof = p || {};
      return {
        favoriteId: f.id,
        id: t.id,
        name: t.full_name || 'Gia sư',
        avatar: t.avatar_url || `https://i.pravatar.cc/150?u=${t.id}`,
        phone: t.phone,
        subject: prof.subjects?.[0] || 'Chưa rõ',
        experience: prof.experience_years ? `${prof.experience_years} năm` : 'Mới',
        rating: parseFloat(prof.rating_avg) || 0,
        reviews: prof.rating_count || 0,
        price: prof.price_per_session || 0,
        bio: prof.bio || '',
      };
    });
  } catch (e) {
    return [];
  }
}
