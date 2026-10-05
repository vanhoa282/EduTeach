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

// Kiểm tra có phải Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Chỉ load notifications khi là APK
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
    console.log('✅ Notifications ready');
  } catch (e) {
    console.log('⚠️ Notifications init failed:', e.message);
  }
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
  const [bootError, setBootError] = useState(null);
  const notifListener = useRef(null);
  const responseListener = useRef(null);

  // Boot: load session
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
          } catch (parseErr) {
            console.log('Parse session error:', parseErr.message);
            await AsyncStorage.removeItem(USER_KEY);
          }
        }
      } catch (e) {
        console.log('Load session error:', e.message);
      }

      if (!cancelled) {
        setTimeout(() => setScreen('auth'), 1200);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Push setup (chỉ APK)
  useEffect(() => {
    if (!user?.id || isExpoGo) return;
    if (!Notifications || !registerForPushNotifications) return;

    let mounted = true;

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (mounted && token && savePushToken) {
          await savePushToken(user.id, token);
        }
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
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (e) {
      console.log('Save session error:', e.message);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setScreen('auth');
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {}
  };

  // Nếu có boot error → hiện lên để biết
  if (bootError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
        <Text style={styles.errorText}>{bootError}</Text>
        <Text style={styles.errorHint}>Chụp màn hình này gửi admin</Text>
      </View>
    );
  }

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
  errorContainer: {
    flex: 1, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#DC2626', marginBottom: 12 },
  errorText: { fontSize: 13, color: '#7F1D1D', textAlign: 'center', lineHeight: 20 },
  errorHint: { fontSize: 12, color: '#9CA3AF', marginTop: 20 },
});
