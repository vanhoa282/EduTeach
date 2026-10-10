import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { AUTH_SESSION_KEY } from './serverLogin';

export async function verifyServerSession() {
  const token = await AsyncStorage.getItem(AUTH_SESSION_KEY);

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return { status: 'missing', user: null };
  }

  const { data, error } = await supabase.functions.invoke(
    'auth-me',
    {
      headers: {
        'x-eduteach-session': token,
      },
      body: {},
    }
  );

  if (error) {
    const status = error?.context?.status;
    if (status === 401 || status === 403) {
      return { status: 'invalid', user: null };
    }
    return { status: 'unavailable', user: null };
  }

  if (!data?.ok || !data?.user?.id) {
    return { status: 'invalid', user: null };
  }

  return {
    status: 'valid',
    user: data.user,
    expires_at: data.expires_at,
  };
}
