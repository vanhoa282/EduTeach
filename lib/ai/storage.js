import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const LOCAL_KEY = '@eduteach_ai_chat_';

export async function getLocalMessages(userId) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY + userId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function saveLocalMessages(userId, messages) {
  try {
    await AsyncStorage.setItem(LOCAL_KEY + userId, JSON.stringify(messages.slice(-100)));
  } catch (e) {}
}

export async function clearLocalMessages(userId) {
  try {
    await AsyncStorage.removeItem(LOCAL_KEY + userId);
  } catch (e) {}
}

export async function fetchCloudMessages(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.reverse().map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));
  } catch (e) {
    return [];
  }
}

export async function deleteCloudMessages(userId) {
  try {
    await supabase.from('ai_chats').delete().eq('user_id', userId);
  } catch (e) {}
}
