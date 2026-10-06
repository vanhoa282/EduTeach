import { supabase } from '../supabase';
import { saveLocalMessages } from './storage';

export async function askAI({ userId, messages, context }) {
  try {
    const { data, error } = await supabase.functions.invoke('chat-ai', {
      body: { userId, messages, context },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return {
      reply: data.reply,
      model: data.model,
      isPro: data.isPro,
    };
  } catch (e) {
    return { error: e.message };
  }
}

export async function sendMessage({ userId, messages, context }) {
  const res = await askAI({ userId, messages, context });
  if (res.error) return res;

  const newMessages = [
    ...messages,
    { role: 'assistant', content: res.reply, createdAt: new Date().toISOString() },
  ];
  await saveLocalMessages(userId, newMessages);
  return { ...res, messages: newMessages };
}
