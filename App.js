import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorCatcher from './components/ErrorCatcher';
import AuthScreen from './screens/AuthScreen';
import MainTabs from './screens/MainTabs';
import TutorMainTabs from './screens/TutorMainTabs';

const USER_KEY = '@eduteach_user';

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

  const handleLogin = async (u) => {
    setUser(u);
    setScreen('main');
    try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) {}
  };

  const handleLogout = async () => {
    setUser(null);
    setScreen('auth');
    try { await AsyncStorage.removeItem(USER_KEY); } catch (e) {}
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
