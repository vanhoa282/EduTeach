import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Notifications = null;
let Device = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } catch (e) {
    console.log('Notification modules not available:', e.message);
  }
}

export async function registerForPushNotifications() {
  if (isExpoGo) {
    console.log('⚠️ Push disabled in Expo Go');
    return null;
  }
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) {
    console.log('⚠️ Không phải device thật');
    return null;
  }

  try {
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
  try {
    await supabase.from('users').update({ push_token: token }).eq('id', userId);
  } catch (e) {
    console.log('Save token error:', e.message);
  }
}

export async function sendPushNotification({ toUserId, title, body, data = {} }) {
  if (!toUserId) return;
  try {
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

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (e) {
    console.log('Push send error:', e.message);
  }
}
