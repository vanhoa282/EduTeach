import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('⚠️ Cần device thật');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('⚠️ User từ chối quyền thông báo');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
    });
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.log('⚠️ Chưa có EAS projectId');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('✅ Push token:', token);
    return token;
  } catch (e) {
    console.log('⚠️ Push token error:', e.message);
    return null;
  }
}

export async function savePushToken(userId, token) {
  if (!userId || !token) return;
  await supabase.from('users').update({ push_token: token }).eq('id', userId);
}

export async function sendPushNotification({ toUserId, title, body, data = {} }) {
  if (!toUserId) return;
  const { data: user } = await supabase
    .from('users').select('push_token').eq('id', toUserId).maybeSingle();
  if (!user?.push_token) return;

  const message = {
    to: user.push_token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (e) {
    console.log('Push error:', e.message);
  }
}
