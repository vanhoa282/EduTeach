import Constants from 'expo-constants';
import { supabase } from './supabase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Import push an toàn
let sendPushNotification = null;
if (!isExpoGo) {
  try {
    sendPushNotification = require('./notifications').sendPushNotification;
  } catch (e) {
    console.log('Push not available:', e.message);
  }
}

export async function getOrCreateConversation(studentId, tutorId) {
  const { data: existing, error: gErr } = await supabase
    .from('conversations').select('*')
    .eq('student_id', studentId).eq('tutor_id', tutorId)
    .maybeSingle();

  if (gErr) return { error: gErr.message };
  if (existing) return { conversation: existing };

  const { data, error } = await supabase
    .from('conversations')
    .insert({ student_id: studentId, tutor_id: tutorId })
    .select().single();

  if (error) return { error: error.message };
  return { conversation: data };
}

export async function getMyConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      student:users!conversations_student_id_fkey (id, full_name, phone),
      tutor:users!conversations_tutor_id_fkey (id, full_name, phone)
    `)
    .or(`student_id.eq.${userId},tutor_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error || !data) return [];

  const convsWithUnread = await Promise.all(data.map(async (c) => {
    const { count } = await supabase
      .from('messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', c.id).is('read_at', null).neq('sender_id', userId);
    return { ...c, unread_count: count || 0 };
  }));

  return convsWithUnread;
}

export async function getMessages(conversationId, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, sender:users!messages_sender_id_fkey (id, full_name)`)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true }).limit(limit);

  if (error) return [];
  return data || [];
}

export async function sendMessage({ conversationId, senderId, content }) {
  if (!content.trim()) return { error: 'Tin nhắn rỗng' };

  const { data: conv } = await supabase
    .from('conversations').select('*').eq('id', conversationId).maybeSingle();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    })
    .select(`*, sender:users!messages_sender_id_fkey (id, full_name)`)
    .single();

  if (error) return { error: error.message };

  await supabase
    .from('conversations')
    .update({
      last_message: content.trim().substring(0, 100),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  // Push chỉ hoạt động ở APK (không phải Expo Go)
  if (conv && sendPushNotification) {
    const recipientId = conv.student_id === senderId ? conv.tutor_id : conv.student_id;
    const senderName = data.sender?.full_name || 'Người dùng';
    sendPushNotification({
      toUserId: recipientId,
      title: `💬 ${senderName}`,
      body: content.trim().substring(0, 100),
      data: { conversationId, type: 'message' },
    }).catch(() => {});
  }

  return { message: data };
}

export async function getUnreadCount(userId) {
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
}

export async function markConversationRead(conversationId, userId) {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);
}
