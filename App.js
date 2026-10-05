import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from './screens/AuthScreen';
import MainTabs from './screens/MainTabs';
import TutorMainTabs from './screens/TutorMainTabs';

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

  useEffect(() => {
    if (screen === 'splash') {
      const t = setTimeout(() => setScreen('auth'), 2000);
      return () => clearTimeout(t);
    }
  }, [screen]);

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
    return (
      <AuthScreen
        onLogin={(u) => {
          setUser(u);
          setScreen('main');
        }}
      />
    );
  }

  if (user.role === 'tutor') {
    return <TutorMainTabs user={user} onLogout={() => { setUser(null); setScreen('auth'); }} />;
  }

  return <MainTabs user={user} onLogout={() => { setUser(null); setScreen('auth'); }} />;
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 80 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#2563EB', marginTop: 10 },
  tagline: { fontSize: 14, color: '#666', marginTop: 5 },
});
