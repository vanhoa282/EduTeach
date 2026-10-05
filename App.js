import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import AuthScreen from './screens/AuthScreen';
import MainTabs from './screens/MainTabs';
import TutorMainTabs from './screens/TutorMainTabs';
import { registerForPushNotifications, savePushToken } from './lib/notifications';

const USER_KEY = '@eduteach_user';

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

  // Auto login: load user từ storage khi mở app
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
      // Nếu không có session → splash 2s → auth
      setTimeout(() => setScreen('auth'), 2000);
    })();
  }, []);

  // Setup push khi có user
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const token = await registerForPushNotifications();
      if (token) await savePushToken(user.id, token);
    })();

    notifListener.current = Notifications.addNotificationReceivedListener((n) => {
      console.log('📬 Foreground notification:', n.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((r) => {
      console.log('👆 Tapped:', r.notification.request.content.data);
    });

    return () => {
      if (notifListener.current) notifListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
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
