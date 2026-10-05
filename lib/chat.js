import { supabase } from './supabase';

export async function getOrCreateConversation(studentId, tutorId) {
  try {
    const { data: existing, error: gErr } = await supabase
      .from('conversations').select('*')
      .eq('student_id', studentId).eq('tutor_id', tutorId).maybeSingle();
    if (gErr) return { error: gErr.message };
    if (existing) return { conversation: existing };

    const { data, error } = await supabase
      .from('conversations')
      .insert({ student_id: studentId, tutor_id: tutorId })
      .select().single();
    if (error) return { error: error.message };
    return { conversation: data };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getMyConversations(userId) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`*, student:users!conversations_student_id_fkey (id, full_name, phone), tutor:users!conversations_tutor_id_fkey (id, full_name, phone)`)
      .or(`student_id.eq.${userId},tutor_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });
    if (error || !data) return [];
    return await Promise.all(data.map(async (c) => {
      const { count } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id).is('read_at', null).neq('sender_id', userId);
      return { ...c, unread_count: count || 0 };
    }));
  } catch (e) {
    return [];
  }
}

export async function getMessages(conversationId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, sender:users!messages_sender_id_fkey (id, full_name)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }).limit(limit);
    if (error) return [];
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function sendMessage({ conversationId, senderId, content }) {
  try {
    if (!content.trim()) return { error: 'Tin nhắn rỗng' };

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, content: content.trim() })
      .select(`*, sender:users!messages_sender_id_fkey (id, full_name)`)
      .single();
    if (error) return { error: error.message };

    await supabase.from('conversations')
      .update({ last_message: content.trim().substring(0, 100), last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return { message: data };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getUnreadCount(userId) {
  try {
    if (!userId) return 0;
    const { data: convs } = await supabase
      .from('conversations').select('id')
      .or(`student_id.eq.${userId},tutor_id.eq.${userId}`);
    if (!convs || convs.length === 0) return 0;
    const ids = convs.map(c => c.id);
    const { count } = await supabase
      .from('messages').select('id', { count: 'exact', head: true })
      .in('conversation_id', ids).is('read_at', null).neq('sender_id', userId);
    return count || 0;
  } catch (e) {
    return 0;
  }
}

export async function markConversationRead(conversationId, userId) {
  try {
    await supabase.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);
  } catch (e) {}
}
