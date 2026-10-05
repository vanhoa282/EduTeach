import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import BottomNav from '../components/BottomNav';
import HomeScreen from './HomeScreen';
import CoursesScreen from './CoursesScreen';
import NotificationsScreen from './NotificationsScreen';
import ProfileScreen from './ProfileScreen';

export default function MainTabs({ phone, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'home' && <HomeScreen phone={phone} />}
        {activeTab === 'courses' && <CoursesScreen />}
        {activeTab === 'notifications' && <NotificationsScreen />}
        {activeTab === 'profile' && <ProfileScreen phone={phone} onLogout={onLogout} />}
      </View>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
