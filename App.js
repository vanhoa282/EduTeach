import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import ErrorCatcher from './components/ErrorCatcher';
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

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    const notif = require('./lib/notifications');
    registerForPushNotifications = notif.registerForPushNotifications;
    savePushToken = notif.savePushToken;
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
  const notifListener = useRef(null);
  const responseListener = useRef(null);

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
      } catch (e) {
        console.log('Push setup error:', e.message);
      }
    })();

    try {
      notifListener.current = Notifications.addNotificationReceivedListener(() => {});
      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});
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
  if (user.role === 'tutor') return <TutorMainTabs user={user} onLogout={handleLogout} />;
  return <MainTabs user={user} onLogout={handleLogout} />;
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 80 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#2563EB', marginTop: 10 },
  tagline: { fontSize: 14, color: '#666', marginTop: 5 },
});
