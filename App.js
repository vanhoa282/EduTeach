import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import ErrorCatcher from './components/ErrorCatcher';
import { setDeepLinkHandler, enqueueDeepLink, normalizeNotifData, clearDeepLinkQueue } from './lib/deepLink';
import AuthScreen from './screens/AuthScreen';
import ModernSplash from './components/ModernSplash';
import MainTabs from './screens/MainTabs';
import TutorMainTabs from './screens/TutorMainTabs';
import { logout as clearAuthSession } from './lib/auth';

const USER_KEY = '@eduteach_user';
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Notifications = null;
let registerForPushNotifications = null;
let savePushToken = null;
let syncSessionReminders = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    const notif = require('./lib/notifications');
    registerForPushNotifications = notif.registerForPushNotifications;
    savePushToken = notif.savePushToken;
    syncSessionReminders = notif.syncSessionReminders;
  } catch (e) {
    console.log('Notif init fail:', e.message);
  }
}

export default function App() {
  return (
    <ErrorCatcher>
      <SafeAreaProvider>
        <AppInner />
      </SafeAreaProvider>
    </ErrorCatcher>
  );
}

function AppInner() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState(null);
  const [pendingDeepLink, setPendingDeepLink] = useState(null);
  const notifListener = useRef(null);
  const responseListener = useRef(null);

  // App.js chỉ có screen/user — chi tiết course/chat nằm trong MainTabs/TutorMainTabs
  // nên handler lưu pendingDeepLink và đưa về 'main' để Tabs consume.
  useEffect(() => {
    setDeepLinkHandler((data) => {
      if (!data || !data.type) return;
      setPendingDeepLink(data);
      setScreen('main');
    });
    return () => clearDeepLinkQueue();
  }, []);

  // Background -> foreground: nếu có deep-link queued, flush khi active
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        // handler đã set ở trên sẽ tự flush queue
      }
    });
    return () => sub.remove();
  }, []);

  // Killed: cold start do tap notification — getLastNotificationResponseAsync
  useEffect(() => {
    if (isExpoGo || !Notifications) return;
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        const raw = last?.notification?.request?.content?.data;
        if (raw) {
          const data = normalizeNotifData(raw);
          if (data) enqueueDeepLink(data);
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_KEY);
        if (cancelled) return;
        if (stored) {
          try {
            const u = JSON.parse(stored);
            if (u && u.id && u.role) {
              setUser(u);
              setScreen('main');
              return;
            }
          } catch (e) {
            await AsyncStorage.removeItem(USER_KEY);
          }
        }
      } catch (e) {
        console.log('Session error:', e.message);
      }
      if (!cancelled) setTimeout(() => setScreen('auth'), 1200);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id || isExpoGo) return;
    if (!Notifications || !registerForPushNotifications) return;

    let mounted = true;

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (mounted && token && savePushToken) await savePushToken(user.id, token);
        if (mounted && syncSessionReminders) await syncSessionReminders(user.id);
      } catch (e) {
        console.log('Push setup error:', e.message);
      }
    })();

    try {
      notifListener.current = Notifications.addNotificationReceivedListener(() => {});
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = normalizeNotifData(response.notification.request.content.data);
        if (data) enqueueDeepLink(data);
      });
    } catch (e) {}

    return () => {
      mounted = false;
      try {
        if (notifListener.current) notifListener.current.remove();
        if (responseListener.current) responseListener.current.remove();
      } catch (e) {}
    };
  }, [user?.id]);

  const handleLogin = async (u) => {
    setUser(u);
    setScreen('main');
    try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) {}
  };

  const handleLogout = async () => {
    clearDeepLinkQueue();
    setPendingDeepLink(null);
    setUser(null);
    setScreen('auth');
    try {
      await clearAuthSession();
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {}
  };

  if (screen === 'splash') {
    return <ModernSplash />;
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  if (user.role === 'tutor') return <TutorMainTabs user={user} onLogout={handleLogout} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} />;
  return <MainTabs user={user} onLogout={handleLogout} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} />;
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 80 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#2563EB', marginTop: 10 },
  tagline: { fontSize: 14, color: '#666', marginTop: 5 },
});
