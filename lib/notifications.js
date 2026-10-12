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

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('Notification modules not available:', e.message);
  }
}

export async function registerForPushNotifications() {
  if (isExpoGo) {
    console.log('Push disabled in Expo Go');
    return null;
  }
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: null,
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    if (!projectId) return null;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Push token:', token);
    return token;
  } catch (e) {
    console.log('Push token error:', e.message);
    return null;
  }
}

export async function savePushToken(userId, token) {
  if (!userId || !token) return;
  try {
    await supabase.from('users').update({ push_token: token }).eq('id', userId);
  } catch (e) {}
}

// Lên lịch nhắc buổi học sắp tới (30 phút trước giờ học) cho HS + gia sư.
// Dùng local notification của expo-notifications → hoạt động kể cả khi app đang nền,
// KHÔNG phụ thuộc FCM/server. Gọi lại mỗi khi app mở / dữ liệu thay đổi.
export async function syncSessionReminders(userId) {
  if (isExpoGo || !Notifications || !userId) return;

  try {
    const { data: sessions } = await supabase
      .from('sessions')
      .select(
        'id, session_number, scheduled_start, status, course:courses (subject, tutor_id, student_id)'
      )
      .or(
        'course.tutor_id.eq.' + userId + ',course.student_id.eq.' + userId
      )
      .eq('status', 'pending')
      .gte('scheduled_start', new Date().toISOString())
      .limit(50);

    if (!sessions || sessions.length === 0) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    // Làm mới toàn bộ lịch nhắc (idempotent).
    await Notifications.cancelAllScheduledNotificationsAsync();

    let count = 0;
    for (const s of sessions) {
      const start = Date.parse(s.scheduled_start);
      if (!Number.isFinite(start)) continue;

      const remindAt = start - 30 * 60 * 1000;
      if (remindAt <= Date.now()) continue;

      const hour = new Date(start).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Buổi học sắp bắt đầu',
          body:
            'Buổi ' + s.session_number +
            ' môn ' + (s.course?.subject || 'học') +
            ' bắt đầu lúc ' + hour + '. Vào phòng học ngay!',
          data: { screen: 'courses' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(remindAt),
        },
      });
      count++;
    }

    console.log('Scheduled session reminders:', count);
  } catch (e) {
    console.log('syncSessionReminders error:', e.message);
  }
}

export async function sendPushNotification({ toUserId, title, body, data = {} }) {
  if (!toUserId) return;
  try {
    const { data: user } = await supabase
      .from('users').select('push_token').eq('id', toUserId).maybeSingle();
    if (!user?.push_token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.push_token,
        sound: null,
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default',
      }),
    });
  } catch (e) {}
}
