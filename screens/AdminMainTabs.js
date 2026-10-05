import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import AdminBottomNav from '../components/AdminBottomNav';
import DashboardScreen from './admin/DashboardScreen';
import UsersScreen from './admin/UsersScreen';
import CoursesScreen from './admin/CoursesScreen';
import AdminProfileScreen from './admin/AdminProfileScreen';

export default function AdminMainTabs({ user, onLogout, onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'dashboard' && <DashboardScreen user={user} onBack={onBack} />}
        {activeTab === 'users' && <UsersScreen />}
        {activeTab === 'courses' && <CoursesScreen />}
        {activeTab === 'profile' && <AdminProfileScreen user={user} onLogout={onLogout} />}
      </View>
      <AdminBottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
