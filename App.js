import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import AuthScreen from './screens/AuthScreen';
import MainTabs from './screens/MainTabs';
import TutorMainTabs from './screens/TutorMainTabs';

const USER_KEY = '@eduteach_user';

// Kiểm tra có phải Expo Go không
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Chỉ import notifications khi KHÔNG phải Expo Go
let Notifications = null;
let registerForPushNotifications = null;
let savePushToken = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    const notif = require('./lib/notifications');
    registerForPushNotifications = notif.registerForPushNotifications;
    savePushToken = notif.savePushToken;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    console.log('✅ Notifications ready (APK/Dev build)');
  } catch (e) {
    console.log('⚠️ Notifications not available:', e.message);
  }
} else {
  console.log('⚠️ Running in Expo Go — push notifications disabled');
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState(null);
  const notifListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_KEY);
        if (stored) {
          const u = JSON.parse(stored);
          setUser(u);
          setScreen('main');
          return;
        }
      } catch (e) {
        console.log('Load session error:', e.message);
      }
      setTimeout(() => setScreen('auth'), 1500);
    })();
  }, []);

  useEffect(() => {
    if (!user?.id || isExpoGo || !Notifications || !registerForPushNotifications) return;

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token && savePushToken) await savePushToken(user.id, token);
      } catch (e) {
        console.log('Push setup error:', e.message);
      }
    })();

    try {
      notifListener.current = Notifications.addNotificationReceivedListener((n) => {
        console.log('📬 Notification:', n.request.content.title);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((r) => {
        console.log('👆 Tapped:', r.notification.request.content.data);
      });
    } catch (e) {
      console.log('Notif listener error:', e.message);
    }

    return () => {
      try {
        if (notifListener.current) notifListener.current.remove();
        if (responseListener.current) responseListener.current.remove();
      } catch (e) {}
    };
  }, [user?.id]);

  const handleLogin = async (u) => {
    setUser(u);
    setScreen('main');
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (e) {}
  };

  const handleLogout = async () => {
    setUser(null);
    setScreen('auth');
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {}
  };

  if (screen === 'splash') {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.logo}>📚</Text>
        <Text style={styles.appName}>EduTeach</Text>
        <Text style={styles.tagline}>Gia sư tin cậy</Text>
        <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (user.role === 'tutor') {
    return <TutorMainTabs user={user} onLogout={handleLogout} />;
  }

  return <MainTabs user={user} onLogout={handleLogout} />;
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 80 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#2563EB', marginTop: 10 },
  tagline: { fontSize: 14, color: '#666', marginTop: 5 },
});
